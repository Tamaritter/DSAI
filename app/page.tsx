"use client";

import { FormEvent, KeyboardEvent, useState, useEffect } from "react";
import { initializeApp, getApps, getApp } from "firebase/app";
import {
    getAuth,
    signInAnonymously,
    onAuthStateChanged,
    User,
    signInWithCustomToken
} from "firebase/auth";
import {
    getFirestore,
    collection,
    addDoc,
    onSnapshot,
    doc,
    updateDoc,
    deleteDoc, // <--- Neu importiert
    query,
    serverTimestamp,
    orderBy
} from "firebase/firestore";

// --- FIREBASE SETUP ---
const firebaseConfigString = process.env.NEXT_PUBLIC_FIREBASE_CONFIG;
let firebaseConfig;

try {
    firebaseConfig = firebaseConfigString ? JSON.parse(firebaseConfigString) : {};
} catch (e) {
    console.error("Konfigurationsfehler: NEXT_PUBLIC_FIREBASE_CONFIG ist ungültig.", e);
    firebaseConfig = {};
}

const appId = typeof window !== 'undefined' && (window as any).__app_id ? (window as any).__app_id : 'default-app-id';

let app, auth, db;
const isFirebaseConfigured = firebaseConfig && firebaseConfig.apiKey;

if (isFirebaseConfigured) {
    try {
        if (getApps().length === 0) {
            app = initializeApp(firebaseConfig);
            auth = getAuth(app);
            db = getFirestore(app);
        } else {
            app = getApp();
            auth = getAuth(app);
            db = getFirestore(app);
        }
    } catch (e) {
        console.error("Fehler bei Firebase Init:", e);
    }
}

// --- TYPEN ---
type Role = "user" | "assistant";
type Personality = "default" | "david" | "ardy" | "custom";

type ChatMessage = {
    role: Role;
    content: string;
};

type CommunityPrompt = {
    id: string;
    name: string;
    prompt: string;
    createdAt?: any;
    createdBy?: string;
};

