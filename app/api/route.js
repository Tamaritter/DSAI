// api/chat.js
// Diese Datei MUSS in einem Ordner namens "api" liegen.
// Vercel erkennt dies automatisch als Serverless Function.

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent";

// Definiert die verfügbaren Persönlichkeiten und ihre zugehörigen Umgebungsvariablen-Schlüssel.
const PERSONALITIES = {
    'default': 'SYSTEM_PROMPT_DEFAULT', // Der Standard-Allrounder
    'coach': 'SYSTEM_PROMPT_DAVID',     // Der Life-Coach
    'coder': 'SYSTEM_PROMPT_ARDY'       // Der Code-Experte
};

// Dies ist die Hauptfunktion, die Vercel aufruft.
export default async function handler(request, response) {
    // Nur POST-Anfragen erlauben
    if (request.method !== 'POST') {
        return response.status(405).json({ error: "Method Not Allowed" });
    }

    try {
        // 1. Hole den geheimen API-Schlüssel aus den Vercel Environment Variables
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error("Gemini API key is not set in environment variables.");
            return response.status(500).json({ error: "API key is not configured." });
        }

        // 2. Hole die Chat-Historie und die Persönlichkeit aus der Anfrage des Frontends
        const { messages, personality } = request.body;

        if (!messages) {
            return response.status(400).json({ error: "Missing 'messages' in request body" });
        }

        // 3. Wähle den richtigen System-Prompt basierend auf der Persönlichkeit aus
        const personalityKey = personality || 'default'; // Fallback auf 'default'
        const systemPromptEnvVar = PERSONALITIES[personalityKey] || PERSONALITIES['default'];
        const systemPrompt = process.env[systemPromptEnvVar];

        if (!systemPrompt) {
            console.error(`System prompt for personality '${personalityKey}' (env var ${systemPromptEnvVar}) is not set.`);
            return response.status(500).json({ error: `System prompt for '${personalityKey}' is not configured.` });
        }

        // 4. Bereite die Anfrage an Gemini vor
        const geminiContents = messages.map(msg => {
            return {
                role: msg.role === 'assistant' ? 'model' : 'user', // Wandle 'assistant' zu 'model' um
                parts: [{ text: msg.content }]
            };
        });

        // Entferne die ersten Nachrichten, wenn sie die Standard-Begrüßung sind
        const contentsPayload = geminiContents.slice(2);

        const payload = {
            contents: contentsPayload,
            systemInstruction: {
                parts: [{ text: systemPrompt }],
            },
            generationConfig: {
                temperature: 0.7,
            },
        };

        // 5. Rufe die Gemini-API sicher vom Server aus auf
        const geminiResponse = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!geminiResponse.ok) {
            const errorData = await geminiResponse.json();
            console.error("Gemini API Error:", errorData);
            return response.status(geminiResponse.status).json({ error: errorData.error?.message || "Gemini API request failed" });
        }

        const result = await geminiResponse.json();
        const aiMessage = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!aiMessage) {
            return response.status(500).json({ error: "Invalid response from Gemini" });
        }

        // 6. Sende die reine Text-Antwort zurück an das Frontend
        return response.status(200).json({ message: aiMessage });

    } catch (error) {
        console.error("Internal Server Error:", error);
        return response.status(500).json({ error: error.message || "An unexpected error occurred" });
    }
}
