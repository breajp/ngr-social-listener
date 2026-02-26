const express = require('express');
const cors = require('cors');
require('dotenv').config();
const ApifyConnector = require('./connectors/apify');
const InsightProcessor = require('./agents/processor');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const apify = new ApifyConnector(process.env.APIFY_API_KEY);
const processor = new InsightProcessor(process.env.GEMINI_API_KEY);

// Endpoint para obtener insights de una URL externa (Scout Bot)
app.post('/api/scout', async (req, res) => {
    const { url, platform } = req.body;

    try {
        console.log(`[Server] Scrapeando URL: ${url} en ${platform}`);

        // 1. Lanzar Scraper según plataforma
        let actorId = "clockworks~tiktok-comments-scraper"; // Default TikTok
        if (platform === 'instagram') actorId = "jaroslavsemanko~instagram-comment-scraper";

        const run = await apify.launchScraper(actorId, {
            "commentsByPostUrls": [{ "url": url }],
            "maxCommentsPerPost": 20
        });

        // Simulación: En un entorno real usaríamos webhooks o polling.
        // Por ahora, devolvemos el ID del dataset para que el front pueda pedirlo después.
        res.json({
            status: 'processing',
            runId: run.id,
            datasetId: run.defaultDatasetId
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint para procesar resultados de un dataset con IA
app.get('/api/insights/:datasetId', async (req, res) => {
    try {
        const comments = await apify.getResults(req.params.datasetId);
        const textComments = comments.map(c => c.text);

        // El procesador real se usará cuando tengamos la API Key de Gemini
        // Por ahora devolvemos los comentarios crudos para el Front
        res.json({
            comments: comments.length,
            comments_raw: comments,
            sentiment: { positive: 50, neutral: 50, negative: 0 }, // Mock
            topTopics: ['Pizza', 'Combo', 'Papa Johns'] // Mock
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Mock de data de Cuántico (Insights de marcas propias)
app.get('/api/cuantico/summary', (req, res) => {
    res.json([
        { brand: 'Bembos', sentiment: 'Favorable', alert: 'Tendencia positiva en salsa parrillera', date: 'Hoy' },
        { brand: 'Popeyes', sentiment: 'Neutral', alert: 'Quejas por demora en delivery', date: 'Ayer' },
        { brand: 'China Wok', sentiment: 'Muy Favorable', alert: 'Nueva promo viral en TikTok', date: 'Hoy' }
    ]);
});

app.listen(port, () => {
    console.log(`🚀 NGR Social Server corriendo en http://localhost:${port}`);
});
