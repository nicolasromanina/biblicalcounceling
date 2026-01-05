require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const cors = require('cors');
const crypto = require('crypto');

// Initialiser l'app Express
const app = express();

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(cors());
app.use(bodyParser.json({ 
  verify: verifyRequestSignature,
  limit: '10mb' 
}));
app.use(bodyParser.urlencoded({ extended: true }));

// Variables globales
const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN;

// Vérification signature Facebook
function verifyRequestSignature(req, res, buf) {
  const signature = req.headers["x-hub-signature-256"];
  
  if (!signature) {
    if (process.env.NODE_ENV === 'development') {
      console.warn("Signature non trouvée - mode développement");
    }
    return;
  }
  
  const elements = signature.split('=');
  const signatureHash = elements[1];
  const expectedHash = crypto
    .createHmac('sha256', process.env.FACEBOOK_APP_SECRET || '')
    .update(buf)
    .digest('hex');
  
  if (signatureHash !== expectedHash) {
    throw new Error("Signature Facebook invalide");
  }
}

// Importer les contrôleurs
const webhookController = require('./controllers/webhookController');
const messageController = require('./controllers/messageController');

// Routes API
app.get('/webhook', webhookController.verifyWebhook);
app.post('/webhook', webhookController.handleWebhook);
app.post('/send-message', messageController.sendMessage);
app.get('/health', require('./health'));

// Route d'accueil
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/../public/index.html');
});

// Route pour vérifier l'API
app.get('/api/status', (req, res) => {
  res.json({
    status: 'active',
    service: 'Scriptura Biblical Chatbot',
    version: '1.0.0',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    features: ['facebook-messenger', 'biblical-counseling', 'multilingual'],
    languages: ['FR', 'MG'],
    theology: 'Reformed Protestant'
  });
});

// Gestion des erreurs 404
app.use((req, res) => {
  res.status(404).json({
    error: 'Route non trouvée',
    message: 'Cette route n\'existe pas. Consultez /api/status pour les routes disponibles.'
  });
});

// Gestion des erreurs globales
app.use((err, req, res, next) => {
  console.error('Erreur globale:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method
  });
  
  res.status(err.status || 500).json({
    error: 'Erreur interne du serveur',
    message: process.env.NODE_ENV === 'production' 
      ? 'Une erreur est survenue. Veuillez réessayer.' 
      : err.message,
    requestId: req.id
  });
});

// Exporter pour Vercel Serverless
module.exports = app;

// Si exécuté localement (pas sur Vercel)
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🤖 Scriptura Bot démarré sur le port ${PORT}`);
    console.log(`🌐 Environnement: ${process.env.NODE_ENV}`);
    console.log(`📖 Version: 1.0.0`);
    console.log(`🎯 Théologie: Réformée protestante`);
    console.log(`🗣️ Langues: FR, MG`);
  });
}