const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const axios = require('axios');

admin.initializeApp();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Re-usamos la lógica que ya testeamos
const APIFY_KEY = process.env.APIFY_API_KEY || "";

app.post('/scout', async (req, res) => {
    const { url, platform } = req.body;
    try {
        let actorId = "clockworks~tiktok-comments-scraper";
        let input = {
            "postURLs": [url],
            "commentsPerPost": 20,
            "maxRepliesPerComment": 0
        };

        if (platform === 'instagram') {
            actorId = "jaroslavsemanko~instagram-comment-scraper";
            input = { "directUrls": [url], "resultsLimit": 20 };
        }

        const response = await axios.post(`https://api.apify.com/v2/acts/${actorId}/runs?token=${APIFY_KEY}`, input);
        res.json({
            status: 'processing',
            datasetId: response.data.data.defaultDatasetId
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/insights/:datasetId', async (req, res) => {
    try {
        const response = await axios.get(`https://api.apify.com/v2/datasets/${req.params.datasetId}/items?token=${APIFY_KEY}`);
        res.json({
            comments: response.data.length,
            comments_raw: response.data
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

exports.api = functions.https.onRequest(app);
