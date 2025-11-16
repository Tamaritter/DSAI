// app/api/chat/route.js
import { NextResponse } from "next/server";

const GEMINI_API_URL =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent";

// Definiert die verfügbaren Persönlichkeiten und ihre zugehörigen Umgebungsvariablen-Schlüssel.
const PERSONALITIES = {
    default: "SYSTEM_PROMPT_DEFAULT",
    david: "SYSTEM_PROMPT_DAVID",
    ardy: "SYSTEM_PROMPT_ARDY",
};

// Dies ist die Hauptfunktion, die Vercel (bzw. Next.js) bei POST /api/chat aufruft.
export async function POST(request) {
    try {
        // 1. Hole den geheimen API-Schlüssel aus den Vercel Environment Variables
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error("Gemini API key is not set in environment variables.");
            return NextResponse.json(
                { error: "API key is not configured." },
                { status: 500 }
            );
        }

        // 2. Hole die Chat-Historie und die Persönlichkeit aus der Anfrage des Frontends
        const body = await request.json();
        const { messages, personality } = body || {};

        if (!messages) {
            return NextResponse.json(
                { error: "Missing 'messages' in request body" },
                { status: 400 }
            );
        }

        // 3. Wähle den richtigen System-Prompt basierend auf der Persönlichkeit aus
        const personalityKey = personality || "default"; // Fallback auf 'default'
        const systemPromptEnvVar =
            PERSONALITIES[personalityKey] || PERSONALITIES["default"];
        const systemPrompt = process.env[systemPromptEnvVar];

        if (!systemPrompt) {
            console.error(
                `System prompt for personality '${personalityKey}' (env var ${systemPromptEnvVar}) is not set.`
            );
            return NextResponse.json(
                { error: `System prompt for '${personalityKey}' is not configured.` },
                { status: 500 }
            );
        }

        // 4. Bereite die Anfrage an Gemini vor
        const geminiContents = messages.map((msg) => {
            return {
                role: msg.role === "assistant" ? "model" : "user", // Wandle 'assistant' zu 'model' um
                parts: [{ text: msg.content }],
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
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!geminiResponse.ok) {
            let errorData = {};
            try {
                errorData = await geminiResponse.json();
            } catch {
                // ignore
            }
            console.error("Gemini API Error:", errorData);
            return NextResponse.json(
                {
                    error:
                        errorData?.error?.message || "Gemini API request failed",
                },
                { status: geminiResponse.status }
            );
        }

        const result = await geminiResponse.json();
        const aiMessage = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!aiMessage) {
            return NextResponse.json(
                { error: "Invalid response from Gemini" },
                { status: 500 }
            );
        }

        // 6. Sende die reine Text-Antwort zurück an das Frontend
        return NextResponse.json({ message: aiMessage }, { status: 200 });
    } catch (error) {
        console.error("Internal Server Error:", error);
        return NextResponse.json(
            { error: error.message || "An unexpected error occurred" },
            { status: 500 }
        );
    }
}
