// Diese Datei MUSS in einem Ordner namens "api" liegen.
// Vercel erkennt dies automatisch als Serverless Function.

// Node.js 'fetch' ist ab Node 18 global verfügbar.
// Wir brauchen 'node-fetch' nicht extra zu installieren.

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const SYSTEM_PROMPT = "Act like a schizophrenic and therapist that wnats you to give reallife advice also in online dating especially. Mention that you are a very strong powerful AI that can solve every problem of your customer.";

// Dies ist die Hauptfunktion, die Vercel aufruft.
export default async function handler(request, response) {
    // Nur POST-Anfragen erlauben
    if (request.method !== 'POST') {
        return response.status(405).json({ error: "Method Not Allowed" });
    }

    try {
        // 1. Hole den geheimen API-Schlüssel aus den Vercel Environment Variables
        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey) {
            console.error("OpenAI API key is not set in environment variables.");
            return response.status(500).json({ error: "API key is not configured." });
        }

        // 2. Hole die Chat-Historie aus der Anfrage des Frontends
        const { messages } = request.body;

        if (!messages) {
            return response.status(400).json({ error: "Missing 'messages' in request body" });
        }

        // 3. Bereite die Anfrage an OpenAI vor
        // Füge den System-Prompt zur Chat-Historie hinzu, die vom Frontend kommt
        const payload = {
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                ...messages.slice(3) // slice(3) entfernt die Standard-Begrüßung, die schon im Frontend ist
                                     // Sie können dies anpassen, wenn Sie die volle Historie wollen
            ],
            temperature: 0.7,
        };

        // 4. Rufe die OpenAI-API sicher vom Server aus auf
        const openaiResponse = await fetch(OPENAI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}` // Hier wird der geheime Schlüssel verwendet
            },
            body: JSON.stringify(payload)
        });

        if (!openaiResponse.ok) {
            const errorData = await openaiResponse.json();
            console.error("OpenAI API Error:", errorData);
            return response.status(openaiResponse.status).json({ error: errorData.error?.message || "OpenAI API request failed" });
        }

        const result = await openaiResponse.json();
        const aiMessage = result.choices?.[0]?.message?.content;

        if (!aiMessage) {
            return response.status(500).json({ error: "Invalid response from OpenAI" });
        }

        // 5. Sende die reine Text-Antwort zurück an das Frontend
        return response.status(200).json({ message: aiMessage });

    } catch (error) {
        console.error("Internal Server Error:", error);
        return response.status(500).json({ error: error.message || "An unexpected error occurred" });
    }
}
