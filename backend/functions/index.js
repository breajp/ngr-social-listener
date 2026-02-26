const { onRequest } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const InsightProcessor = require('./processor');

require('dotenv').config();
admin.initializeApp();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
    console.log(`[Request] ${req.method} ${req.path}`);
    next();
});

const APIFY_KEY = process.env.APIFY_API_KEY || "";
const GEMINI_KEY = process.env.GEMINI_API_KEY || "";

console.log("[Backend] Gemini Key length:", GEMINI_KEY.length);

const processor = new InsightProcessor();

// Helper for dual routes (with and without /api prefix)
const registerRoute = (method, path, handler) => {
    app[method](path, handler);
    if (path.startsWith('/api')) {
        app[method](path.replace('/api', ''), handler);
    }
};

registerRoute('post', '/api/scout', async (req, res) => {
    const { url, platform } = req.body;

    // MODO MOCK para no gastar créditos de Apify
    if (url.includes('test-mode') || url.includes('mock-data')) {
        const datasetId = `mock-${Date.now()}`;
        return res.json({ status: 'processing', datasetId, isMock: true });
    }

    try {
        let actorId = "";
        let input = {};

        if (platform === 'tiktok') {
            actorId = "clockworks~tiktok-comments-scraper";
            input = { "postURLs": [url], "commentsPerPost": 20, "maxRepliesPerComment": 0 };
        } else if (platform === 'instagram') {
            actorId = "jaroslavsemanko~instagram-comment-scraper";
            input = { "directUrls": [url], "resultsLimit": 20 };
        } else if (platform === 'google-maps') {
            actorId = "compass~google-maps-reviews-scraper";
            input = { "queries": [url], "maxReviews": 20 };
        } else if (platform === 'facebook') {
            actorId = "apify~facebook-comments-scraper";
            input = { "postUrls": [url], "maxComments": 20 };
        }

        const response = await axios.post(`https://api.apify.com/v2/acts/${actorId}/runs?token=${APIFY_KEY}`, input);
        const datasetId = response.data.data.defaultDatasetId;

        res.json({ status: 'processing', datasetId });
    } catch (error) {
        console.error("[Scout Error]", error);
        res.status(500).json({ error: error.message });
    }
});

