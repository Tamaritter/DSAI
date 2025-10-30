# SuperDavidAI

Hier ist ein Entwurf für eine README.md-Datei, die auf dem von dir bereitgestellten Code und Projektnamen basiert. Sie ist in Markdown formatiert und bereit zum Kopieren und Einfügen.

🤖 DSAI - David Super AI
Willkommen bei DSAI, einem persönlichen KI-Chatbot-Projekt. Dieses Repository enthält ein schlankes, modernes Web-Frontend für die Interaktion mit einem KI-Modell über eine sichere Backend-API.

Das Design ist im Dark Mode gehalten und für eine einfache, intuitive Bedienung optimiert.

✨ Wichtige Funktionen
Modernes Interface: Ein sauberes Dark-Mode-Design, erstellt mit Tailwind CSS.

Responsiv: Funktioniert nahtlos auf Desktop- und Mobilgeräten.

Sichere API-Kommunikation: Das Frontend kommuniziert mit einem eigenen Backend-Endpunkt (/api/chat), sodass keine API-Schlüssel im Browser preisgegeben werden.

Echtzeit-Interaktion: "AI is thinking..."-Anzeige während der Wartezeit auf eine Antwort.

Fehlerbehandlung: Zeigt dem Benutzer Feedback an, wenn die API-Anfrage fehlschlägt.

💻 Verwendete Technologien
Dieses Projekt ist in zwei Hauptteile gegliedert:

Frontend (Client-Seite)
HTML5: Für die Grundstruktur der Seite.

Tailwind CSS: Für das schnelle und responsive Styling.

Vanilla JavaScript: Für die gesamte Client-Logik, das Senden von Anfragen und die Aktualisierung des DOM.

Backend (Server-Seite)
Serverless-Funktion: (z.B. Vercel oder Netlify Functions) Der Code im /api-Verzeichnis (nicht in diesem Frontend-Code enthalten, aber vom JS erwartet) dient als Brücke zwischen dem Frontend und der eigentlichen KI-API (z.B. OpenAI).

Node.js: Die wahrscheinliche Laufzeitumgebung für die Serverless-Funktion.

🚀 Einrichtung und Start
Um dieses Projekt lokal auszuführen, benötigen Sie eine Serverumgebung, die die Serverless-Funktion unter dem Pfad /api/chat ausführen kann. Die Vercel CLI ist hierfür ideal.

Voraussetzungen
Node.js (für die Vercel CLI)

Vercel CLI: npm install -g vercel

Ein API-Schlüssel von einem KI-Anbieter (z.B. OpenAI)

Lokale Entwicklung
Repository klonen:

Bash

git clone https://github.com/DEIN-BENUTZERNAME/DEIN-REPO.git
cd DEIN-REPO
Backend einrichten:

Erstellen Sie ein Verzeichnis namens api.

Erstellen Sie darin eine Datei namens chat.js (oder chat.ts).

Hinweis: Der Backend-Code zum Aufrufen der KI-API muss separat implementiert werden. Das Frontend erwartet, dass es eine POST-Anfrage an /api/chat senden kann.

API-Schlüssel speichern:

Erstellen Sie eine Datei namens .env im Stammverzeichnis.

Fügen Sie Ihren geheimen API-Schlüssel hinzu (das Backend muss darauf zugreifen):

OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxx
Lokalen Server starten:

Führen Sie den Vercel-Entwicklungsserver aus:

Bash

vercel dev
Projekt öffnen:

Öffnen Sie die angezeigte URL (normalerweise http://localhost:3000) in Ihrem Browser.

Deployment
Dieses Projekt ist für ein einfaches Deployment auf Plattformen wie Vercel oder Netlify optimiert, da diese Serverless-Funktionen (im api-Ordner) nativ unterstützen.

Pushen Sie Ihr Repository zu GitHub/GitLab.

Verbinden Sie Ihr Repository mit Vercel.

Fügen Sie Ihre API-Schlüssel als "Environment Variables" in den Projekteinstellungen der Hosting-Plattform hinzu.

Starten Sie das Deployment.
