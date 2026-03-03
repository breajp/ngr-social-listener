/**
 * Lógica de procesamiento de comentarios usando Gemini Flash
 */
const { GoogleGenerativeAI } = require("@google/generative-ai");

class InsightProcessor {
    constructor(geminiKey) {
        if (!geminiKey) {
            console.warn("[Processor] No Gemini Key provided, using mock mode.");
        }
        this.genAI = geminiKey ? new GoogleGenerativeAI(geminiKey) : null;
        this.model = this.genAI ? this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" }) : null;
    }

    async analyzeSentimentAndTrends(comments) {
        if (!this.model || !comments || comments.length === 0) {
            return {
                sentiment: { positive: 0, neutral: 100, negative: 0 },
                topTopics: ["Sin datos"],
                summary: "No hay comentarios suficientes para analizar o falta API Key."
            };
        }

        const prompt = `
        Analiza los siguientes comentarios de redes sociales sobre una marca de comida rápida (NGR):
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
            const result = await this.model.generateContent(prompt);
            const text = result.response.text();
            // Limpiar posibles backticks de markdown
            const cleanText = text.replace(/```json|```/g, "").trim();
            return JSON.parse(cleanText);
        } catch (error) {
            console.error("[Processor] Error con Gemini:", error);
            return {
                sentiment: { positive: 33, neutral: 33, negative: 34 },
                topTopics: ["Error en análisis"],
                summary: "Hubo un problema procesando los comentarios con la IA."
            };
        }
    }
}

module.exports = InsightProcessor;
