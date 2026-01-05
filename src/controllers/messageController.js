const facebookService = require('../services/facebookService');

class MessageController {
  
  // Envoyer un message manuellement (pour admin)
  async sendMessage(req, res) {
    try {
      const { recipientId, message } = req.body;
      
      // Validation
      if (!recipientId || !message) {
        return res.status(400).json({
          error: 'Paramètres manquants',
          required: ['recipientId', 'message']
        });
      }
      
      if (typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({
          error: 'Message invalide'
        });
      }
      
      // Envoyer le message
      const result = await facebookService.sendMessage(recipientId, message);
      
      res.json({
        success: true,
        messageId: result.message_id,
        recipientId,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Erreur envoi message:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
  
  // Envoyer un message de bienvenue (pour web)
  async sendWelcome(req, res) {
    try {
      const { recipientId, language = 'FR' } = req.body;
      
      if (!recipientId) {
        return res.status(400).json({
          error: 'recipientId est requis'
        });
      }
      
      // Déterminer le message de bienvenue
      let welcomeMessage;
      if (language === 'MG') {
        welcomeMessage = `🤖 **Tongasoa eto amin'i Scriptura!**
        
Ianao dia mpanampy ara-Baiboly miorina amin'ny teolojia reformista protestanta.

**Ahoana no ahafahako manampy anao?**
• Mahatakatra andinin-teny ara-Baiboly
• Mandinika toe-javatra araka ny Baiboly
• Mianatra ny fotopampianarana reformista
• Mahita loharanom-pahalalana

**Ny fetrako:**
⚠️ Tsy manome faminaniana manokana aho
⚠️ Tsy misolo toerana ny mpitory
⚠️ Tsy manome toro-hevitra ara-pitsaboana

**Andehano ny fanontanianao na safidio etsy ambany:**`;
      } else {
        welcomeMessage = `🤖 **Bienvenue sur Scriptura !**
        
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

**Posez votre question ou choisissez ci-dessous:**`;
      }
      
      // Envoyer avec réponses rapides
      const quickReplies = language === 'MG' 
        ? [
            { title: '🙏 Fangatahana vavaka', payload: 'PRAYER_REQUEST' },
            { title: '📖 Fandinihana Baiboly', payload: 'BIBLE_STUDY' },
            { title: '❓ Fanontaniana momba ny foto-pinoana', payload: 'DOCTRINE_HELP' },
            { title: '🏠 Mitady fiangonana', payload: 'FIND_CHURCH' }
          ]
        : [
            { title: '🙏 Demande de prière', payload: 'PRAYER_REQUEST' },
            { title: '📖 Étude biblique', payload: 'BIBLE_STUDY' },
            { title: '❓ Question doctrinale', payload: 'DOCTRINE_HELP' },
            { title: '🏠 Trouver une église', payload: 'FIND_CHURCH' }
          ];
      
      await facebookService.sendQuickReplies(recipientId, welcomeMessage, quickReplies);
      
      res.json({
        success: true,
        message: 'Message de bienvenue envoyé',
        language,
        recipientId
      });
      
    } catch (error) {
      console.error('❌ Erreur message bienvenue:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  // Vérifier l'état du service
  async getStatus(req, res) {
    try {
      // Vérifier la connexion Facebook
      const facebookStatus = await facebookService.checkStatus();
      
      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        services: {
          facebook: facebookStatus,
          groq: process.env.GROQ_API_KEY ? 'configured' : 'missing_key',
          server: 'running',
          environment: process.env.NODE_ENV
        },
        statistics: {
          cacheSize: 0, // À implémenter avec cacheService
          uptime: process.uptime()
        }
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new MessageController();