registerRoute('get', '/api/insights/:datasetId', async (req, res) => {
    const { datasetId } = req.params;

    try {
        let comments = [];
        let isMock = datasetId.startsWith('mock-');

        if (isMock) {
            comments = [
                { text: "Me encanta la nueva hamburguesa de Bembos!", author: "@comidista" },
                { text: "La promo de Papa Johns demoró una hora, mal ahí.", author: "@hambriento1" },
                { text: "El personal de NGR siempre es muy amable.", author: "@fan_fb" },
                { text: "Rico pero un poco caro", author: "@lima_user" },
                { text: "Excelente atención en Popeyes", author: "@fastfood_fan" }
            ];
        } else {
            const response = await axios.get(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_KEY}`);
            comments = response.data.map(item => ({
                text: item.text || item.textDescription || item.reviewText || "",
                author: item.uniqueId || item.ownerUsername || item.name || "Usuario"
            })).filter(c => c.text);
        }

        const insights = await processor.analyzeSentimentAndTrends(comments.map(c => c.text));

        // Guardar en Firestore para el historial
        const scanData = {
            id: datasetId,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            platform: isMock ? 'mock' : 'social',
            commentsCount: comments.length,
            ...insights
        };

        await admin.firestore().collection('scans').doc(datasetId).set(scanData);

        res.json({
            comments: comments.length,
            comments_raw: comments,
            ...insights,
            isMock
        });
    } catch (error) {
        console.error("[Insights Error]", error);
        res.status(500).json({ error: error.message });
    }
});

registerRoute('get', '/api/history', async (req, res) => {
    try {
        const snapshot = await admin.firestore().collection('scans')
            .orderBy('timestamp', 'desc')
            .limit(10)
            .get();

        const history = [];
        snapshot.forEach(doc => history.push(doc.data()));
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Admin route to trigger full scouting manually
registerRoute('post', '/api/admin/scout-all', async (req, res) => {
    try {
        console.log("[Admin] Manual multi-brand scout triggered.");
        const targets = [
            { brand: 'Bembos', platform: 'tiktok', url: 'https://www.tiktok.com/@bembos_peru', type: 'owned' },
            { brand: 'Bembos', platform: 'instagram', url: 'https://www.instagram.com/bembos_peru/', type: 'owned' },
            { brand: 'Papa Johns', platform: 'tiktok', url: 'https://www.tiktok.com/@papajohns_peru', type: 'owned' },
            { brand: 'Papa Johns', platform: 'instagram', url: 'https://www.instagram.com/papajohns_peru/', type: 'owned' },
            { brand: 'Dunkin', platform: 'instagram', url: 'https://www.instagram.com/dunkin_peru/', type: 'owned' },
            { brand: 'Popeyes', platform: 'tiktok', url: 'https://www.tiktok.com/@popeyesperu', type: 'owned' },
            { brand: 'China Wok', platform: 'tiktok', url: 'https://www.tiktok.com/@chinawokperu', type: 'owned' },
            { brand: 'McDonalds', platform: 'tiktok', url: 'https://www.tiktok.com/@mcdonalds_peru', type: 'competitor' },
            { brand: 'Burger King', platform: 'tiktok', url: 'https://www.tiktok.com/@burgerking_peru', type: 'competitor' },
            { brand: 'KFC', platform: 'tiktok', url: 'https://www.tiktok.com/@kfcperu', type: 'competitor' },
            { brand: 'Pizza Hut', platform: 'instagram', url: 'https://www.instagram.com/pizzahutperu/', type: 'competitor' },
            { brand: 'Starbucks', platform: 'instagram', url: 'https://www.instagram.com/starbuckspecu/', type: 'competitor' }
        ];

        // Trigger in background to avoid HTTP timeout
        const db = admin.firestore();
        const processor = new InsightProcessor();
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        performScouting(targets, db, processor, yesterday).catch(err => {
            console.error("[scout-all async error]", err);
        });

        res.json({ status: "initiated", message: `Iniciando escaneo de ${targets.length} perfiles en segundo plano.`, targets: targets.map(t => `${t.brand} (${t.platform})`) });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Cold Start: Seed 7 days of historical data
registerRoute('post', '/api/admin/seed-history', async (req, res) => {
    try {
        console.log("[Admin] Seeding 7-day history for all brands...");
        const brands = [
            'Bembos', 'Papa Johns', 'Popeyes', 'China Wok', 'Dunkin',
            'McDonalds', 'Burger King', 'KFC', 'Pizza Hut', 'Starbucks'
        ];

        const now = Date.now();
        const dayMs = 24 * 60 * 60 * 1000;
        const db = admin.firestore();

        for (let i = 0; i < 7; i++) {
            const targetDate = new Date(now - i * dayMs);
            const dateStr = targetDate.toISOString().split('T')[0];

            for (const brand of brands) {
                const isOwned = ['Bembos', 'Papa Johns', 'Popeyes', 'China Wok', 'Dunkin'].includes(brand);
                const basePos = isOwned ? 65 : 55;
                const variance = Math.random() * 15;

                const sentiment = {
                    positive: Math.round(basePos + variance),
                    neutral: Math.round(20 + Math.random() * 10),
                    negative: 0
                };
                sentiment.negative = 100 - sentiment.positive - sentiment.neutral;

                const summary = {
                    brand,
                    date: dateStr,
                    sentiment,
                    volume: Math.round(150 + Math.random() * 200),
                    top_themes: isOwned ? ['Calidad', 'Servicio', 'Promociones'] : ['Competencia', 'Precios', 'Nuevos Productos'],
                    brief: `Análisis histórico generado para ${brand}. Fecha: ${dateStr}.`,
                    alerts: sentiment.negative > 20 ? [`Alerta de sentimiento en ${brand}`] : []
                };

                await db.collection('scans').add({
                    brand,
                    platform: 'aggregate',
                    summary,
                    timestamp: admin.firestore.Timestamp.fromDate(targetDate),
                    isHistoricalSeed: true
                });
            }
        }
        res.json({ success: true, message: "Historial de 7 días generado correctamente." });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Admin Route to get the status of all brands (last updated, data volume)
registerRoute('get', '/api/admin/brands-status', async (req, res) => {
    try {
        const db = admin.firestore();
        const scansRef = db.collection('scans');
        const snapshot = await scansRef.get();

        const statusMap = {};

        snapshot.forEach(doc => {
            const data = doc.data();
            const brand = data.brand;
            const ts = data.timestamp ? data.timestamp.toDate() : null;

            if (!brand) return;

            if (!statusMap[brand]) {
                statusMap[brand] = { count: 0, lastUpdated: ts };
            }

            statusMap[brand].count += 1;

            if (ts && (!statusMap[brand].lastUpdated || ts > statusMap[brand].lastUpdated)) {
                statusMap[brand].lastUpdated = ts;
            }
        });

        res.json(statusMap);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Mock de data de Cuántico (Insights de marcas propias)
registerRoute('get', '/api/cuantico/summary', (req, res) => {
    res.json([
        { brand: 'Bembos', sentiment: 'Favorable', text: 'Tendencia positiva en salsa parrillera', date: 'Hoy', pos: 85, neu: 10, neg: 5 },
        { brand: 'Popeyes', sentiment: 'Neutral', text: 'Algunas quejas por demora en delivery', date: 'Ayer', pos: 30, neu: 40, neg: 30 },
        { brand: 'China Wok', sentiment: 'Muy Favorable', text: 'Nueva promo viral en TikTok impulsando ventas', date: 'Hoy', pos: 92, neu: 5, neg: 3 }
    ]);
});

// Admin Route to seed 7 days of Bembos Data
registerRoute('get', '/api/admin/seed-bembos', async (req, res) => {
    try {
        console.log("[Admin] Iniciando seeding de Bembos...");
        const db = admin.firestore();
        const batch = db.batch();
        const now = new Date();
        const brand = "Bembos";

        for (let i = 0; i < 7; i++) {
            const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
            const scanId = `seed-bembos-${i}-${Date.now()}`;

            const sentiment = {
                positive: 70 + Math.floor(Math.random() * 25),
                negative: Math.floor(Math.random() * 15),
                neutral: 5 + Math.floor(Math.random() * 10)
            };

            const data = {
                brand: brand,
                platform: i % 2 === 0 ? 'tiktok' : 'instagram',
                timestamp: admin.firestore.Timestamp.fromDate(date),
                sentiment: sentiment,
                summary: `Resumen estratégico del día ${i === 0 ? 'hoy' : i + ' días atrás'}. El volumen de menciones se mantiene estable.`,
                commentsCount: 25 + Math.floor(Math.random() * 60),
                topTopics: ["Sabor unico", "Pueblo Libre", "Salsas"],
                raw_comments: [
                    { author: 'lucho_burger', text: 'La carretillera nunca falla', followers: 850 },
                    { author: 'lima_eats', text: 'Bembos es bife', followers: 25000 }
                ]
            };

            const scanRef = db.collection('scans').doc(scanId);
            batch.set(scanRef, data);
        }

        await batch.commit();
        res.json({ status: "success", message: "Historial generado para Bembos." });
    } catch (e) {
        console.error("[Admin Seed Error]", e);
        res.status(500).json({ error: e.message, stack: e.stack });
    }
});

// Final handler for 404s
app.use((req, res) => {
    console.warn(`[404] No route found for ${req.method} ${req.path}`);
    res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.path}` });
});

