/**
 * Lógica de procesamiento de comentarios usando Gemini Flash
 * Paridad completa con functions/processor.js
 */
const { GoogleGenerativeAI } = require("@google/generative-ai");

class InsightProcessor {
    constructor(geminiKey) {
        // Acepta key por constructor O por env var (para flexibilidad entre entornos)
        const key = geminiKey || process.env.GEMINI_API_KEY || "";
        if (!key) {
            console.warn("[Processor] No Gemini Key found — modo mock activado.");
        }
        this.genAI = key ? new GoogleGenerativeAI(key) : null;
        this.model = this.genAI ? this.genAI.getGenerativeModel({ model: "gemini-flash-latest" }) : null;
    }

    async analyzeSentimentAndTrends(comments) {
        if (!this.model || !comments || comments.length === 0) {
            return {
                sentiment: { positive: 0, neutral: 100, negative: 0 },
                topTopics: ["Sin datos"],
                topicClusters: [],
                summary: "No hay comentarios suficientes para analizar o falta API Key.",
                suggestedReplies: [],
                wordCloud: []
            };
        }

        const limitedComments = comments.slice(0, 15);
        const prompt = `
        Eres un experto en Social Listening para NGR (marcas como Bembos, Papa Johns, Popeyes, Dunkin, China Wok).
        Analiza estos comentarios y devuelve un JSON:
        ${limitedComments.join('\n---\n')}

        ESTRUCTURA JSON EXACTA:
        {
          "sentiment": { "positive": 50, "neutral": 30, "negative": 20 },
          "topTopics": ["tema1", "tema2", "tema3"],
          "topicClusters": [
            { "label": "Tiempos de Entrega", "count": 5, "sentiment": "negative" }
          ],
          "summary": "Resumen de lo que dicen los usuarios",
          "suggestedReplies": [
            {"comment": "texto del comentario original", "reply": "respuesta sugerida profesional y empática"}
          ],
          "wordCloud": [
            {"word": "Palabra1", "weight": 95}
          ]
        }
        IMPORTANTE:
        - "wordCloud" debe contener las 15-20 palabras de mayor impacto (weight de 10 a 100).
        - Solo JSON puro. Sin markdown.
        `;

        try {
            const result = await this.model.generateContent(prompt);
            const text = result.response.text();
            const cleanText = text.replace(/```json|```/g, "").trim();
            const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("Respuesta no es JSON");
            return JSON.parse(jsonMatch[0]);
        } catch (error) {
            console.error("[Processor] Error con Gemini:", error.message);
            return {
                sentiment: { positive: 33, neutral: 33, negative: 34 },
                topTopics: ["Error en análisis"],
                topicClusters: [],
                summary: "Hubo un problema procesando los comentarios con la IA.",
                suggestedReplies: [],
                wordCloud: []
            };
        }
    }

    async generateWeeklyExecutiveBriefing(scanSummaries) {
        if (!this.model || !scanSummaries || scanSummaries.length === 0) return null;

        const prompt = `
        Eres el Chief Strategy Officer de NGR.
        Analiza estos resúmenes de menciones de la semana para NGR (Bembos, Papa Johns, Popeyes, Dunkin, China Wok).
        Genera un "Briefing Ejecutivo Semanal" de alto nivel para el Directorio.

        DATOS DE LA SEMANA:
        ${JSON.stringify(scanSummaries.slice(0, 15))}

        ESTRUCTURA JSON EXACTA:
        {
          "executiveBrief": "Resumen estratégico de la semana en 2-3 oraciones",
          "brandPerformance": [
            { "brand": "Nombre Marca", "status": "Growing/Stable/At Risk/Crisis", "keyFinding": "Hallazgo principal" }
          ],
          "topStrategicRisk": "El mayor riesgo detectado esta semana",
          "nextSteps": ["Acción 1", "Acción 2", "Acción 3"]
        }
        IMPORTANTE: Solo responde con el JSON puro.
        `;

        try {
            const result = await this.model.generateContent(prompt);
            const text = result.response.text();
            const cleanText = text.replace(/```json|```/g, "").trim();
            const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
            return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        } catch (e) {
            console.error("[Processor] Weekly Briefing Error:", e.message);
            return null;
        }
    }

    async sendSlackNotification(title, message, color = "#ff53ba") {
        const webhookUrl = process.env.SLACK_WEBHOOK_URL;
        if (!webhookUrl) {
            console.log(`[SLACK_MOCK] [${title}] ${message}`);
            return;
        }
        try {
            const axios = require('axios');
            await axios.post(webhookUrl, {
                attachments: [{ color, title, text: message }]
            });
        } catch (e) {
            console.error("[Slack] Error enviando notificación:", e.message);
        }
    }
}

module.exports = InsightProcessor;
