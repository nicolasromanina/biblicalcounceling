const facebookService = require('../services/facebookService');
const groqService = require('../services/groqService');
const cacheService = require('../services/cacheService');
const rateLimiter = require('../utils/rateLimiter');

class WebhookController {
  
  // Vérification du webhook Facebook
  verifyWebhook(req, res) {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    
    console.log('🔍 Vérification webhook:', { mode, token: token ? '***' : 'none' });
    
    if (mode && token) {
      if (mode === 'subscribe' && token === process.env.FACEBOOK_VERIFY_TOKEN) {
        console.log('✅ Webhook vérifié avec succès');
        res.status(200).send(challenge);
      } else {
        console.error('❌ Échec vérification. Token invalide.');
        res.sendStatus(403);
      }
    } else {
      res.sendStatus(400);
    }
  }
  
  // Gestion des webhooks entrants
  async handleWebhook(req, res) {
    try {
      const body = req.body;
      
      console.log('📥 Webhook reçu:', {
        object: body.object,
        entryCount: body.entry?.length || 0
      });
      
      // Vérifier que c'est une page Facebook
      if (body.object !== 'page') {
        console.warn('⚠️ Objet non-page reçu');
        return res.sendStatus(404);
      }
      
      // Répondre IMMÉDIATEMENT à Facebook (requis)
      res.status(200).send('EVENT_RECEIVED');
      
      // Traiter les entrées en arrière-plan
      await this.processEntriesAsync(body.entry);
      
    } catch (error) {
      console.error('❌ Erreur webhook:', error);
      // Ne pas envoyer de réponse ici car déjà fait
    }
  }
  
  // Traitement asynchrone des entrées
  async processEntriesAsync(entries) {
    if (!entries || !Array.isArray(entries)) return;
    
    for (const entry of entries) {
      try {
        const webhookEvent = entry.messaging?.[0];
        if (!webhookEvent) continue;
        
        console.log('📨 Événement:', {
          senderId: webhookEvent.sender?.id?.substring(0, 10) + '...',
          type: this.getEventType(webhookEvent),
          timestamp: new Date(webhookEvent.timestamp).toISOString()
        });
        
        // Traiter selon le type d'événement
        if (webhookEvent.message) {
          await this.handleMessageEvent(webhookEvent);
        } else if (webhookEvent.postback) {
          await this.handlePostbackEvent(webhookEvent);
        } else if (webhookEvent.referral) {
          await this.handleReferralEvent(webhookEvent);
        }
        
      } catch (error) {
        console.error('❌ Erreur traitement entrée:', error);
      }
    }
  }
  
  // Gestion des messages
  async handleMessageEvent(event) {
    const senderId = event.sender.id;
    const message = event.message;
    
    // Vérifier le rate limiting
    if (!rateLimiter.checkLimit(senderId)) {
      await facebookService.sendMessage(senderId, 
        '⚠️ Trop de messages envoyés. Veuillez patienter quelques instants.'
      );
      return;
    }
    
    // Gérer les réponses rapides
    if (message.quick_reply) {
      await this.handleQuickReply(senderId, message.quick_reply.payload);
      return;
    }
    
    // Vérifier le texte du message
    if (!message.text || message.text.trim().length === 0) {
      await facebookService.sendMessage(senderId,
        'Veuillez envoyer un message texte. Je ne peux pas traiter les images ou fichiers audio.'
      );
      return;
    }
    
    const userMessage = message.text.trim();
    
    // Messages spéciaux
    if (userMessage.toLowerCase() === '/start' || userMessage.toLowerCase() === 'menu') {
      await this.sendWelcomeMessage(senderId);
      return;
    }
    
    if (userMessage.toLowerCase() === '/aide' || userMessage.toLowerCase() === '/help') {
      await this.sendHelpMessage(senderId);
      return;
    }
    
    // Activer l'indicateur "typing"
    await facebookService.sendTypingIndicator(senderId, true);
    
    try {
      // Générer la réponse biblique (avec timeout pour Vercel)
      const botResponse = await this.generateBiblicalResponseWithTimeout(
        senderId, 
        userMessage
      );
      
      // Envoyer la réponse
      await facebookService.sendMessage(senderId, botResponse);
      
      // Log de succès
      console.log('✅ Réponse envoyée à:', senderId.substring(0, 10) + '...');
      
    } catch (error) {
      console.error('❌ Erreur génération réponse:', error);
      
      await facebookService.sendMessage(senderId,
        'Désolé, une erreur est survenue. Veuillez réessayer ou contacter un pasteur de votre église locale.'
      );
      
    } finally {
      // Désactiver l'indicateur "typing"
      await facebookService.sendTypingIndicator(senderId, false);
    }
  }
  
