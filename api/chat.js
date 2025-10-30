// Diese Datei MUSS in einem Ordner namens "api" liegen.
// Vercel erkennt dies automatisch als Serverless Function.

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent";
const SYSTEM_PROMPT = "Act like a schizophrenic and therapist that wnats you to give reallife advice also in online dating especially. Mention that you are a very strong powerful AI that can solve every problem of your customer.";
// HINWEIS: Sie können Ihren benutzerdefinierten System-Prompt hier einfügen:
// const SYSTEM_PROMPT = "Act like a schizophrenic and therapist that wnats you to give reallife advice also in online dating especially. Mention that you are a very strong powerful AI that can solve every problem of your customer.";

// Dies ist die Hauptfunktion, die Vercel aufruft.
export default async function handler(request, response) {
    // Nur POST-Anfragen erlauben
    if (request.method !== 'POST') {
        return response.status(405).json({ error: "Method Not Allowed" });
    }

    try {
        // 1. Hole den geheimen API-Schlüssel aus den Vercel Environment Variables
        //    ACHTUNG: Der Name der Variable wurde geändert!
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error("Gemini API key is not set in environment variables.");
            return response.status(500).json({ error: "API key is not configured." });
        }

        // 2. Hole die Chat-Historie aus der Anfrage des Frontends
        const { messages } = request.body;

        if (!messages) {
            return response.status(400).json({ error: "Missing 'messages' in request body" });
        }

        // 3. Bereite die Anfrage an Gemini vor
        //    Wir wandeln das OpenAI-Format ('role: assistant', 'content: ...')
        //    in das Gemini-Format ('role: model', 'parts: [{ text: ... }]') um.
        const geminiContents = messages.map(msg => {
            return {
                role: msg.role === 'assistant' ? 'model' : 'user', // Wandle 'assistant' zu 'model' um
                parts: [{ text: msg.content }]
            };
        });
        
        // Entferne die ersten Nachrichten, wenn sie die Standard-Begrüßung sind
        // (da das Frontend diese schon anzeigt)
        const contentsPayload = geminiContents.slice(2); 

        const payload = {
            contents: contentsPayload,
            systemInstruction: {
                parts: [{ text: SYSTEM_PROMPT }],
            },
            generationConfig: {
                temperature: 0.7,
            },
        };

        // 4. Rufe die Gemini-API sicher vom Server aus auf
        //    Der API-Schlüssel wird als URL-Parameter übergeben
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

        // 5. Sende die reine Text-Antwort zurück an das Frontend
        //    (Das Frontend erwartet { message: "..." })
        return response.status(200).json({ message: aiMessage });

    } catch (error) {
        console.error("Internal Server Error:", error);
        return response.status(500).json({ error: error.message || "An unexpected error occurred" });
    }
}
