const crypto = require('crypto');
const axios = require('axios');
const { FACEBOOK } = require('../config/constants');

class WebhookService {
  constructor() {
    this.pageAccessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
    this.appSecret = process.env.FACEBOOK_APP_SECRET;
    this.apiVersion = 'v18.0';
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
    
    if (!this.pageAccessToken) {
      console.warn('⚠️ FACEBOOK_PAGE_ACCESS_TOKEN non configurée');
    }
  }
  
  // Vérifier la signature du webhook
  verifySignature(req, bodyBuffer) {
    if (!this.appSecret) {
      console.warn('⚠️ FACEBOOK_APP_SECRET non configurée - signature non vérifiée');
      return true;
    }
    
    const signature = req.headers['x-hub-signature-256'];
    if (!signature) {
      console.warn('⚠️ Signature Facebook manquante');
      return false;
    }
    
    const elements = signature.split('=');
    const signatureHash = elements[1];
    
    const expectedHash = crypto
      .createHmac('sha256', this.appSecret)
      .update(bodyBuffer)
      .digest('hex');
    
    if (signatureHash !== expectedHash) {
      console.error('❌ Signature Facebook invalide');
      return false;
    }
    
    return true;
  }
  
  // Vérifier le token de vérification
  verifyToken(req) {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    
    if (mode && token) {
      if (mode === 'subscribe' && token === process.env.FACEBOOK_VERIFY_TOKEN) {
        console.log('✅ Webhook vérifié');
        return challenge;
      } else {
        console.error('❌ Token de vérification invalide');
        return null;
      }
    }
    
    return null;
  }
  
  // Parser le corps du webhook
  parseWebhook(body) {
    try {
      if (!body || body.object !== 'page') {
        throw new Error('Format de webhook invalide');
      }
      
      const entries = body.entry || [];
      const events = [];
      
      entries.forEach(entry => {
        const pageId = entry.id;
        const time = entry.time;
        
        const messagingEvents = entry.messaging || [];
        
        messagingEvents.forEach(event => {
          const normalizedEvent = this.normalizeEvent(event, pageId, time);
          if (normalizedEvent) {
            events.push(normalizedEvent);
          }
        });
      });
      
      return events;
      
    } catch (error) {
      console.error('❌ Erreur parsing webhook:', error);
      return [];
    }
  }
  
  // Normaliser un événement
  normalizeEvent(event, pageId, time) {
    const sender = event.sender;
    const recipient = event.recipient;
    
    if (!sender || !sender.id) {
      console.warn('⚠️ Événement sans expéditeur');
      return null;
    }
    
    const baseEvent = {
      senderId: sender.id,
      recipientId: recipient.id,
      pageId,
      timestamp: time || Date.now(),
      type: this.getEventType(event)
    };
    
    // Ajouter les données spécifiques
    if (event.message) {
      baseEvent.message = this.normalizeMessage(event.message);
      baseEvent.isEcho = event.message.is_echo || false;
    }
    
    if (event.postback) {
      baseEvent.postback = event.postback;
    }
    
    if (event.referral) {
      baseEvent.referral = event.referral;
    }
    
    if (event.read) {
      baseEvent.read = event.read;
    }
    
    if (event.delivery) {
      baseEvent.delivery = event.delivery;
    }
    
    return baseEvent;
  }
  
  // Normaliser un message
  normalizeMessage(message) {
    const normalized = {
      mid: message.mid,
      text: message.text || '',
      timestamp: message.timestamp || Date.now()
    };
    
    // Gérer les attachments
    if (message.attachments) {
      normalized.attachments = message.attachments.map(att => ({
        type: att.type,
        payload: att.payload
      }));
    }
    
    // Gérer les quick replies
    if (message.quick_reply) {
      normalized.quickReply = {
        payload: message.quick_reply.payload
      };
    }
    
    // Gérer les replies
    if (message.reply_to) {
      normalized.replyTo = {
        mid: message.reply_to.mid
      };
    }
    
    return normalized;
  }
  