  // Générer réponse avec timeout
  async generateBiblicalResponseWithTimeout(senderId, userMessage) {
    return new Promise(async (resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout génération réponse'));
      }, 8000); // 8 secondes max pour Vercel
      
      try {
        // Vérifier le cache d'abord
        const cachedResponse = cacheService.get(userMessage);
        if (cachedResponse) {
          console.log('📦 Réponse servie depuis le cache');
          clearTimeout(timeout);
          resolve(cachedResponse);
          return;
        }
        
        // Générer nouvelle réponse
        const response = await groqService.generateBiblicalResponse(userMessage, {
          senderId,
          timestamp: new Date().toISOString()
        });
        
        // Mettre en cache
        cacheService.set(userMessage, response);
        
        clearTimeout(timeout);
        resolve(response);
        
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }
  
  // Gestion des postbacks (boutons)
  async handlePostbackEvent(event) {
    const senderId = event.sender.id;
    const payload = event.postback.payload;
    
    console.log('🔘 Postback reçu:', { senderId: senderId.substring(0, 10) + '...', payload });
    
    switch (payload) {
      case 'GET_STARTED':
        await this.sendWelcomeMessage(senderId);
        break;
      case 'PRAYER_REQUEST':
        await this.handlePrayerRequest(senderId);
        break;
      case 'BIBLE_STUDY':
        await this.handleBibleStudy(senderId);
        break;
      case 'DOCTRINE_HELP':
        await this.handleDoctrineHelp(senderId);
        break;
      case 'FIND_CHURCH':
        await this.handleFindChurch(senderId);
        break;
      default:
        await facebookService.sendMessage(senderId,
          'Option non reconnue. Tapez "menu" pour voir les options.'
        );
    }
  }
  
  // Gestion des réponses rapides
  async handleQuickReply(senderId, payload) {
    switch (payload) {
      case 'MORE_INFO':
        await facebookService.sendMessage(senderId,
          'Je suis basé sur la théologie réformée protestante (Sola Scriptura). ' +
          'Je peux vous aider à comprendre la Bible et réfléchir bibliquement à votre situation.'
        );
        break;
      case 'CONTACT_PASTOR':
        await facebookService.sendMessage(senderId,
          '**Important**: Je ne remplace pas un pasteur humain.\n\n' +
          'Pour un accompagnement pastoral personnalisé:\n' +
          '1. Contactez votre pasteur local\n' +
          '2. Cherchez une église réformée près de chez vous\n' +
          '3. Pour les urgences, appelez une ligne d\'écoute chrétienne'
        );
        break;
      default:
        await facebookService.sendMessage(senderId,
          'Merci pour votre interaction. Comment puis-je vous aider?'
        );
    }
  }
  
  // Messages de bienvenue
  async sendWelcomeMessage(senderId) {
    const welcomeText = `🤖 **Bienvenue sur Scriptura !**
    
Je suis un assistant biblique basé sur la théologie réformée protestante.

**Comment puis-je vous aider?**
• Comprendre un passage biblique
• Réfléchir à une situation à la lumière de la Bible
• Apprendre les doctrines réformées
• Trouver des ressources pour l'étude

**Mes limites:**
⚠️ Je ne donne pas de prophéties personnelles
⚠️ Je ne remplace pas un pasteur humain
⚠️ Pas de conseils médicaux/psychologiques

Tapez votre question ou choisissez une option ci-dessous:`;
    
    await facebookService.sendQuickReplies(senderId, welcomeText, [
      { title: '🙏 Demande de prière', payload: 'PRAYER_REQUEST' },
      { title: '📖 Étude biblique', payload: 'BIBLE_STUDY' },
      { title: '❓ Question doctrinale', payload: 'DOCTRINE_HELP' },
      { title: '🏠 Trouver une église', payload: 'FIND_CHURCH' }
    ]);
  }
  
  // Gestion demande de prière
  async handlePrayerRequest(senderId) {
    const response = `🙏 **Demande de prière**
    
Je peux vous aider à baser votre prière sur les promesses bibliques.

**Quelques versets pour la prière:**
• Philippiens 4:6-7 - Ne vous inquiétez de rien
• 1 Jean 5:14-15 - La confiance en Dieu
• Matthieu 7:7-8 - Demandez, cherchez, frappez

**Pour partager votre demande:**
Dites-moi simplement ce pour quoi vous voulez prier, et je vous aiderai avec des textes bibliques appropriés.

*(N'oubliez pas de partager aussi avec vos responsables spirituels)*`;
    
    await facebookService.sendMessage(senderId, response);
  }
  
  // Gestion étude biblique
  async handleBibleStudy(senderId) {
    const response = `📖 **Étude biblique**
    
Je peux vous aider à étudier n'importe quel passage biblique (66 livres canoniques seulement).

**Méthode d'étude:**
1. Contexte historique et littéraire
2. Sens du texte (exégèse)
3. Doctrine enseignée
4. Application personnelle

**Suggestions de lecture:**
• Romains 8 - La sécurité du croyant
• Éphésiens 2 - La grâce salvatrice
• Psaume 23 - La provision divine
• Jean 3 - La nouvelle naissance

**Envoyez-moi un passage ou une question!**`;
    
    await facebookService.sendMessage(senderId, response);
  }
  
  // Gestion aide doctrinale
  async handleDoctrineHelp(senderId) {
    const response = `❓ **Doctrines réformées**
    
Je suis basé sur la théologie réformée classique:
• Sola Scriptura - Bible seule
• Sola Gratia - Grâce seule
• Sola Fide - Foi seule
• Solus Christus - Christ seul
• Soli Deo Gloria - À Dieu seul la gloire

**Confessions de foi:**
• Confession de Westminster
• Confession belge
• Catéchisme de Heidelberg

**Doctrines fondamentales:**
1. Souveraineté absolue de Dieu
2. Trinité
3. Dépravation totale
4. Élection inconditionnelle
5. Expiation limitée
6. Grâce irrésistible
7. Persévérance des saints

**Demandez-moi une explication sur une doctrine!**`;
    
    await facebookService.sendMessage(senderId, response);
  }
  
  // Gestion trouver église
  async handleFindChurch(senderId) {
    const response = `🏠 **Trouver une église réformée**
    
**Importance de l'église locale:**
• Hébreux 10:25 - Ne pas abandonner l'assemblée
• Actes 2:42 - La communion fraternelle
• Éphésiens 4:11-16 - L'édification du corps

**Comment trouver:**
1. Cherchez "église réformée" + votre ville
2. Consultez les sites des dénominations:
   • Églises réformées évangéliques
   • Églises presbytériennes
   • Églises baptistes réformées
3. Vérifiez la confession de foi

**Questions à poser:**
• Quelle confession suivent-ils?
• Comment pratiquent-ils les sacrements?
• Quelle est leur vision de la prédication?

*Je vous encourage vivement à vous attacher à une église locale!*`;
    
    await facebookService.sendMessage(senderId, response);
  }
  
  // Gestion message d'aide
  async sendHelpMessage(senderId) {
    const helpText = `🆘 **Aide - Commandes disponibles**
    
**Commandes spéciales:**
• /start ou "menu" - Menu principal
• /aide ou /help - Ce message d'aide
• /langue - Changer la langue

**Comment utiliser Scriptura:**
1. Posez des questions bibliques
2. Demandez des explications doctrinales
3. Partagez vos préoccupations pour une réflexion biblique

**Exemples de questions:**
• "Explique-moi Romains 8:28"
• "Qu'est-ce que la justification par la foi?"
• "Comment pardonner selon la Bible?"
• "Que dit la Bible sur l'angoisse?"

**Support:**
Pour des problèmes techniques, contactez l'administrateur.
Pour des conseils pastoraux, contactez votre église locale.`;
    
    await facebookService.sendMessage(senderId, helpText);
  }
  
  // Gestion des références
  async handleReferralEvent(event) {
    // À implémenter si nécessaire
    console.log('Referral event:', event.referral);
  }
  
  // Obtenir le type d'événement
  getEventType(event) {
    if (event.message) return 'message';
    if (event.postback) return 'postback';
    if (event.referral) return 'referral';
    if (event.read) return 'read';
    if (event.delivery) return 'delivery';
    return 'unknown';
  }
}

module.exports = new WebhookController();