require('dotenv').config();
const express = require('express');
const path = require('path');

// Initialiser l'app Express
const app = express();

// Middleware de base
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Importer les contrôleurs
const webhookController = require('./controllers/webhookController');
const messageController = require('./controllers/messageController');

// ============================================
// ROUTES PUBLIQUES (pas de vérification Facebook)
// ============================================

// Route d'accueil
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Route santé
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Scriptura Biblical Chatbot',
    version: '1.0.0',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    features: ['facebook-messenger', 'biblical-counseling', 'multilingual'],
    languages: ['FR', 'MG'],
    theology: 'Reformed Protestant'
  });
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

// Route pour tester Groq
app.post('/test-groq', async (req, res) => {
  try {
    const { question } = req.body;
    
    if (!question || question.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Veuillez fournir une question'
      });
    }
    
    console.log(`🧪 Test Groq: "${question.substring(0, 50)}..."`);
    
    const groqService = require('./services/groqService');
    const response = await groqService.generateBiblicalResponse(question);
    
    res.json({
      success: true,
      question,
      response,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erreur test Groq:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la génération de la réponse',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString()
    });
  }
});

// Route pour envoyer des messages manuellement
app.post('/send-message', messageController.sendMessage);

// ============================================
// ROUTES FACEBOOK WEBHOOK (avec vérification)
// ============================================

// Middleware de vérification Facebook UNIQUEMENT pour /webhook
const crypto = require('crypto');
function verifyFacebookSignature(req, res, buf) {
  // Vérifier que c'est une requête Facebook
  const signature = req.headers['x-hub-signature-256'];
  
  if (!signature) {
    console.warn('⚠️ Signature Facebook manquante pour webhook');
    throw new Error('Signature Facebook requise');
  }
  
  const elements = signature.split('=');
  const signatureHash = elements[1];
  
  // Utiliser FACEBOOK_APP_SECRET pour vérifier
  const expectedHash = crypto
    .createHmac('sha256', process.env.FACEBOOK_APP_SECRET || '')
    .update(buf)
    .digest('hex');
  
  if (signatureHash !== expectedHash) {
    console.error('❌ Signature Facebook invalide');
    throw new Error('Signature Facebook invalide');
  }
  
  console.log('✅ Signature Facebook vérifiée');
}

// Appliquer la vérification UNIQUEMENT aux webhooks
app.use('/webhook', (req, res, next) => {
  const originalSend = res.send;
  const originalJson = res.json;
  const originalStatus = res.status;
  
  // Buffer pour stocker le body
  let bodyBuffer = null;
  
  // Intercepter pour vérifier la signature
  const oldWrite = res.write;
  const oldEnd = res.end;
  const chunks = [];
  
  res.write = function(chunk) {
    chunks.push(chunk);
    return oldWrite.apply(res, arguments);
  };
  
  res.end = function(chunk) {
    if (chunk) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString();
    console.log('📤 Réponse webhook:', body.substring(0, 100));
    return oldEnd.apply(res, arguments);
  };
  
  // Vérifier la signature pour POST uniquement
  if (req.method === 'POST') {
    const rawBody = [];
    
    req.on('data', (chunk) => {
      rawBody.push(chunk);
    });
    
    req.on('end', () => {
      try {
        const body = Buffer.concat(rawBody);
        verifyFacebookSignature(req, res, body);
        req.body = JSON.parse(body.toString());
        next();
      } catch (error) {
        console.error('❌ Erreur vérification signature:', error.message);
        res.status(403).send('Forbidden - Signature invalide');
      }
    });
    
    req.on('error', (error) => {
      console.error('❌ Erreur lecture body:', error);
      res.status(500).send('Internal Server Error');
    });
  } else {
    // Pour GET (vérification webhook), pas de vérification de signature
    next();
  }
});

// Routes webhook Facebook
app.get('/webhook', webhookController.verifyWebhook);
app.post('/webhook', webhookController.handleWebhook);

// ============================================
// GESTION DES ERREURS
// ============================================

// Route 404
app.use((req, res) => {
  res.status(404).json({
    error: 'Route non trouvée',
    message: `La route ${req.url} n'existe pas`,
    availableRoutes: ['/', '/health', '/api/status', '/test-groq', '/webhook'],
    timestamp: new Date().toISOString()
  });
});

// Gestionnaire d'erreurs global
app.use((err, req, res, next) => {
  console.error('❌ Erreur globale:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });
  
  // Ne pas envoyer "Forbidden" pour les erreurs de signature
  // (déjà géré dans le middleware webhook)
  if (!req.url.includes('/webhook')) {
    res.status(500).json({
      error: 'Erreur interne du serveur',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Une erreur est survenue',
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================
// DÉMARRAGE DU SERVEUR
// ============================================

// Exporter pour Vercel
module.exports = app;

// Démarrer en local si exécuté directement
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🤖 Scriptura Bot démarré sur le port ${PORT}`);
    console.log(`🌐 Environnement: ${process.env.NODE_ENV}`);
    console.log(`📖 Version: 1.0.0`);
    console.log(`🎯 Théologie: Réformée protestante`);
    console.log(`🗣️ Langues: FR, MG`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`🧪 Test Groq: POST http://localhost:${PORT}/test-groq`);
    console.log(`🏠 Accueil: http://localhost:${PORT}/`);
    console.log(`📱 Webhook Facebook: GET/POST http://localhost:${PORT}/webhook`);
  });
}