export default function HomePage() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [personality, setPersonality] = useState<Personality>("default");
    const [customPrompt, setCustomPrompt] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Firebase States
    const [user, setUser] = useState<User | null>(null);
    const [communityPrompts, setCommunityPrompts] = useState<CommunityPrompt[]>([]);
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [newPromptName, setNewPromptName] = useState("");
    const [editingPromptId, setEditingPromptId] = useState<string | null>(null);

    // 1. AUTHENTIFIZIERUNG
    useEffect(() => {
        if (!auth) return;
        const initAuth = async () => {
            try {
                if (typeof (window as any).__initial_auth_token !== 'undefined' && (window as any).__initial_auth_token) {
                    await signInWithCustomToken(auth, (window as any).__initial_auth_token);
                } else {
                    await signInAnonymously(auth);
                }
            } catch (err) {
                console.error("Auth Fehler (ignoriert):", err);
            }
        };
        initAuth();

        const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
        return () => unsubscribe();
    }, []);

    // 2. DATEN LADEN
    useEffect(() => {
        if (!db) return;

        const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'prompts'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const prompts: CommunityPrompt[] = [];
            snapshot.forEach((doc) => {
                prompts.push({ id: doc.id, ...doc.data() } as CommunityPrompt);
            });
            prompts.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setCommunityPrompts(prompts);
        }, (err) => {
            console.log("Warte auf Datenbank-Verbindung...");
        });

        return () => unsubscribe();
    }, [user]);

    // --- FUNKTIONEN ---

    const handleSavePromptToCommunity = async () => {
        if (!db) {
            alert("Fehler: Datenbank nicht verbunden.");
            return;
        }

        if (!newPromptName.trim()) {
            alert("Bitte gib dem Prompt einen Namen.");
            return;
        }
        if (!customPrompt.trim()) {
            alert("Das Prompt-Feld darf nicht leer sein.");
            return;
        }

        try {
            const docData = {
                name: newPromptName,
                prompt: customPrompt,
                createdBy: user?.uid || "anonymous",
                updatedAt: serverTimestamp()
            };

            if (editingPromptId) {
                // Update
                const promptRef = doc(db, 'artifacts', appId, 'public', 'data', 'prompts', editingPromptId);
                await updateDoc(promptRef, docData);
            } else {
                // Create New
                await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'prompts'), {
                    ...docData,
                    createdAt: serverTimestamp()
                });
            }

            setIsSaveModalOpen(false);
            setNewPromptName("");
            setEditingPromptId(null);
        } catch (e) {
            console.error("Speicherfehler:", e);
            alert("Konnte nicht speichern.");
        }
    };

    // NEU: Löschen Funktion
    const handleDeletePrompt = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Verhindert, dass der Klick den Prompt lädt
        if (!db) return;

        if (!confirm("Möchtest du diesen Prompt wirklich löschen?")) return;

        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'prompts', id));
            // Wenn wir den gelöschten Prompt gerade bearbeiten, leeren wir den Editor
            if (editingPromptId === id) {
                resetCustomMode();
            }
        } catch (err) {
            console.error("Löschen fehlgeschlagen:", err);
            alert("Konnte Eintrag nicht löschen.");
        }
    };

    const loadCommunityPrompt = (p: CommunityPrompt) => {
        setPersonality("custom");
        setCustomPrompt(p.prompt);
        setNewPromptName(p.name);
        setEditingPromptId(p.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const resetCustomMode = () => {
        setPersonality("custom");
        setEditingPromptId(null);
        setNewPromptName("");
        setCustomPrompt("");
    };

    // Nur den Editier-Status zurücksetzen, aber Text behalten (für "Save as New")
    const cancelEditMode = () => {
        setEditingPromptId(null);
        setNewPromptName("");
        // Custom Prompt bleibt stehen, damit man ihn als Vorlage nutzen kann
    };

    async function handleSubmit(e: FormEvent | KeyboardEvent) {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const newMessage: ChatMessage = { role: "user", content: input.trim() };
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
                    customSystemPrompt: personality === "custom" ? customPrompt : undefined
                }),
            });

            const data = await res.json();
            if (!res.ok || data.error) throw new Error(data.error || "Fehler bei der Anfrage.");

            setMessages((prev) => [...prev, { role: "assistant", content: data.message }]);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Unerwarteter Fehler.";
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }

    function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    }

    if (!isFirebaseConfigured) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-white">
                <div className="max-w-md text-center border border-red-500/50 bg-red-950/20 p-6 rounded-2xl">
                    <h2 className="text-xl font-bold text-red-400 mb-2">Konfigurationsfehler</h2>
                    <p className="text-sm text-slate-300">
                        Die Firebase Config in <code>.env.local</code> ist ungültig.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <main className="relative flex min-h-screen flex-col items-center justify-start overflow-hidden px-4 py-10">
            {/* Hintergrund */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.35),_transparent_60%),radial-gradient(circle_at_bottom,_rgba(168,85,247,0.45),_transparent_60%)]" />
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-3xl" />

            <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-10">
                {/* HERO SECTION */}
                <section className="flex flex-col gap-6">
                    <div>
                        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-slate-900/70 px-3 py-1 text-xs font-medium text-cyan-200">
                            <span className="h-2 w-2 rounded-full bg-emerald-400" />
                            Live · Gemini 2.5 Flash · Community Edition
                        </div>
                        <h1 className="mb-4 text-4xl font-semibold tracking-tight sm:text-5xl">
                            Dein <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">DSAI-Assistent</span>
                        </h1>
                        <p className="max-w-2xl text-sm text-slate-300 sm:text-base">
                            Wähle eine Persönlichkeit oder erstelle deine eigene und teile sie mit der Community.
                        </p>
                    </div>

                    {/* CONTROLS */}
                    <div className="mt-2 space-y-4 text-xs text-slate-400">

                        {/* Standard Buttons */}
                        <div className="flex flex-col gap-2">
                            <p className="font-medium text-slate-300">Standard Persönlichkeiten:</p>
                            <div className="inline-flex flex-wrap gap-2">
                                <button onClick={() => setPersonality("default")} className={`rounded-full px-3 py-1 text-xs font-medium transition ${personality === "default" ? "bg-cyan-400 text-slate-950" : "bg-slate-800/80 text-slate-200 hover:bg-slate-700"}`}>🧠 Allround</button>
                                <button onClick={() => setPersonality("david")} className={`rounded-full px-3 py-1 text-xs font-medium transition ${personality === "david" ? "bg-emerald-400 text-slate-950" : "bg-slate-800/80 text-slate-200 hover:bg-slate-700"}`}>💬 David</button>
                                <button onClick={() => setPersonality("ardy")} className={`rounded-full px-3 py-1 text-xs font-medium transition ${personality === "ardy" ? "bg-violet-400 text-slate-950" : "bg-slate-800/80 text-slate-200 hover:bg-slate-700"}`}>👨‍💻 Ardy</button>
                                <button onClick={resetCustomMode} className={`rounded-full px-3 py-1 text-xs font-medium transition ${personality === "custom" ? "bg-amber-400 text-slate-950" : "bg-slate-800/80 text-slate-200 hover:bg-slate-700"}`}>⚙️ Custom / Community</button>
                            </div>
                        </div>

                        {/* EDITOR & COMMUNITY BEREICH */}
                        {personality === "custom" && (
                            <div className="grid gap-6 md:grid-cols-2 animate-in fade-in slide-in-from-top-2 duration-300">

                                {/* EDITOR */}
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <label className="font-medium text-amber-300 flex items-center gap-2">
                                            {editingPromptId ? (
                                                <>
                                                    <span className="truncate max-w-[150px]">Bearbeite: "{newPromptName}"</span>
                                                    <button
                                                        onClick={cancelEditMode}
                                                        className="text-[10px] underline text-slate-400 hover:text-slate-200"
                                                    >
                                                        (Neu erstellen)
                                                    </button>
                                                </>
                                            ) : (
                                                "Dein Prompt Editor"
                                            )}
                                        </label>
                                        <button
                                            onClick={() => setIsSaveModalOpen(true)}
                                            className="rounded-md bg-amber-500/20 px-2 py-1 text-[10px] font-bold text-amber-300 hover:bg-amber-500/40 border border-amber-500/30"
                                        >
                                            {editingPromptId ? "Änderungen Speichern" : "+ Als Neu Speichern"}
                                        </button>
                                    </div>
                                    <textarea
                                        value={customPrompt}
                                        onChange={(e) => setCustomPrompt(e.target.value)}
                                        placeholder="Du bist ein hilfreicher Assistent..."
                                        className="h-40 w-full rounded-xl border border-amber-500/30 bg-slate-900/80 p-3 text-xs text-slate-200 shadow-lg outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50"
                                        suppressHydrationWarning={true}
                                    />
                                </div>

                                {/* LISTE */}
                                <div className="flex flex-col gap-2">
                                    <p className="font-medium text-slate-300">Community Prompts:</p>
                                    <div className="h-40 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/50 p-2 scrollbar-thin scrollbar-thumb-slate-700">
                                        {communityPrompts.length === 0 ? (
                                            <p className="p-2 text-slate-500 italic">Noch keine Community Prompts.</p>
                                        ) : (
                                            <div className="flex flex-col gap-2">
                                                {communityPrompts.map((p) => (
                                                    <div
                                                        key={p.id}
                                                        className={`flex items-center justify-between rounded-lg border p-2 transition hover:bg-slate-800 ${editingPromptId === p.id ? "border-amber-500/50 bg-amber-500/10" : "border-slate-800 bg-slate-950/50"}`}
                                                    >
                                                        <button
                                                            onClick={() => loadCommunityPrompt(p)}
                                                            className="flex-1 text-left overflow-hidden"
                                                        >
                                                            <div className="font-semibold text-slate-200 truncate">{p.name}</div>
                                                            <div className="truncate text-[10px] text-slate-500">{p.prompt}</div>
                                                        </button>

                                                        <button
                                                            onClick={(e) => handleDeletePrompt(p.id, e)}
                                                            className="ml-2 p-2 text-slate-500 hover:text-red-400 transition-colors"
                                                            title="Löschen"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* CHAT BEREICH */}
                <section className="flex">
                    <div className="flex h-[500px] w-full flex-col overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-900/70 shadow-2xl shadow-slate-950/80 backdrop-blur-xl">
                        <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-3">
                            <div className="flex items-center gap-2">
                                <div className={`h-2 w-2 rounded-full ${personality === 'custom' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                                <p className="text-xs font-medium text-slate-200">
                                    {personality === "custom" && editingPromptId
                                        ? `Custom · ${newPromptName}`
                                        : personality === "custom"
                                            ? "Custom · Entwurf"
                                            : `DSAI · ${personality.charAt(0).toUpperCase() + personality.slice(1)}`}
                                </p>
                            </div>
                        </div>

                        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 text-sm scrollbar-thin scrollbar-thumb-slate-700">
                            {messages.map((msg, index) => (
                                <div key={index} className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs sm:text-sm ${msg.role === "user" ? "bg-cyan-500 text-slate-950 rounded-br-sm" : "bg-slate-800/90 text-slate-100 rounded-bl-sm border border-slate-700/80"}`}>
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                            {loading && <div className="text-xs text-slate-500 ml-2">Schreibt...</div>}
                            {error && <div className="text-xs text-red-400 ml-2">{error}</div>}
                        </div>

                        <form onSubmit={handleSubmit} className="border-t border-slate-800/80 bg-slate-950/70 px-3 py-3">
                            <div className="flex items-end gap-2">
                                <textarea
                                    rows={1}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Nachricht..."
                                    className="max-h-32 flex-1 resize-none rounded-2xl border border-slate-700 bg-slate-900/90 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400"
                                    suppressHydrationWarning={true}
                                />
                                <button type="submit" disabled={loading || !input.trim()} className="rounded-2xl bg-cyan-400 px-4 py-2 text-xs font-bold text-slate-950 hover:brightness-110">Send</button>
                            </div>
                        </form>
                    </div>
                </section>
            </div>

            {/* MODAL */}
            {isSaveModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
                        <h3 className="mb-4 text-lg font-semibold text-slate-100">Prompt speichern</h3>
                        <input
                            type="text"
                            value={newPromptName}
                            onChange={(e) => setNewPromptName(e.target.value)}
                            placeholder="Name des Prompts"
                            className="mb-4 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm text-white outline-none focus:border-amber-400"
                            autoFocus
                            suppressHydrationWarning={true}
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setIsSaveModalOpen(false)} className="rounded-lg px-4 py-2 text-xs text-slate-400 hover:text-white">Abbrechen</button>
                            <button onClick={handleSavePromptToCommunity} className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400">
                                {editingPromptId ? "Update" : "Veröffentlichen"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