  // Obtenir le type d'événement
  getEventType(event) {
    if (event.message) {
      if (event.message.is_echo) return 'message_echo';
      if (event.message.quick_reply) return 'quick_reply';
      return 'message';
    }
    if (event.postback) return 'postback';
    if (event.referral) return 'referral';
    if (event.read) return 'read';
    if (event.delivery) return 'delivery';
    if (event.optin) return 'optin';
    if (event.account_linking) return 'account_linking';
    
    return 'unknown';
  }
  
  // Envoyer un message
  async sendMessage(recipientId, messageText, options = {}) {
    try {
      if (!this.pageAccessToken) {
        throw new Error('Token Facebook non configuré');
      }
      
      const payload = {
        recipient: { id: recipientId },
        message: { text: messageText },
        messaging_type: options.messagingType || FACEBOOK.MESSAGING_TYPES.RESPONSE
      };
      
      if (options.notificationType) {
        payload.notification_type = options.notificationType;
      }
      
      if (options.tag) {
        payload.tag = options.tag;
        payload.messaging_type = FACEBOOK.MESSAGING_TYPES.MESSAGE_TAG;
      }
      
      const response = await axios.post(
        `${this.baseUrl}/me/messages`,
        payload,
        {
          params: { access_token: this.pageAccessToken },
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        }
      );
      
      console.log('✅ Message envoyé:', {
        to: recipientId.substring(0, 10) + '...',
        messageId: response.data.message_id
      });
      
      return {
        success: true,
        messageId: response.data.message_id,
        recipientId,
        timestamp: response.data.timestamp
      };
      
    } catch (error) {
      console.error('❌ Erreur envoi message:', {
        recipientId: recipientId.substring(0, 10) + '...',
        error: error.response?.data?.error?.message || error.message,
        status: error.response?.status
      });
      
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
        code: error.response?.status
      };
    }
  }
  
  // Envoyer l'action "typing"
  async sendTypingAction(recipientId, action) {
    try {
      await axios.post(
        `${this.baseUrl}/me/messages`,
        {
          recipient: { id: recipientId },
          sender_action: action
        },
        {
          params: { access_token: this.pageAccessToken },
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000
        }
      );
      
      console.log(`✅ Action ${action} envoyée à: ${recipientId.substring(0, 10)}...`);
      
    } catch (error) {
      console.warn(`⚠️ Erreur action ${action}:`, error.message);
    }
  }
  
  // Envoyer des réponses rapides
  async sendQuickReplies(recipientId, messageText, quickReplies) {
    try {
      const payload = {
        recipient: { id: recipientId },
        message: {
          text: messageText.substring(0, 640), // Facebook limite
          quick_replies: quickReplies.map(reply => ({
            content_type: 'text',
            title: reply.title.substring(0, 20), // Limite Facebook
            payload: reply.payload.substring(0, 1000),
            image_url: reply.imageUrl || undefined
          }))
        }
      };
      
      const response = await axios.post(
        `${this.baseUrl}/me/messages`,
        payload,
        {
          params: { access_token: this.pageAccessToken },
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        }
      );
      
      console.log('✅ Quick replies envoyés:', {
        to: recipientId.substring(0, 10) + '...',
        count: quickReplies.length
      });
      
      return response.data;
      
    } catch (error) {
      console.error('❌ Erreur quick replies:', error.response?.data?.error || error.message);
      throw error;
    }
  }
  
  // Envoyer un template de boutons
  async sendButtonTemplate(recipientId, text, buttons) {
    try {
      const payload = {
        recipient: { id: recipientId },
        message: {
          attachment: {
            type: 'template',
            payload: {
              template_type: 'button',
              text: text.substring(0, 640),
              buttons: buttons.map(button => ({
                type: button.type || 'postback',
                title: button.title.substring(0, 20),
                payload: button.payload,
                url: button.url,
                webview_height_ratio: button.webviewHeightRatio || 'full'
              }))
            }
          }
        }
      };
      
      const response = await axios.post(
        `${this.baseUrl}/me/messages`,
        payload,
        {
          params: { access_token: this.pageAccessToken },
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        }
      );
      
      return response.data;
      
    } catch (error) {
      console.error('❌ Erreur button template:', error.message);
      throw error;
    }
  }
  
  // Obtenir le profil utilisateur
  async getUserProfile(userId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${userId}`,
        {
          params: {
            fields: 'first_name,last_name,profile_pic,locale,timezone,gender',
            access_token: this.pageAccessToken
          },
          timeout: 5000
        }
      );
      
      return {
        success: true,
        profile: response.data
      };
      
    } catch (error) {
      console.warn('⚠️ Erreur profil utilisateur:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Configurer le menu persistent
  async setupPersistentMenu() {
    try {
      const menus = [
        {
          locale: 'default',
          composer_input_disabled: false,
          call_to_actions: [
            {
              type: 'postback',
              title: '📖 Menu Principal',
              payload: 'GET_STARTED'
            },
            {
              type: 'postback',
              title: '🙏 Demande de Prière',
              payload: 'PRAYER_REQUEST'
            },
            {
              type: 'web_url',
              title: '📍 Trouver Église',
              url: 'https://www.google.com/maps/search/église+réformée',
              webview_height_ratio: 'tall'
            }
          ]
        }
      ];
      
      const response = await axios.post(
        `${this.baseUrl}/me/messenger_profile`,
        {
          persistent_menu: menus
        },
        {
          params: { access_token: this.pageAccessToken },
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      console.log('✅ Menu persistent configuré');
      return response.data;
      
    } catch (error) {
      console.error('❌ Erreur menu persistent:', error.response?.data || error.message);
      throw error;
    }
  }
  
  // Configurer le bouton Get Started
  async setupGetStarted() {
    try {
      const response = await axios.post(
        `${this.baseUrl}/me/messenger_profile`,
        {
          get_started: {
            payload: 'GET_STARTED'
          }
        },
        {
          params: { access_token: this.pageAccessToken },
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      console.log('✅ Get Started configuré');
      return response.data;
      
    } catch (error) {
      console.error('❌ Erreur Get Started:', error.message);
      throw error;
    }
  }
  
  // Configurer la page d'accueil
  async setupHomePage() {
    try {
      const response = await axios.post(
        `${this.baseUrl}/me/messenger_profile`,
        {
          home_url: {
            url: process.env.VERCEL_URL || 'https://votre-projet.vercel.app',
            webview_height_ratio: 'tall',
            in_test: process.env.NODE_ENV !== 'production'
          }
        },
        {
          params: { access_token: this.pageAccessToken },
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      console.log('✅ Home page configurée');
      return response.data;
      
    } catch (error) {
      console.error('❌ Erreur home page:', error.message);
      throw error;
    }
  }
  
  // Configurer les domaines whitelistés
  async whitelistDomains(domains) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/me/messenger_profile`,
        {
          whitelisted_domains: domains
        },
        {
          params: { access_token: this.pageAccessToken },
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      console.log('✅ Domaines whitelistés:', domains);
      return response.data;
      
    } catch (error) {
      console.error('❌ Erreur whitelist domains:', error.message);
      throw error;
    }
  }
  
  // Vérifier l'état de la connexion
  async checkConnection() {
    try {
      const response = await axios.get(
        `${this.baseUrl}/me`,
        {
          params: { 
            fields: 'id,name',
            access_token: this.pageAccessToken 
          },
          timeout: 5000
        }
      );
      
      return {
        connected: true,
        pageId: response.data.id,
        pageName: response.data.name,
        status: 'active'
      };
      
    } catch (error) {
      console.error('❌ Facebook non connecté:', error.message);
      return {
        connected: false,
        error: error.message,
        status: 'inactive'
      };
    }
  }
  
  // Envoyer un message à plusieurs utilisateurs
  async broadcastMessage(userIds, message, options = {}) {
    const results = [];
    
    for (const userId of userIds) {
      try {
        const result = await this.sendMessage(userId, message, options);
        results.push({
          userId,
          success: result.success,
          messageId: result.messageId,
          error: result.error
        });
        
        // Petite pause entre les messages
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        results.push({
          userId,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }
}

module.exports = new WebhookService();