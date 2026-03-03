const functions = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ─── INIT ────────────────────────────────────────────────────────────────────
setGlobalOptions({ timeoutSeconds: 540, memory: '512MiB' });
admin.initializeApp();
const db = admin.firestore();
const COLLECTION = 'scan_entries';

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Keys desde .env en la carpeta functions/ (auto-cargado por Firebase)
const APIFY_KEY = process.env.APIFY_API_KEY || '';
const GEMINI_KEY = process.env.GEMINI_API_KEY || '';

// ─── APIFY CONNECTOR ─────────────────────────────────────────────────────────
async function launchScraper(actorId, input) {
    console.log(`[Apify] Iniciando scraper ${actorId}...`);
    const response = await axios.post(
        `https://api.apify.com/v2/acts/${actorId}/runs?token=${APIFY_KEY}`,
        input
    );
    return response.data.data;
}

async function getResults(datasetId) {
    const response = await axios.get(
        `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_KEY}`
    );
    return response.data;
}

// ─── GEMINI PROCESSOR ────────────────────────────────────────────────────────
async function analyzeSentimentAndTrends(comments) {
    if (!GEMINI_KEY || !comments || comments.length === 0) {
        return {
            sentiment: { positive: 0, neutral: 100, negative: 0 },
            topTopics: ['Sin datos'],
            summary: 'No hay comentarios suficientes o falta API Key.'
        };
    }

    const genAI = new GoogleGenerativeAI(GEMINI_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `
Analiza los siguientes comentarios de redes sociales sobre una marca de comida rápida:
${comments.join('\n---\n')}

Devuelve un objeto JSON con esta estructura exacta:
{
  "sentiment": { "positive": porcentaje, "neutral": porcentaje, "negative": porcentaje },
  "topTopics": ["tema1", "tema2", "tema3"],
  "summary": "Resumen ejecutivo de 2 oraciones sobre lo que dice la gente"
}
IMPORTANTE: Solo responde con el JSON puro.
`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const cleanText = text.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanText);
    } catch (e) {
        console.error('[Gemini] Error:', e.message);
        return {
            sentiment: { positive: 33, neutral: 34, negative: 33 },
            topTopics: ['Error en análisis'],
            summary: 'Hubo un problema procesando los comentarios con la IA.'
        };
    }
}

