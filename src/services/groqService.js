const axios = require('axios');
const LanguageDetector = require('./languageDetector');
const { SYSTEM_PROMPT, KEY_VERSES } = require('../prompts/biblicalPrompt');
const { GROQ_MODELS, GROQ_ENDPOINTS } = require('../config/constants');

class GroqService {
  constructor() {
    this.apiKey = process.env.GROQ_API_KEY;
    if (!this.apiKey) {
      console.error('❌ GROQ_API_KEY non configurée dans les variables d\'environnement');
      throw new Error('GROQ_API_KEY manquante');
    }
    
    this.client = axios.create({
      baseURL: GROQ_ENDPOINTS.CHAT_COMPLETIONS,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000 // 15 secondes
    });
    
    console.log('✅ Service Groq initialisé');
  }
  
  // Générer une réponse biblique
  async generateBiblicalResponse(userMessage, context = {}) {
    try {
      console.log(`📥 Génération réponse pour: "${userMessage.substring(0, 50)}..."`);
      
      // Détecter la langue
      const detectedLanguage = LanguageDetector.detect(userMessage);
      console.log(`🌐 Langue détectée: ${detectedLanguage}`);
      
      // Valider la question
      const validation = this.validateQuestion(userMessage);
      if (!validation.isValid) {
        console.warn('⚠️ Question rejetée:', validation.errors);
        return this.getRejectionMessage(validation, detectedLanguage);
      }
      
      // Construire le contexte
      const contextPrompt = this.buildContext(context, detectedLanguage);
      
      // Préparer les messages
      const messages = [
        {
          role: 'system',
          content: SYSTEM_PROMPT + '\n\n' + contextPrompt
        },
        {
          role: 'user',
          content: `${LanguageDetector.getPrefix(detectedLanguage)}${userMessage}`
        }
      ];
      
      // Appeler l'API Groq
      const startTime = Date.now();
      const response = await this.callGroqAPI(messages);
      const duration = Date.now() - startTime;
      
      console.log(`⏱️  Réponse générée en ${duration}ms`);
      
      // Traiter la réponse
      const processedResponse = this.processResponse(response, detectedLanguage, userMessage);
      
      // Ajouter des versets clés si pertinent
      const enrichedResponse = this.enrichWithKeyVerses(processedResponse, userMessage, detectedLanguage);
      
      return enrichedResponse;
      
    } catch (error) {
      console.error('❌ Erreur génération réponse:', {
        message: error.message,
        code: error.code,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
      
      return this.getErrorMessage(error, userMessage);
    }
  }
  
  // Appeler l'API Groq
  async callGroqAPI(messages, retries = 2) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await this.client.post('', {
          model: GROQ_MODELS.MIXTRAL,
          messages: messages,
          temperature: 0.7,
          max_tokens: 800,
          top_p: 0.9,
          stream: false,
          stop: ['###', '---', '***'] // Arrêter sur ces séquences
        });
        
        console.log(`✅ API Groq réussie (tentative ${attempt + 1}/${retries + 1})`);
        return response.data;
        
      } catch (error) {
        console.error(`❌ Tentative ${attempt + 1} échouée:`, {
          status: error.response?.status,
          message: error.response?.data?.error?.message || error.message
        });
        
        if (attempt === retries) {
          throw error;
        }
        
        // Attendre avant de réessayer
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }
  
  // Construire le contexte
  buildContext(context, language) {
    const timestamp = new Date().toLocaleString(language === 'MG' ? 'mg-MG' : 'fr-FR');
    
    let contextPrompt = '';
    
    if (language === 'MG') {
      contextPrompt = `**Fanamarihana ankehitriny:**
• Fotoana: ${timestamp}
• Mpampiasa: ${context.senderId ? context.senderId.substring(0, 8) + '...' : 'vaovao'}
• Karazana: fanontaniana ara-Baiboly

**Torolalana manokana:**
1. Ampiasa ny teny Malagasy tsotra fa azo takarina
2. Raha misy teny ara-teolojika, azafady hazavao amin'ny teny frantsay
3. Aza mampiditra fivavahana hafa na finoana diso
4. Farito ny valiny ho 400-500 teny
5. Avereno amin'ny andinin-teny mifandraika
6. Atomboy ny mpampiasa hianatra bebe kokoa

**Fepetra:**
• Tsy manome faminaniana manokana
• Tsy mitory filazantsaran'ny harena
• Tsy manao fanombanana ara-psikolojika
• Mamporisika ny fifikirana amin'ny fiangonana eo an-toerana`;
      
    } else {
      contextPrompt = `**Contexte actuel:**
• Heure: ${timestamp}
• Utilisateur: ${context.senderId ? context.senderId.substring(0, 8) + '...' : 'nouveau'}
• Type: question biblique

**Instructions spécifiques:**
1. Utilise un langage clair et accessible
2. Explique les termes théologiques si nécessaire
3. Ne mélange pas avec des doctrines non réformées
4. Limite la réponse à 400-500 mots
5. Fais référence aux textes bibliques pertinents
6. Encourage l'utilisateur à approfondir son étude

**Limites:**
• Pas de prophéties personnelles
• Pas d'évangile de prospérité
• Pas de diagnostics psychologiques
• Encourage l'attachement à l'église locale`;
    }
    
    return contextPrompt;
  }
  
  // Traiter la réponse
  processResponse(groqResponse, language, originalQuestion) {
    if (!groqResponse.choices || groqResponse.choices.length === 0) {
      throw new Error('Aucune réponse de l\'API Groq');
    }
    
    let responseText = groqResponse.choices[0].message.content;
    
    // Nettoyer la réponse
    responseText = this.cleanResponse(responseText);
    
    // S'assurer qu'elle est dans la bonne langue
    responseText = this.ensureLanguage(responseText, language, originalQuestion);
    
    // Limiter la longueur pour Messenger
    responseText = this.limitLength(responseText, language);
    
    // Formater pour la lisibilité
    responseText = this.formatForMessenger(responseText);
    
    // Ajouter une conclusion appropriée
    responseText = this.addConclusion(responseText, language);
    
    return responseText;
  }
  
  // Nettoyer la réponse
  cleanResponse(text) {
    // Supprimer les balises HTML/XML
    text = text.replace(/<[^>]*>/g, '');
    
    // Remplacer les guillemets doubles par des guillemets simples
    text = text.replace(/"/g, "'");
    
    // Supprimer les marqueurs de fin indésirables
    text = text.replace(/###.*$/g, '');
    text = text.replace(/\*\*\*.*$/g, '');
    text = text.replace(/---.*$/g, '');
    
    // Supprimer les espaces multiples
    text = text.replace(/\s+/g, ' ');
    
    // Supprimer les sauts de ligne multiples
    text = text.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    return text.trim();
  }
  
  // S'assurer de la bonne langue
  ensureLanguage(text, expectedLanguage, originalQuestion) {
    const detectedTextLanguage = LanguageDetector.detect(text);
    
    if (detectedTextLanguage !== expectedLanguage) {
      console.warn(`⚠️ Langue incohérente: ${detectedTextLanguage} au lieu de ${expectedLanguage}`);
      
      // Si c'est un mélange, essayer de le corriger
      if (expectedLanguage === 'FR' && text.includes('ny ') && text.includes('dia ')) {
        // Probablement du malgache dans une réponse FR
        text = text.replace(/\bny\b/g, 'le/la/les');
        text = text.replace(/\bdia\b/g, 'c\'est');
      } else if (expectedLanguage === 'MG' && text.includes('le ') && text.includes('est ')) {
        // Probablement du français dans une réponse MG
        text = text.replace(/\ble\b/g, 'ny');
        text = text.replace(/\best\b/g, 'dia');
      }
    }
    
    return text;
  }
  
  // Limiter la longueur
  limitLength(text, language) {
    const maxLength = 1900; // Pour Messenger
    
    if (text.length <= maxLength) return text;
    
    // Trouver un bon point de coupure
    const truncated = text.substring(0, maxLength);
    const lastSentence = truncated.lastIndexOf('.');
    const lastParagraph = truncated.lastIndexOf('\n\n');
    const lastQuestion = truncated.lastIndexOf('?');
    
    const cutoff = Math.max(
      lastSentence, 
      lastParagraph, 
      lastQuestion, 
      maxLength - 100
    );
    
    if (cutoff < maxLength * 0.5) {
      // Pas de bon point de coupure, couper simplement
      const continuationText = language === 'MG'
        ? '\n\n[...]\n\n**Fanamarihana:** Nohatsariny ny valiny noho ny fetra. Azonao atao ny manontany fanazavana fanampiny.'
        : '\n\n[...]\n\n**Note:** La réponse a été raccourcie. Vous pouvez demander plus de détails.';
      
      return truncated.substring(0, maxLength - continuationText.length) + continuationText;
    }
    
    return text.substring(0, cutoff) + '...';
  }
  
  // Formater pour Messenger
  formatForMessenger(text) {
    // Améliorer la lisibilité
    const lines = text.split('\n');
    const formattedLines = lines.map(line => {
      // Supprimer les espaces en début/fin de ligne
      line = line.trim();
      
      // Ajouter des sauts de ligne pour les listes
      if (line.match(/^\d+\./) || line.match(/^[-•*]/)) {
        return '\n' + line;
      }
      
      // Pour les titres (texte entre ** **)
      if (line.match(/^\*\*.+\*\*$/)) {
        return '\n' + line + '\n';
      }
      
      return line;
    });
    
    // Rejoindre et supprimer les lignes vides multiples
    let result = formattedLines.join('\n');
    result = result.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    return result;
  }
  
  // Ajouter une conclusion
  addConclusion(text, language) {
    // Vérifier si une conclusion existe déjà
    const hasConclusion = text.includes('Réflexion:') || 
                         text.includes('Fanontaniana:') ||
                         text.includes('Question:') ||
                         text.includes('Conclusion:');
    
    if (hasConclusion) {
      return text;
    }
    
    const conclusions = {
      MG: [
        '\n\n**Fanontaniana ho an\'ny fieritreretana:** Inona no azonao ampiharina amin\'ity fampianarana ity?',
        '\n\n**Soso-kevitra:** Andramo mijery ny tontolon-kevitra manontolo amin\'ny Baiboly.',
        '\n\n**Famporisihana:** Aza adino ny mitady fanohanana eo amin\'ny fiangonana eo an-toerana.'
      ],
      FR: [
        '\n\n**Question de réflexion:** Quelle application personnelle pouvez-vous tirer de cet enseignement?',
        '\n\n**Suggestion:** Essayez de lire le contexte plus large dans votre Bible.',
        '\n\n**Encouragement:** N\'oubliez pas de chercher le soutien de votre église locale.'
      ]
    };
    
    const langConcls = conclusions[language] || conclusions.FR;
    const randomConclusion = langConcls[Math.floor(Math.random() * langConcls.length)];
    
    return text + randomConclusion;
  }
  
  // Enrichir avec des versets clés
  enrichWithKeyVerses(response, question, language) {
    const questionLower = question.toLowerCase();
    
    // Détecter le thème de la question
    let theme = null;
    
    if (questionLower.includes('peur') || questionLower.includes('inquiét') || questionLower.includes('tahotra')) {
      theme = 'COMFORT';
    } else if (questionLower.includes('choix') || questionLower.includes('décision') || questionLower.includes('safidy')) {
      theme = 'GUIDANCE';
    } else if (questionLower.includes('pardon') || questionLower.includes('forgiv') || questionLower.includes('famela')) {
      theme = 'FORGIVENESS';
    } else if (questionLower.includes('épreuve') || questionLower.includes('souffrance') || questionLower.includes('fijaliana')) {
      theme = 'COMFORT';
    } else if (questionLower.includes('foi') || questionLower.includes('finoana') || questionLower.includes('confiance')) {
      theme = 'GUIDANCE';
    }
    
    if (theme && KEY_VERSES[theme]) {
      const verses = KEY_VERSES[theme];
      const randomVerse = verses[Math.floor(Math.random() * verses.length)];
      
      const addition = language === 'MG'
        ? `\n\n**Andininy fanampiny:** ${randomVerse.ref} - "${randomVerse.text}"`
        : `\n\n**Verset supplémentaire:** ${randomVerse.ref} - "${randomVerse.text}"`;
      
      return response + addition;
    }
    
    return response;
  }
  
  // Valider une question
  validateQuestion(question) {
    const lowercaseQuestion = question.toLowerCase().trim();
    const errors = [];
    const warnings = [];
    
    // Vérifier la longueur
    if (lowercaseQuestion.length < 3) {
      errors.push('Question trop courte');
    }
    
    if (lowercaseQuestion.length > 500) {
      warnings.push('Question très longue');
    }
    
    // Détection de contenu problématique
    const problematicPatterns = [
      {
        pattern: /proph[ée]tie.*personnelle|faminaniana.*manokana/i,
        type: 'error',
        code: 'NO_PERSONAL_PROPHECY'
      },
      {
        pattern: /richesses.*b[ée]n[ée]diction|harena.*fahombiazana/i,
        type: 'error',
        code: 'NO_PROSPERITY_GOSPEL'
      },
      {
        pattern: /sauver.*par.*[œo]uvres|famonjena.*amin.*asa/i,
        type: 'error',
        code: 'NO_WORKS_SALVATION'
      },
      {
        pattern: /magie|sorcellerie|occult|majika|mpamosavy/i,
        type: 'error',
        code: 'NO_OCCULT'
      },
      {
        pattern: /apocryph|livre.*rejet[ée]|boky.*apokrifa/i,
        type: 'warning',
        code: 'APOCRYPHAL_REFERENCE'
      },
      {
        pattern: /(?:https?:\/\/|www\.)[^\s]+/i,
        type: 'error',
        code: 'NO_LINKS'
      }
    ];
    
    problematicPatterns.forEach(({ pattern, type, code }) => {
      if (pattern.test(lowercaseQuestion)) {
        if (type === 'error') {
          errors.push(code);
        } else {
          warnings.push(code);
        }
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      hasIssues: errors.length > 0 || warnings.length > 0
    };
  }
  
  // Message de rejet
  getRejectionMessage(validation, language) {
    const errorMessages = {
      MG: {
        NO_PERSONAL_PROPHECY: 'Miala tsiny, fa tsy manome faminaniana manokana aho. Ny Baiboly irery no toriteny ho an\'ny fiainantsika.',
        NO_PROSPERITY_GOSPEL: 'Tsy mitora ny filazantsaran\'ny harena aho. Ao amin\'i Kristy irery ny harena marina.',
        NO_WORKS_SALVATION: 'Ny famonjena dia avy amin\'ny fahasoavana ihany, tsy amin\'ny asa atao. (Efesiana 2:8-9)',
        NO_OCCULT: 'Ireo fanao ireo dia mifanohitra amin\'ny fampianarana ara-Baiboly.',
        NO_LINKS: 'Azafady, aza mandefa rohy. Andehano ny fanontanianao amin\'ny teny.'
      },
      FR: {
        NO_PERSONAL_PROPHECY: 'Désolé, je ne donne pas de prophéties personnelles. La Bible seule est notre guide.',
        NO_PROSPERITY_GOSPEL: 'Je ne prêche pas l\'évangile de prospérité. Les vraies richesses sont en Christ.',
        NO_WORKS_SALVATION: 'Le salut vient par la grâce seule, pas par les œuvres. (Éphésiens 2:8-9)',
        NO_OCCULT: 'Ces pratiques sont contraires à l\'enseignement biblique.',
        NO_LINKS: 'Veuillez ne pas envoyer de liens. Posez votre question en texte.'
      }
    };
    
    const langMessages = errorMessages[language] || errorMessages.FR;
    const firstError = validation.errors[0];
    
    if (firstError && langMessages[firstError]) {
      return langMessages[firstError];
    }
    
    // Message par défaut
    return language === 'MG'
      ? 'Miala tsiny, tsy azoko atao ny mamaly io fanontaniana io. Andramo fanontaniana hafa azafady.'
      : 'Désolé, je ne peux pas répondre à cette question. Essayez avec une autre question.';
  }
  
  // Message d'erreur
  getErrorMessage(error, originalQuestion) {
    const language = LanguageDetector.detect(originalQuestion);
    
    if (error.response) {
      const status = error.response.status;
      
      if (status === 401 || status === 403) {
        return language === 'MG'
          ? 'Olana amin\'ny fanamarinana. Miala tsiny, tsy afaka mamaly ankehitriny.'
          : 'Problème d\'authentification. Désolé, je ne peux pas répondre pour l\'instant.';
      } else if (status === 429) {
        return language === 'MG'
          ? 'Tafahoatra ny fangatahana. Andramo indray afaka minitra vitsivitsy.'
          : 'Trop de requêtes. Veuillez réessayer dans quelques minutes.';
      } else if (status >= 500) {
        return language === 'MG'
          ? 'Olana amin\'ny server. Andramo indray azafady.'
          : 'Problème serveur. Veuillez réessayer.';
      }
    } else if (error.code === 'ECONNABORTED') {
      return language === 'MG'
        ? 'Niharitra laval ny fangatahana. Andramo fanontaniana fohy kokoa.'
        : 'La requête a pris trop de temps. Essayez une question plus courte.';
    }
    
    // Erreur générique
    return language === 'MG'
      ? 'Nisy olana nitranga. Miala tsiny, andramo indray.'
      : 'Une erreur est survenue. Désolé, veuillez réessayer.';
  }
  
  // Tester la connexion à l'API
  async testConnection() {
    try {
      const response = await this.client.post('', {
        model: GROQ_MODELS.MIXTRAL,
        messages: [{ role: 'user', content: 'Test' }],
        max_tokens: 5
      });
      
      return {
        connected: true,
        model: response.data.model,
        status: 'active'
      };
    } catch (error) {
      console.error('❌ Test connexion Groq échoué:', error.message);
      return {
        connected: false,
        error: error.message,
        status: 'inactive'
      };
    }
  }
}

// Exporter une instance singleton
module.exports = new GroqService();