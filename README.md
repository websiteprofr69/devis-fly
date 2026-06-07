# DevisPro — Générateur de Devis Intelligent

## Stack
- **Backend** : Node.js + Express + SQLite (better-sqlite3)
- **IA** : Anthropic Claude (claude-sonnet-4-20250514)
- **Frontend** : HTML + Tailwind CSS + Vanilla JS

## Installation

```bash
cd backend
cp .env.example .env
# Renseignez ANTHROPIC_API_KEY et JWT_SECRET dans .env
mkdir -p data
npm install
npm run dev
```

Ouvrez `frontend/index.html` dans votre navigateur (ou via Live Server).

## Accès Admin
- URL : `frontend/login.html`
- Email : `admin@devispro.fr`
- Mot de passe : `Admin1234!`

## Structure
```
devis-pro/
├── backend/
│   ├── data/              ← Base SQLite (auto-créée)
│   ├── src/
│   │   ├── config/database.js
│   │   ├── controllers/   ← aiController, authController, quoteController, pricingController
│   │   ├── middleware/    ← authMiddleware, errorHandler
│   │   ├── routes/        ← ai, auth, quote, pricing
│   │   └── app.js
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── index.html         ← Générateur IA + formulaire
    ├── login.html         ← Connexion admin
    ├── admin.html         ← Backoffice
    └── assets/app.js
```
