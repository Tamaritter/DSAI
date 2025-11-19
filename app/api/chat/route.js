import { NextResponse } from "next/server";

const GEMINI_API_URL =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent";

// Definiert die verfügbaren Persönlichkeiten und ihre zugehörigen Umgebungsvariablen-Schlüssel.
const PERSONALITIES = {
    default: "SYSTEM_PROMPT_DEFAULT",
    david: "SYSTEM_PROMPT_DAVID",
    ardy: "SYSTEM_PROMPT_ARDY",
};

export async function POST(request) {
    try {
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error("Gemini API key is not set.");
            return NextResponse.json(
                { error: "API key is not configured." },
                { status: 500 }
            );
        }

        // 1. Daten aus dem Request holen
        const body = await request.json();
        // Wir holen zusätzlich 'customSystemPrompt' aus dem Body
        const { messages, personality, customSystemPrompt } = body || {};

        if (!messages) {
            return NextResponse.json(
                { error: "Missing 'messages' in request body" },
                { status: 400 }
            );
        }

        // 2. System Prompt Logik
        let systemPrompt = "";

        // WICHTIG: Wenn personality 'custom' ist und ein Text da ist, nimm diesen.
        if (personality === "custom" && customSystemPrompt) {
            systemPrompt = customSystemPrompt;
        } else {
            // Ansonsten Standard-Logik mit Umgebungsvariablen
            const personalityKey = personality || "default";
            // Fallback auf default, falls der Key nicht existiert (z.B. bei Manipulation)
            const validKey = PERSONALITIES[personalityKey] ? personalityKey : "default";
            const systemPromptEnvVar = PERSONALITIES[validKey];
            systemPrompt = process.env[systemPromptEnvVar];
        }

        // Fallback, falls gar nichts gefunden wurde (weder Env noch Custom)
        if (!systemPrompt) {
            systemPrompt = "Du bist ein hilfreicher Assistent.";
        }

        // 3. Anfrage vorbereiten
        const geminiContents = messages.map((msg) => ({
            role: msg.role === "assistant" ? "model" : "user",
            parts: [{ text: msg.content }],
        }));

        const contentsPayload =
            geminiContents.length > 2 ? geminiContents.slice(2) : geminiContents;

        const payload = {
            contents: contentsPayload,
            systemInstruction: {
                parts: [{ text: systemPrompt }],
            },
            generationConfig: {
                temperature: 0.7,
            },
        };

        // 4. Fetch zu Gemini
        const geminiResponse = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!geminiResponse.ok) {
            let errorData = {};
            try {
                errorData = await geminiResponse.json();
            } catch { }
            return NextResponse.json(
                { error: errorData?.error?.message || "Gemini API request failed" },
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

        return NextResponse.json({ message: aiMessage }, { status: 200 });
    } catch (error) {
        console.error("Internal Server Error:", error);
        return NextResponse.json(
            { error: error.message || "An unexpected error occurred" },
            { status: 500 }
        );
    }
}
