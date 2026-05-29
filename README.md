# Scriptura — Chatbot biblique pour Messenger

![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat&logo=express&logoColor=white)
![Groq](https://img.shields.io/badge/LLM-Groq_(Llama_3.3)-F55036?style=flat)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?style=flat&logo=vercel&logoColor=white)

Chatbot Facebook Messenger d'enseignement biblique et d'accompagnement pastoral,
ancré dans la théologie réformée protestante. Les réponses sont générées par un
grand modèle de langage (Groq / Llama 3.3) encadré par un prompt doctrinal et une
couche de validation, avec détection automatique de la langue (français / malagasy).

## Fonctionnalités

- **Réponses contextuelles** via l'API Groq (modèle `llama-3.3-70b-versatile`)
- **Cadre doctrinal** réformé (Sola Scriptura, TULIP) appliqué au prompt système
- **Bilingue** français / malagasy avec détection automatique de la langue
- **Réponses rapides** Messenger (étude biblique, demande de prière, doctrine, etc.)
- **Robustesse** : cache en mémoire, limitation de débit (rate limiting), validation des entrées/sorties
- **Webhook sécurisé** avec vérification de la signature Facebook

## Architecture

```
src/
├── index.js                  # Point d'entrée Express + sécurité (helmet, signature)
├── config/constants.js       # Constantes (théologie, modèles Groq, langues, limites)
├── controllers/              # webhookController, messageController
├── services/                 # facebookService, groqService, cacheService, languageDetector
├── prompts/biblicalPrompt.js # Prompt système doctrinal
└── utils/                    # rateLimiter, validators, formatters
```

## Stack technique

- **Runtime** : Node.js (>= 18)
- **Serveur** : Express, helmet, cors, body-parser
- **LLM** : API Groq (Llama 3.3 70B)
- **Cache** : node-cache
- **Déploiement** : Vercel (fonctions serverless)

## Variables d'environnement

Créez un fichier `.env` à la racine :

```env
FACEBOOK_PAGE_ACCESS_TOKEN=...   # Jeton d'accès de la page Facebook
FACEBOOK_VERIFY_TOKEN=...        # Jeton de vérification du webhook (au choix)
FACEBOOK_APP_SECRET=...          # Secret de l'application (vérification de signature)
GROQ_API_KEY=...                 # Clé API Groq
PORT=3000                        # Optionnel (défaut : 3000)
```

> Ne committez jamais le fichier `.env` : il contient des secrets.

## Démarrage local

```bash
git clone https://github.com/nicolasromanina/biblicalcounceling.git
cd biblicalcounceling
npm install
npm run dev      # démarrage avec rechargement (nodemon)
```

## Déploiement sur Vercel

1. Importez le dépôt dans [Vercel](https://vercel.com).
2. Renseignez les variables d'environnement ci-dessus dans les *Project Settings*.
3. Configurez l'URL du webhook (`/webhook`) dans la configuration Messenger de votre application Facebook, avec le même `FACEBOOK_VERIFY_TOKEN`.

## Licence

MIT
