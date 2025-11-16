// app/page.tsx
"use client";

import { FormEvent, useState } from "react";

type Role = "user" | "assistant";
type Personality = "default" | "david" | "ardy";

type ChatMessage = {
    role: Role;
    content: string;
};

export default function HomePage() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [personality, setPersonality] = useState<Personality>("default");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: FormEvent | KeyboardEvent) {
        e.preventDefault?.();
        if (!input.trim() || loading) return;

        const newMessage: ChatMessage = {
            role: "user",
            content: input.trim(),
        };

        const updatedMessages = [...messages, newMessage];
        setMessages(updatedMessages);
        setInput("");
        setError(null);
        setLoading(true);

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: updatedMessages,
                    personality,
                }),
            });

            const data = await res.json();

            if (!res.ok || data.error) {
                throw new Error(data.error || "Fehler bei der Anfrage.");
            }

            const aiMessage: ChatMessage = {
                role: "assistant",
                content: data.message,
            };

            setMessages((prev) => [...prev, aiMessage]);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Unerwarteter Fehler.");
        } finally {
            setLoading(false);
        }
    }

    // ENTER = senden, SHIFT+ENTER = neue Zeile
    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e as any);
        }
    }

    function handlePersonalityChange(p: Personality) {
        if (loading) return;
        setPersonality(p);
    }

    return (
        <main className="relative flex min-h-screen flex-col items-center justify-start overflow-hidden px-4 py-10">
            {/* Hintergrund */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.35),_transparent_60%),radial-gradient(circle_at_bottom,_rgba(168,85,247,0.45),_transparent_60%)]" />
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-3xl" />

            <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-10">
                {/* HERO */}
                <section className="flex flex-col gap-6">
                    <div>
                        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-slate-900/70 px-3 py-1 text-xs font-medium text-cyan-200">
                            <span className="h-2 w-2 rounded-full bg-emerald-400" />
                            Live · Gemini 2.5 Flash
                        </div>

                        <h1 className="mb-4 text-4xl font-semibold tracking-tight sm:text-5xl">
                            Dein{" "}
                            <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
                DSAI-Assistent
              </span>
                            <br />
                            direkt im Browser.
                        </h1>

                        <p className="max-w-2xl text-sm text-slate-300 sm:text-base">
                            Wechsle zwischen{" "}
                            <span className="font-semibold text-cyan-300">Allround</span>,{" "}
                            <span className="font-semibold text-emerald-300">David</span> und{" "}
                            <span className="font-semibold text-violet-300">Ardy</span>.
                        </p>
                    </div>

                    <div className="mt-2 space-y-2 text-xs text-slate-400">
                        <p className="font-medium text-slate-300">Wähle deine Persönlichkeit:</p>

                        <div className="inline-flex flex-wrap gap-2">
                            <button
                                onClick={() => handlePersonalityChange("default")}
                                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                                    personality === "default"
                                        ? "bg-cyan-400 text-slate-950 shadow-md shadow-cyan-400/40"
                                        : "bg-slate-800/80 text-slate-200 hover:bg-slate-700/80"
                                }`}
                            >
                                🧠 Allround
                            </button>

                            <button
                                onClick={() => handlePersonalityChange("david")}
                                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                                    personality === "david"
                                        ? "bg-emerald-400 text-slate-950 shadow-md shadow-emerald-400/40"
                                        : "bg-slate-800/80 text-slate-200 hover:bg-slate-700/80"
                                }`}
                            >
                                💬 David
                            </button>

                            <button
                                onClick={() => handlePersonalityChange("ardy")}
                                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                                    personality === "ardy"
                                        ? "bg-violet-400 text-slate-950 shadow-md shadow-violet-400/40"
                                        : "bg-slate-800/80 text-slate-200 hover:bg-slate-700/80"
                                }`}
                            >
                                👨‍💻 Ardy
                            </button>
                        </div>
                    </div>
                </section>

                {/* CHAT */}
                <section className="flex">
                    <div className="flex h-[560px] w-full flex-col overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-900/70 shadow-2xl shadow-slate-950/80 backdrop-blur-xl">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-3">
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                                <p className="text-xs font-medium text-slate-200">DSAI · Chat</p>
                            </div>

                            <span className="rounded-full bg-slate-800 px-2 py-1 text-[10px] uppercase tracking-wide text-slate-400">
                Beta
              </span>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 text-sm">
                            {messages.length === 0 && (
                                <div className="mt-10 rounded-2xl border border-dashed border-slate-700 bg-slate-900/70 p-4 text-xs text-slate-400">
                                    <p className="mb-2 font-medium text-slate-300">
                                        Starte eine Unterhaltung ✨
                                    </p>
                                    <ul className="list-inside list-disc space-y-1">
                                        <li>Frag nach Hilfe bei deinem Studium oder Code.</li>
                                        <li>David hilft beim Reflektieren.</li>
                                        <li>Ardy liefert konkrete Implementierungen.</li>
                                    </ul>
                                </div>
                            )}

                            {messages.map((msg, index) => {
                                const isUser = msg.role === "user";
                                return (
                                    <div
                                        key={index}
                                        className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}
                                    >
                                        <div
                                            className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs sm:text-sm ${
                                                isUser
                                                    ? "bg-cyan-500 text-slate-950 rounded-br-sm"
                                                    : "bg-slate-800/90 text-slate-100 rounded-bl-sm border border-slate-700/80"
                                            }`}
                                        >
                                            {msg.content}
                                        </div>
                                    </div>
                                );
                            })}

                            {loading && (
                                <div className="flex justify-start">
                                    <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm border border-slate-700/80 bg-slate-800/90 px-3 py-2 text-xs text-slate-300">
                                        <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300" />
                                        Denken...
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="border-t border-red-500/40 bg-red-950/40 px-4 py-2 text-[11px] text-red-200">
                                {error}
                            </div>
                        )}

                        {/* Input */}
                        <form
                            onSubmit={handleSubmit}
                            className="border-t border-slate-800/80 bg-slate-950/70 px-3 py-3"
                        >
                            <div className="flex items-end gap-2">
                <textarea
                    rows={1}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Schreibe eine Nachricht…"
                    className="max-h-32 flex-1 resize-none rounded-2xl border border-slate-700 bg-slate-900/90 px-3 py-2 text-sm text-slate-100 outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/40"
                />

                                <button
                                    type="submit"
                                    disabled={loading || !input.trim()}
                                    className="inline-flex items-center gap-1 rounded-2xl bg-gradient-to-r from-cyan-400 to-violet-400 px-4 py-2 text-xs font-semibold text-slate-950 shadow-lg shadow-cyan-500/40 transition disabled:cursor-not-allowed disabled:opacity-50 hover:brightness-110"
                                >
                                    {loading ? (
                                        <span className="text-[11px]">Senden...</span>
                                    ) : (
                                        <>
                                            <span>Senden</span>
                                            <span className="text-[11px]">↵</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </section>
            </div>
        </main>
    );
}
