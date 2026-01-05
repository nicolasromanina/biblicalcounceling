const axios = require('axios');
const { FACEBOOK } = require('../config/constants');

class FacebookService {
  constructor() {
    this.pageAccessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
    this.apiVersion = 'v18.0';
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
    
    if (!this.pageAccessToken) {
      console.warn('⚠️ FACEBOOK_PAGE_ACCESS_TOKEN non configurée');
    }
  }
  
  async sendMessage(recipientId, messageText) {
    try {
      if (!this.pageAccessToken) {
        throw new Error('Token Facebook non configuré');
      }
      
      const response = await axios.post(
        `${this.baseUrl}/me/messages`,
        {
          recipient: { id: recipientId },
          message: { text: messageText },
          messaging_type: 'RESPONSE'
        },
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
      
      return response.data;
      
    } catch (error) {
      console.error('❌ Erreur envoi message Facebook:', {
        recipientId: recipientId.substring(0, 10) + '...',
        error: error.response?.data?.error?.message || error.message,
        status: error.response?.status
      });
      
      throw new Error(`Facebook API: ${error.response?.data?.error?.message || error.message}`);
    }
  }
  
  async sendTypingIndicator(recipientId, isTyping) {
    try {
      await axios.post(
        `${this.baseUrl}/me/messages`,
        {
          recipient: { id: recipientId },
          sender_action: isTyping ? 'typing_on' : 'typing_off'
        },
        {
          params: { access_token: this.pageAccessToken },
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000
        }
      );
    } catch (error) {
      console.warn('⚠️ Erreur indicateur typing:', error.message);
    }
  }
  
  async sendQuickReplies(recipientId, messageText, quickReplies) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/me/messages`,
        {
          recipient: { id: recipientId },
          message: {
            text: messageText,
            quick_replies: quickReplies.map(reply => ({
              content_type: 'text',
              title: reply.title.substring(0, 20),
              payload: reply.payload.substring(0, 1000)
            }))
          }
        },
        {
          params: { access_token: this.pageAccessToken },
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        }
      );
      
      return response.data;
      
    } catch (error) {
      console.error('❌ Erreur envoi quick replies:', error.response?.data?.error || error.message);
      throw error;
    }
  }
}

module.exports = new FacebookService();