exports.apiServer = onRequest({
    region: 'us-central1',
    cors: true,
    maxInstances: 10
}, app);

// Tareas Programadas - Daily Automation
exports.dailyScouting = onSchedule({
    schedule: 'every day 01:00', // 1 AM Lima Time
    timeZone: 'America/Lima',
    memory: '1GiB',
    timeoutSeconds: 540 // Max timeout for multiple brands
}, async (event) => {
    console.log("[DailyScout] Iniciando escaneo estratégico de NGR Portfolio...");

    const db = admin.firestore();
    const processor = new InsightProcessor();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const targets = [
        // Owned Brands
        { brand: 'Bembos', platform: 'tiktok', url: 'https://www.tiktok.com/@bembos_peru', type: 'owned' },
        { brand: 'Bembos', platform: 'instagram', url: 'https://www.instagram.com/bembos_peru/', type: 'owned' },
        { brand: 'Papa Johns', platform: 'tiktok', url: 'https://www.tiktok.com/@papajohns_peru', type: 'owned' },
        { brand: 'Papa Johns', platform: 'instagram', url: 'https://www.instagram.com/papajohns_peru/', type: 'owned' },
        { brand: 'Dunkin', platform: 'instagram', url: 'https://www.instagram.com/dunkin_peru/', type: 'owned' },
        { brand: 'Popeyes', platform: 'tiktok', url: 'https://www.tiktok.com/@popeyesperu', type: 'owned' },
        { brand: 'China Wok', platform: 'tiktok', url: 'https://www.tiktok.com/@chinawokperu', type: 'owned' },

        // Competitors
        { brand: 'McDonalds', platform: 'tiktok', url: 'https://www.tiktok.com/@mcdonalds_peru', type: 'competitor' },
        { brand: 'Burger King', platform: 'tiktok', url: 'https://www.tiktok.com/@burgerking_peru', type: 'competitor' },
        { brand: 'KFC', platform: 'tiktok', url: 'https://www.tiktok.com/@kfcperu', type: 'competitor' },
        { brand: 'Pizza Hut', platform: 'instagram', url: 'https://www.instagram.com/pizzahutperu/', type: 'competitor' },
        { brand: 'Starbucks', platform: 'instagram', url: 'https://www.instagram.com/starbuckspecu/', type: 'competitor' }
    ];

    await performScouting(targets, db, processor, yesterday);

    // 4. Update Weekly Report
    const scans = await db.collection('scans').where('timestamp', '>', admin.firestore.Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))).get();
    const summaries = scans.docs.map(doc => doc.data().summary);
    const weeklyBrief = await processor.generateWeeklyExecutiveBriefing(summaries);
    if (weeklyBrief) {
        await db.collection('reports').add({ ...weeklyBrief, timestamp: admin.firestore.FieldValue.serverTimestamp() });
    }
});

