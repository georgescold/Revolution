# Révolution 🦠

> **"Détends toi, ton contenu explose déjà"**

**Révolution** est une application SaaS premium conçue pour créer des carrousels TikTok/Instagram viraux en exploitant vos données statistiques et une IA avancée (Claude 3.5 Sonnet).

## 🌟 Fonctionnalités Clés

- **Authentification & Onboarding** : Profilage du créateur (Persona, Objectifs).
- **Collections Intelligentes** : Upload d'images analysées par Vision AI (Description, Mood, Keywords).
- **Analyse Statistique** : Dashboard de performance, calcul d'engagement et suggestions ML basiques.
- **Studio de Création** :
  - Génération de Hooks viraux (basés sur vos stats).
  - Rédaction de Slides (Scripting).
  - Matching intelligent Images <-> Slides (sans répétition).
- **Design Premium** : UI "TikTok-like" (Dark mode, Néon, Glassmorphism).

## 🛠 Tech Stack

- **Framework** : Next.js 15+ (App Router)
- **Langage** : TypeScript
- **Style** : Tailwind CSS v4 + shadcn/ui
- **Base de données** : SQLite (Dev) / PostgreSQL (Prod) via Prisma ORM
- **IA** : Anthropic Claude 3.5 Sonnet (via SDK)
- **Auth** : NextAuth.js (v5 Beta)

## 🚀 Installation & Démarrage

### Pré-requis
- Node.js 18+
- Une clé API Anthropic (`sk-...`)

### 1. Cloner et Installer
```bash
git clone <repo>
cd viralithe
npm install
```

### 2. Configuration (.env)
Créez un file `.env` à la racine :
```env
# Database (Local SQLite)
DATABASE_URL="file:./dev.db"

# Auth (NextAuth)
AUTH_SECRET="une-chaine-aleatoire-securisee"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# AI (Anthropic)
ANTHROPIC_API_KEY="sk-ant-..."
ANTHROPIC_MODEL="claude-3-5-sonnet-latest"
```

### 3. Base de Données
Initialisez la base de données SQLite :
```bash
npx prisma migrate dev --name init
```

### 4. Lancer le serveur
```bash
npm run dev
```
Rendez-vous sur [http://localhost:3000](http://localhost:3000).

## 📂 Structure du Projet

```
/app
  /(auth)      # Pages de Login/Register
  /dashboard   # Application principale (Tabs Analysis, Collections, Creation)
  /api         # Routes API (Auth)
/components
  /ui          # Composants Shadcn (Button, Card, etc.)
  /auth        # Formulaires
  /analytics   # Tableaux et Graphiques
  /collections # Upload et Grille
  /creation    # Wizard de génération
/lib
  /ai          # Client Claude & Prompts
  auth.ts      # Config NextAuth
  prisma.ts    # Client DB
/server
  /actions     # Server Actions (Backend Logic)
```

## 🧠 Modèle de Données (Prisma)

- **User** : Compte utilisateur.
- **Profile** : Données TikTok (Bio, Persona).
- **Post** : Carrousels générés et leurs stats.
- **Image** : Bibliothèque d'assets avec métadonnées IA.
- **Metrics** : Vues, Likes, Saves pour le ML.

---
**Note** : L'application utilise `turbopack` par défaut avec Next.js 15/16. Si vous rencontrez des erreurs de build sur Windows liées aux symlinks, utilisez `npm run dev` pour le développement.
