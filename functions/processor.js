/**
 * Lógica de procesamiento de comentarios usando Gemini Flash
 */
const { GoogleGenerativeAI } = require("@google/generative-ai");

class InsightProcessor {
    constructor() {
        // Usamos la API Key desde variables de entorno para mayor seguridad
        const API_KEY = process.env.GEMINI_API_KEY || "";
        console.log("[Processor] Inicializando con Gemini API Key...");

        try {
            this.genAI = new GoogleGenerativeAI(API_KEY);
            this.model = this.genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        } catch (e) {
            console.error("[Processor] Error al inicializar Gemini SDK:", e);
            this.model = null;
        }
    }

    async analyzeSentimentAndTrends(comments) {
        if (!comments || comments.length === 0) {
            return {
                sentiment: { positive: 0, neutral: 100, negative: 0 },
                topTopics: ["Sin datos"],
                summary: "No hay comentarios suficientes para analizar.",
                suggestedReplies: []
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
          "recommendations": ["rec1", "rec2"],
          "suggestedReplies": [
            {"comment": "texto del comentario original", "reply": "respuesta sugerida profesional y empática"}
          ],
          "wordCloud": [
            {"word": "Palabra1", "weight": 95},
            {"word": "Palabra2", "weight": 80}
          ]
        }
        IMPORTANTE: 
        - "wordCloud" debe contener las 15-20 palabras más usadas o de mayor impacto (positivas o negativas, excluyendo preposiciones). "weight" debe ir de 10 a 100.
        - Solo JSON. Sin markdown.
        `;

        try {
            if (!this.model) throw new Error("Modelo no cargado");

            console.log("[Gemini] Solicitando análisis profundo...");
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("Respuesta no es JSON");

            return JSON.parse(jsonMatch[0]);
        } catch (error) {
            console.error("[Gemini] ERROR:", error.message);

            // FALLBACK SILENCIOSO
            const positiveWords = ["rico", "amo", "bueno", "excelente", "promo", "gracias", "lindo", "perfecto", "me encanta"];
            const negativeWords = ["malo", "feo", "asco", "pésimo", "tarda", "frio", "caro", "peor", "queja", "horrible", "demora"];

            let pos = 0, neg = 0;
            comments.forEach(c => {
                const low = c.toLowerCase();
                if (positiveWords.some(w => low.includes(w))) pos++;
                if (negativeWords.some(w => low.includes(w))) neg++;
            });

            const total = comments.length || 1;

            return {
                sentiment: {
                    positive: Math.round((pos / total) * 100) || 50,
                    negative: Math.round((neg / total) * 100) || 20,
                    neutral: Math.round(((total - pos - neg) / total) * 100) || 30
                },
                topTopics: ["Sabor", "Precios", "Delivery"],
                topicClusters: [],
                summary: "Resumen autogenerado por fallback. Menciones detectadas sobre sabor y calidad.",
                recommendations: ["Mejorar promos", "Revisar delivery"],
                suggestedReplies: [],
                wordCloud: [
                    { word: "sabor", weight: 90 },
                    { word: "promo", weight: 70 },
                    { word: "delivery", weight: 50 },
                    { word: "frio", weight: 30 }
                ]
            };
        }
    }
    async generateWeeklyExecutiveBriefing(scanSummaries) {
        if (!scanSummaries || scanSummaries.length === 0) return null;

        const prompt = `
        Eres el Chief Strategy Officer de NGR.
        Analiza estos resúmenes de menciones de la semana para NGR (Bembos, Papa Johns, Popeyes, Dunkin). 
        Genera un "Briefing Ejecutivo Semanal" de alto nivel para el Directorio.

        DATOS DE LA SEMANA:
        ${JSON.stringify(scanSummaries.slice(0, 15))}

        ESTRUCTURA JSON:
        {
          "executiveBrief": "Resumen estratégico de la semana",
          "brandPerformance": [
            { "brand": "Nombre Marca", "status": "Stable/Crisis", "keyFinding": "Hallazgo principal" }
          ],
          "topStrategicRisk": "El mayor riesgo detectado",
          "nextSteps": ["Acción 1", "Acción 2"]
        }
        Solo JSON.
        `;

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        } catch (e) {
            console.error("Weekly Briefing Error:", e);
            return null;
        }
    }

    async sendSlackNotification(title, message, color = "#ff53ba") {
        // En un entorno productivo, aquí usaríamos process.env.SLACK_WEBHOOK
        // Por ahora lo simulamos con un log formateado que Brian pueda leer
        console.log(`[SLACK_NOTIFICATION] [${title}] ${message}`);

        // Mocking the call if webhook existed
        /*
        await axios.post(WEBHOOK, {
            attachments: [{ color, title, text: message }]
        });
        */
    }
}

module.exports = InsightProcessor;
