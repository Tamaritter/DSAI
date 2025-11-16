// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "DSAI Assistant",
    description: "Dein persönlicher DSAI Chat mit Gemini & mehreren Persönlichkeiten.",
};

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode;
}) {
    return (
        <html lang="de">
        <body className="min-h-screen bg-slate-950 text-slate-50 antialiased">
        {children}
        </body>
        </html>
    );
}