// ─── FIRESTORE HELPERS ───────────────────────────────────────────────────────
async function getAllEntries() {
    const snapshot = await db.collection(COLLECTION).orderBy('timestamp', 'asc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function addEntry(entry) {
    const ref = await db.collection(COLLECTION).add(entry);
    console.log(`[Firestore] Entrada guardada: ${ref.id} (${entry.brand})`);
    return ref.id;
}

async function clearAllEntries() {
    const snapshot = await db.collection(COLLECTION).get();
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    console.log(`[Firestore] ${snapshot.size} entradas eliminadas.`);
}

// ─── HELPERS DE LÓGICA ───────────────────────────────────────────────────────
function getBrandsStatus(scanStore) {
    const status = {};
    for (const entry of scanStore) {
        if (!status[entry.brand]) {
            status[entry.brand] = { count: 0, lastUpdated: null };
        }
        status[entry.brand].count += 1;
        const t = new Date(entry.timestamp);
        if (!status[entry.brand].lastUpdated || t > new Date(status[entry.brand].lastUpdated)) {
            status[entry.brand].lastUpdated = entry.timestamp;
        }
    }
    return status;
}

function buildReport(scanStore) {
    const byBrand = {};
    for (const e of scanStore) {
        if (!byBrand[e.brand]) byBrand[e.brand] = [];
        byBrand[e.brand].push(e);
    }
    const brandPerf = Object.entries(byBrand).map(([brand, entries]) => {
        const avgPos = Math.round(entries.reduce((a, b) => a + (b.sentiment?.positive || 0), 0) / entries.length);
        return {
            brand,
            status: avgPos >= 80 ? 'Growing' : avgPos >= 60 ? 'Stable' : 'At Risk',
            keyFinding: `Sentimiento positivo promedio: ${avgPos}% (${entries.length} scans).`
        };
    });
    return {
        executiveBrief: `Performance sólida en plataformas digitales. Engagement digital correlaciona positivamente con el flujo en locales físicos.`,
        brandPerformance: brandPerf.length > 0 ? brandPerf : [
            { brand: 'Bembos', status: 'Growing', keyFinding: 'Sin datos aún — ejecutá Cold Start.' }
        ],
        topStrategicRisk: 'Posible saturación de promociones en canal digital.',
        nextSteps: ['Optimizar pauta en TikTok', 'Reforzar stock de salsas en zona sur']
    };
}

// ─── MARCAS CONFIGURADAS ─────────────────────────────────────────────────────
const BRANDS = [
    { brand: 'Bembos', platform: 'tiktok', handle: 'bembos.oficial' },
    { brand: 'Papa Johns', platform: 'tiktok', handle: 'papajohnsperu' },
    { brand: 'McDonalds', platform: 'tiktok', handle: 'mcdonaldsperu' },
    { brand: 'Burger King', platform: 'tiktok', handle: 'burgerking_peru' },
    { brand: 'KFC', platform: 'tiktok', handle: 'kfcperu' },
    { brand: 'Popeyes', platform: 'tiktok', handle: 'popeyesperuoficial' },
    { brand: 'China Wok', platform: 'tiktok', handle: 'chinawokperu' },
    { brand: 'Dunkin Donuts', platform: 'instagram', handle: 'dunkindonutsperu' },
];

// ─── ROUTES: SCOUT BOT ───────────────────────────────────────────────────────

app.post('/api/scout', async (req, res) => {
    const { url, platform } = req.body;
    try {
        let actorId = 'clockworks~tiktok-comments-scraper';
        let input = { commentsByPostUrls: [{ url }], maxCommentsPerPost: 20 };

        if (platform === 'instagram') {
            actorId = 'jaroslavsemanko~instagram-comment-scraper';
            input = { directUrls: [url], resultsLimit: 20 };
        }

        const run = await launchScraper(actorId, input);
        res.json({ status: 'processing', runId: run.id, datasetId: run.defaultDatasetId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/insights/:datasetId', async (req, res) => {
    try {
        const comments = await getResults(req.params.datasetId);
        const texts = comments.map(c => c.text || c.commentText || c.comment || '').filter(Boolean);

        let insights = { sentiment: { positive: 50, neutral: 45, negative: 5 }, topTopics: [], summary: 'Sin análisis aún.' };
        if (texts.length > 0) {
            insights = await analyzeSentimentAndTrends(texts);
        }

        res.json({ comments: comments.length, comments_raw: comments, ...insights });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/cuantico/summary', (req, res) => {
    res.json([
        { brand: 'Bembos', sentiment: 'Favorable', alert: 'Tendencia positiva en salsa parrillera', date: 'Hoy' },
        { brand: 'Popeyes', sentiment: 'Neutral', alert: 'Quejas por demora en delivery', date: 'Ayer' },
        { brand: 'China Wok', sentiment: 'Muy Favorable', alert: 'Nueva promo viral en TikTok', date: 'Hoy' }
    ]);
});

// ─── ROUTES: DATOS ───────────────────────────────────────────────────────────

app.get('/api/history', async (req, res) => {
    try {
        const allEntries = await getAllEntries();
        const history = allEntries.slice(-20).reverse().map(e => ({
            brand: e.brand,
            platform: e.platform,
            timestamp: e.timestamp,
            sentiment: e.sentiment,
            commentsCount: e.commentsCount,
            topTopics: e.topTopics,
            summary: e.summary
        }));
        res.json(history);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/historical', async (req, res) => {
    try {
        const { brand, platform } = req.query;
        let results = await getAllEntries();
        if (brand) results = results.filter(e => e.brand === brand);
        if (platform) results = results.filter(e => e.platform === platform);
        res.json(results);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/alerts', async (req, res) => {
    try {
        const allEntries = await getAllEntries();
        const alerts = allEntries
            .filter(e => e.sentiment?.negative > 15)
            .map(e => ({
                brand: e.brand,
                platform: e.platform,
                message: `Sentimiento negativo elevado: ${e.sentiment.negative}%`,
                timestamp: e.timestamp
            }));
        res.json(alerts);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/admin/brands-status', async (req, res) => {
    try {
        const allEntries = await getAllEntries();
        res.json(getBrandsStatus(allEntries));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/reports', async (req, res) => {
    try {
        const allEntries = await getAllEntries();
        res.json(buildReport(allEntries));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── ROUTES: ADMIN ───────────────────────────────────────────────────────────

// Cold Start — poblar 7 días con datos realistas para Bembos
app.post('/api/admin/seed-history', async (req, res) => {
    console.log('[Server] Cold Start: Poblando 7 días de historial para Bembos TikTok...');

    const bembosComments = [
        [
            { author: 'carla_foodie', text: 'La Hamburguesa Carretillera es de otro nivel, la salsa parrillera me voló la cabeza 🔥', followers: 4200 },
            { author: 'rodrigo_eater', text: 'Fui a Bembos Miraflores y la atención fue excelente, volvería mañana mismo', followers: 810 },
            { author: 'miguelito_qr', text: 'El combo triple viene bien servido, nada que ver con la competencia', followers: 290 },
            { author: 'sofiperu22', text: 'Gracias Bembos por el descuento de cumpleaños! Muy detallistas', followers: 1350 },
            { author: 'juan_hambre', text: 'Colas largas en la sucursal de San Isidro pero el resultado vale la espera', followers: 540 },
        ],
        [
            { author: 'paty_eats', text: 'Las papas Bembos son las mejores que he probado, ni McDonalds las supera', followers: 7800 },
            { author: 'elmago_chef', text: 'Nueva campaña de TikTok de Bembos es fuego, ya me antojé', followers: 3100 },
            { author: 'kevin_delivery', text: 'Pedí por app y llegó en 25 min, perfecto para el almuerzo', followers: 220 },
            { author: 'valeria_lc', text: 'El sabor de la carne es consistente, siempre igual de bueno', followers: 900 },
            { author: 'mrfoodie_pe', text: 'Bembos sigue siendo el rey de las hamburguesas en Lima', followers: 15600 },
        ],
        [
            { author: 'tomas_grill', text: 'Probé el Bembos Gold por primera vez y no me decepcionó', followers: 430 },
            { author: 'andrea_taste', text: 'Me sorprendió lo fresca que estaba la lechuga, se nota la calidad', followers: 1890 },
            { author: 'franco_comenta', text: 'El precio subió un poco pero la porción también mejoró', followers: 670 },
            { author: 'luisa_review', text: 'Atención al cliente de primera, me cambiaron una orden sin problema', followers: 310 },
            { author: 'pepito_viral', text: '¡el spot nuevo en tiktok! literalmente me hizo pedir un Bembos a las 11pm', followers: 22000 },
        ],
        [
            { author: 'carlos_nomad', text: 'Me gusta que tienen WiFi, puedo trabajar desde el local', followers: 550 },
            { author: 'gabi_foodlover', text: 'La salsa BBQ de Bembos es adictiva, pido siempre doble', followers: 1200 },
            { author: 'rich_taste', text: 'Ambiente limpio y cómodo, perfecto para ir en familia', followers: 870 },
            { author: 'yumi_peru', text: 'Combiné el combo con su limonada frozen y fue un acierto total', followers: 4500 },
            { author: 'alex_hamb', text: 'Se demoran un poco en hora punta pero el producto siempre sale bien', followers: 380 },
        ],
        [
            { author: 'paola_ig', text: 'Me pidió mi novio Bembos para ver la final y no me arrepiento', followers: 2100 },
            { author: 'jhonn_crispy', text: 'Las alas de pollo Bembos son lo mejor que han lanzado últimamente', followers: 990 },
            { author: 'camila_tiktok', text: 'Ese video del chef haciendo la Carretillera en el local me convenció al toque', followers: 31000 },
            { author: 'diego_eats', text: 'La app de Bembos mejoró bastante, ahora el tracking de delivery es exacto', followers: 620 },
            { author: 'tony_grill', text: 'Primera vez que como Bembos y ya soy fan, ¿dónde estaba toda mi vida?', followers: 175 },
        ],
        [
            { author: 'fernanda_bites', text: 'El jueves a media tarde estaba casi vacío y el servicio fue rapidísimo', followers: 1440 },
            { author: 'omar_foodie', text: 'La carne al punto exacto, ni muy cocida ni cruda. Top', followers: 720 },
            { author: 'silvia_chef', text: 'Bembos demuestra que la calidad local puede competir con cualquier internacional', followers: 5200 },
            { author: 'pepe_critico', text: 'La mesa estaba un poco sucia cuando llegué, pero después todo bien', followers: 280 },
            { author: 'martin_gamer', text: 'Community manager de Bembos en TikTok está haciendo un trabajo excelente', followers: 8700 },
        ],
        [
            { author: 'nat_comenta', text: 'El Bembos Clásico nunca falla, es mi combo de siempre desde hace 10 años', followers: 930 },
            { author: 'ric_delivery', text: 'Empaque sostenible de cartón me parece un gran detalle de la marca', followers: 460 },
            { author: 'ana_viral', text: 'Vi el trend de Bembos en TikTok y tuve que ir ese mismo día jaja', followers: 17800 },
            { author: 'leo_review', text: 'Precio justo para la calidad que ofrecen, sin dudas el mejor fast food peruano', followers: 1100 },
            { author: 'pablo_late', text: 'A las 11pm todavía atienden perfecto, ideal para los noctámbulos', followers: 560 },
        ]
    ];

    const topicsPool = [
        ['Hamburguesa Carretillera', 'Atención al cliente', 'Precio', 'Sabor'],
        ['TikTok Viral', 'Delivery', 'Papas fritas', 'Combo'],
        ['Calidad', 'Ambiente', 'App Bembos', 'Salsas'],
        ['Campaña Digital', 'Personal', 'Empaque', 'Experiencia']
    ];

    try {
        const newEntries = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(12, 30, 0, 0);

            const comments = bembosComments[i % bembosComments.length];
            const topics = topicsPool[i % topicsPool.length];
            const positivePct = 82 + Math.floor(Math.random() * 8);
            const negativePct = 3 + Math.floor(Math.random() * 6);
            const neutralPct = 100 - positivePct - negativePct;

            const entry = {
                brand: 'Bembos',
                platform: 'tiktok',
                timestamp: date.toISOString(),
                sentiment: { positive: positivePct, neutral: neutralPct, negative: negativePct },
                commentsCount: comments.length,
                topTopics: topics,
                summary: `Comentarios del día reflejan alta satisfacción con la Carretillera y presencia viral en TikTok. Sentimiento positivo: ${positivePct}%.`,
                raw_comments: comments,
                source: 'seed'
            };

            await addEntry(entry);
            newEntries.push(entry);
        }

        console.log(`[Server] Cold Start completado. ${newEntries.length} entradas insertadas en Firestore.`);
        res.json({ success: true, inserted: newEntries.length });
    } catch (e) {
        console.error('[Seed] Error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// Scout All — lanza Apify para todas las marcas y guarda en Firestore
app.post('/api/admin/scout-all', async (req, res) => {
    res.json({ status: 'started', message: 'Escaneo iniciado para todas las marcas en 2do plano.' });

    for (const b of BRANDS) {
        try {
            let actorId, input;
            if (b.platform === 'instagram') {
                actorId = 'apify~instagram-comment-scraper';
                input = {
                    directUrls: [`https://www.instagram.com/${b.handle}/`],
                    resultsLimit: 20
                };
            } else {
                actorId = 'clockworks~tiktok-comments-scraper';
                input = {
                    profiles: [b.handle],
                    maxItems: 20,
                    shouldDownloadVideos: false,
                    shouldDownloadCovers: false
                };
            }

            console.log(`[Scout-All] Lanzando scraper para ${b.brand} (${b.platform})...`);
            const run = await launchScraper(actorId, input);
            const datasetId = run.defaultDatasetId;
            console.log(`[Scout-All] ${b.brand} run: ${run.id} | dataset: ${datasetId}`);

            // Esperar 40s para que Apify procese
            await new Promise(r => setTimeout(r, 40000));

            let comments = [];
            try {
                comments = await getResults(datasetId);
            } catch (fetchErr) {
                console.warn(`[Scout-All] No se pudo obtener resultados de ${b.brand}:`, fetchErr.message);
            }

            if (comments.length === 0) {
                console.log(`[Scout-All] ${b.brand}: 0 comentarios — omitiendo.`);
                continue;
            }

            const texts = comments.map(c => c.text || c.commentText || c.comment || '').filter(Boolean);

            let insights = { sentiment: { positive: 50, neutral: 45, negative: 5 }, topTopics: [], summary: 'Sin análisis.' };
            try {
                insights = await analyzeSentimentAndTrends(texts);
            } catch (geminiErr) {
                console.warn(`[Scout-All] Gemini falló para ${b.brand}:`, geminiErr.message);
            }

            const entry = {
                brand: b.brand,
                platform: b.platform,
                timestamp: new Date().toISOString(),
                sentiment: insights.sentiment || { positive: 50, neutral: 45, negative: 5 },
                commentsCount: comments.length,
                topTopics: insights.topTopics || [],
                summary: insights.summary || '',
                raw_comments: comments.slice(0, 20),
                source: 'apify',
                runId: run.id,
                datasetId
            };

            await addEntry(entry);
            console.log(`[Scout-All] ✅ ${b.brand}: ${comments.length} comentarios guardados en Firestore. Sentimiento positivo: ${entry.sentiment.positive}%`);

        } catch (e) {
            console.error(`[Scout-All] ❌ Error en ${b.brand}:`, e.message);
        }
    }

    console.log('[Scout-All] ✅ Escaneo masivo completado.');
});

// Clear history
app.delete('/api/admin/clear-history', async (req, res) => {
    try {
        await clearAllEntries();
        res.json({ success: true, message: 'Historial eliminado de Firestore.' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── EXPORT ──────────────────────────────────────────────────────────────────
exports.apiServer = functions.onRequest(app);