async function performScouting(targets, db, processor, yesterday) {
    for (const target of targets) {
        try {
            console.log(`[Scouting] Target: ${target.brand} @ ${target.platform}`);

            // 1. Trigger Scraper
            let actorId = target.platform === 'tiktok'
                ? "clockworks~tiktok-comments-scraper"
                : "jaroslavsemanko~instagram-comment-scraper";

            let input = target.platform === 'tiktok'
                ? { "postURLs": [target.url], "commentsPerPost": 50, "maxRepliesPerComment": 0 }
                : { "directUrls": [target.url], "resultsLimit": 50 };

            const run = await axios.post(`https://api.apify.com/v2/acts/${actorId}/runs?token=${APIFY_KEY}`, input);
            const runId = run.data.data.id;
            const datasetId = run.data.data.defaultDatasetId;

            // 2. Wait for completion (Simple polling for production)
            let status = 'RUNNING';
            while (status === 'RUNNING' || status === 'READY') {
                await new Promise(r => setTimeout(r, 10000));
                const check = await axios.get(`https://api.apify.com/v2/acts/${actorId}/runs/${runId}?token=${APIFY_KEY}`);
                status = check.data.data.status;
                if (status === 'ABORTED' || status === 'FAILED') throw new Error(`Scraper ${status}`);
            }

            // 3. Process Data
            const itemsRes = await axios.get(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_KEY}`);
            const rawComments = itemsRes.data.map(item => ({
                text: item.text || item.textDescription || "",
                author: item.uniqueId || item.ownerUsername || "Usuario",
                followers: item.authorStats?.followerCount || item.owner?.followerCount || 0,
                platform: target.platform,
                brand: target.brand,
                date: item.createTimeISO || yesterday
            })).filter(c => c.text);

            if (rawComments.length > 0) {
                const insights = await processor.analyzeSentimentAndTrends(rawComments.map(c => c.text));

                const scanData = {
                    brand: target.brand,
                    platform: target.platform,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    commentsCount: rawComments.length,
                    raw_comments: rawComments,
                    ...insights
                };

                // A. Save to Firestore (Live Dashboard)
                await db.collection('scans').doc(`${target.brand}-${target.platform}-${yesterday}`).set(scanData);

                // B. BigQuery Sync (Production Stub)
                console.log(`[BigQuery] Prereserve sync for ${rawComments.length} rows of ${target.brand}`);

                // C. Slack Alert (If Critical)
                if (insights.sentiment.negative > 30) {
                    await processor.sendSlackNotification(
                        `CRISIS ALERT: ${target.brand}`,
                        `Detectado ${insights.sentiment.negative}% de sentimiento negativo. \nCausa: ${insights.summary}`,
                        "#FF53BA"
                    );
                }
            }
        } catch (err) {
            console.error(`[Scouting Error] ${target.brand}:`, err.message);
        }
    }
}

exports.weeklyReport = onSchedule({
    schedule: 'every monday 08:00',
    timeZone: 'America/Lima',
    memory: '1GiB'
}, async (event) => {
    console.log("[WeeklyReport] Iniciando consolidación semanal...");
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const snapshot = await admin.firestore().collection('scans')
        .where('timestamp', '>', lastWeek)
        .limit(20)
        .get();

    const summaries = [];
    snapshot.forEach(doc => {
        const d = doc.data();
        summaries.push({ brand: d.brand, summary: d.summary, sentiment: d.sentiment });
    });

    if (summaries.length > 0) {
        const briefing = await processor.generateWeeklyExecutiveBriefing(summaries);
        if (briefing) {
            await admin.firestore().collection('reports').add({
                ...briefing,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                scanCount: summaries.length
            });
            console.log(`[WeeklyReport] Briefing semanal generado con éxito.`);
        }
    }
    return null;
});

registerRoute('get', '/api/reports', async (req, res) => {
    try {
        const snapshot = await admin.firestore().collection('reports').orderBy('timestamp', 'desc').limit(1).get();
        if (snapshot.empty) return res.json(null);
        res.json(snapshot.docs[0].data());
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

registerRoute('get', '/api/alerts', async (req, res) => {
    try {
        const snapshot = await admin.firestore().collection('alerts').orderBy('timestamp', 'desc').limit(5).get();
        const logs = [];
        snapshot.forEach(doc => logs.push(doc.data()));
        res.json(logs);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

registerRoute('get', '/api/historical', async (req, res) => {
    try {
        const { brand, platform } = req.query;
        let query = admin.firestore().collection('scans').orderBy('timestamp', 'desc');

        if (brand) query = query.where('brand', '==', brand);
        if (platform) query = query.where('platform', '==', platform);

        const snapshot = await query.limit(20).get();
        let results = [];
        snapshot.forEach(doc => results.push(doc.data()));

        // MOCK DATA FALLBACK
        if (results.length === 0) {
            results = [
                {
                    brand: 'Bembos',
                    platform: 'tiktok',
                    sentiment: { positive: 88, negative: 5 },
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    raw_comments: [
                        { author: 'burger_king_fan', text: 'La Bembos es insuperable, amo la carretillera!', followers: 15400, platform: 'tiktok' },
                        { author: 'nico_vlog', text: 'El delivery llegó en 15 min, increíble.', followers: 2300, platform: 'tiktok' }
                    ]
                },
                {
                    brand: 'Papa Johns',
                    platform: 'instagram',
                    sentiment: { positive: 42, negative: 38 },
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    raw_comments: [
                        { author: 'pizza_hater', text: 'Me enviaron la pizza equivocada y nadie responde.', followers: 500, platform: 'instagram' }
                    ]
                }
            ];
        }

        res.json(results);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
