// Constantes pour le chatbot Scriptura

module.exports = {
  // Application
  APP_NAME: 'Scriptura',
  APP_VERSION: '1.0.0',
  APP_DESCRIPTION: 'Chatbot biblique réformé pour Messenger',
  
  // Théologie
  THEOLOGY: {
    NAME: 'Théologie réformée protestante',
    CONFESSIONS: [
      'Confession de foi de Westminster (1646)',
      'Confession de foi belge (1561)',
      'Catéchisme de Heidelberg (1563)'
    ],
    SOLAS: [
      'Sola Scriptura - L\'Écriture seule',
      'Sola Gratia - La grâce seule',
      'Sola Fide - La foi seule',
      'Solus Christus - Christ seul',
      'Soli Deo Gloria - À Dieu seul la gloire'
    ],
    TULIP: [
      'Dépravation totale',
      'Élection inconditionnelle',
      'Expiation limitée',
      'Grâce irrésistible',
      'Persévérance des saints'
    ]
  },
  
  // Bible
  BIBLE: {
    CANON: {
      OLD_TESTAMENT: 39,
      NEW_TESTAMENT: 27,
      TOTAL: 66
    },
    VERSIONS: {
      RECOMMENDED: ['LSG', 'NBS', 'BFC'],
      AVAILABLE: ['LSG', 'NBS', 'BFC', 'PDV', 'BDS']
    }
  },
  
  // Facebook Messenger
  FACEBOOK: {
    MESSAGING_TYPES: {
      RESPONSE: 'RESPONSE',
      UPDATE: 'UPDATE',
      MESSAGE_TAG: 'MESSAGE_TAG'
    },
    SENDER_ACTIONS: {
      TYPING_ON: 'typing_on',
      TYPING_OFF: 'typing_off',
      MARK_SEEN: 'mark_seen'
    },
    ATTACHMENT_TYPES: {
      IMAGE: 'image',
      AUDIO: 'audio',
      VIDEO: 'video',
      FILE: 'file',
      TEMPLATE: 'template'
    },
    TEMPLATE_TYPES: {
      GENERIC: 'generic',
      BUTTON: 'button',
      RECEIPT: 'receipt'
    },
    QUICK_REPLY_TYPES: {
      TEXT: 'text',
      LOCATION: 'location',
      USER_PHONE_NUMBER: 'user_phone_number',
      USER_EMAIL: 'user_email'
    }
  },
  
  // Groq API
GROQ_MODELS: {
  // REMPLACER l'ancien modèle par un modèle actuel :
  MIXTRAL: 'mixtral-8x7b-instruct', // Ancien: 'mixtral-8x7b-32768'
  LLAMA_3: 'llama-3.3-70b-versatile', // Modèle très performant
  LLAMA_3_INSTANT: 'llama-3.1-8b-instant', // Rapide et efficace
  GEMMA_2: 'gemma2-9b-it', // Nouveau modèle Google
  LLAMA: 'llama2-70b-4096' // Garder pour compatibilité
},
  
  GROQ_ENDPOINTS: {
    CHAT_COMPLETIONS: 'https://api.groq.com/openai/v1/chat/completions',
    MODELS: 'https://api.groq.com/openai/v1/models'
  },
  
 GROQ_SETTINGS: {
  DEFAULT_MODEL: 'llama-3.3-70b-versatile',
  DEFAULT_TEMPERATURE: 0.7,
  DEFAULT_MAX_TOKENS: 800,
  DEFAULT_TOP_P: 0.9,
  TIMEOUT: 15000 // 15 secondes
},
  
  // Cache
  CACHE: {
    DEFAULT_TTL: 600, // 10 minutes
    MAX_KEYS: 100,
    CLEANUP_INTERVAL: 120 // 2 minutes
  },
  
  // Rate Limiting
  RATE_LIMIT: {
    WINDOW_MS: 60000, // 1 minute
    MAX_REQUESTS: 30,
    BLOCK_DURATION: 300000 // 5 minutes
  },
  
  // Validation
  VALIDATION: {
    MIN_QUESTION_LENGTH: 3,
    MAX_QUESTION_LENGTH: 500,
    MAX_RESPONSE_LENGTH: 2000,
    MIN_RESPONSE_LENGTH: 50
  },
  
  // Langues
  LANGUAGES: {
    FR: {
      CODE: 'FR',
      NAME: 'Français',
      GREETINGS: ['Bonjour', 'Salut', 'Bonsoir'],
      LOCAL: 'fr_FR'
    },
    MG: {
      CODE: 'MG',
      NAME: 'Malagasy',
      GREETINGS: ['Manahoana', 'Salama', 'Miarahaba'],
      LOCAL: 'mg_MG'
    }
  },
  
  // Messages d'erreur
  ERROR_MESSAGES: {
    // Français
    FR: {
      TIMEOUT: 'La requête a pris trop de temps. Veuillez réessayer avec une question plus courte.',
      API_ERROR: 'Erreur de l\'API. Désolé, veuillez réessayer.',
      INVALID_QUESTION: 'Je ne peux pas traiter cette question. Essayez une formulation différente.',
      RATE_LIMIT: 'Trop de messages. Veuillez patienter quelques instants.',
      NETWORK_ERROR: 'Problème de connexion. Vérifiez votre internet et réessayez.',
      MAINTENANCE: 'Service en maintenance. Veuillez réessayer plus tard.',
      DOCTRINAL_ERROR: 'Cette question touche à des domaines que je ne peux pas traiter.'
    },
    // Malagasy
    MG: {
      TIMEOUT: 'Niharitra laval ny fangatahana. Andramo fanontaniana fohy kokoa.',
      API_ERROR: 'Olana tamin\'ny API. Miala tsiny, andramo indray.',
      INVALID_QUESTION: 'Tsy azoko atao ny mamaly io fanontaniana io. Andramo fomba hafa.',
      RATE_LIMIT: 'Be loatra ny hafatra. Andramo indray afaka minitra vitsivitsy.',
      NETWORK_ERROR: 'Olana amin\'ny fifandraisana. Jereo ny internet ary andramo indray.',
      MAINTENANCE: 'Mbola amboarina ny rafitra. Andramo indray any aoriana.',
      DOCTRINAL_ERROR: 'Tsy azoko atao ny mamaly io fanontaniana io.'
    }
  },
  
  // Réponses rapides
  QUICK_REPLIES: {
    FR: [
      { title: '📖 Étude biblique', payload: 'BIBLE_STUDY' },
      { title: '🙏 Demande prière', payload: 'PRAYER_REQUEST' },
      { title: '❓ Question doctrine', payload: 'DOCTRINE_QUESTION' },
      { title: '🏠 Trouver église', payload: 'FIND_CHURCH' },
      { title: 'ℹ️ Plus d\'info', payload: 'MORE_INFO' }
    ],
    MG: [
      { title: '📖 Fandinihana Baiboly', payload: 'BIBLE_STUDY' },
      { title: '🙏 Fangatahana vavaka', payload: 'PRAYER_REQUEST' },
      { title: '❓ Fanontaniana foto-pinoana', payload: 'DOCTRINE_QUESTION' },
      { title: '🏠 Mitady fiangonana', payload: 'FIND_CHURCH' },
      { title: 'ℹ️ Fanazavana fanampiny', payload: 'MORE_INFO' }
    ]
  },
  
  // Configurations Vercel
  VERCEL: {
    MAX_DURATION: 10, // secondes
    MEMORY: 1024, // MB
    REGIONS: ['iad1', 'cdg1', 'fra1', 'syd1']
  },
  
  // Statistiques
  STATS: {
    TRACK_REQUESTS: true,
    TRACK_RESPONSE_TIMES: true,
    TRACK_LANGUAGES: true,
    TRACK_ERRORS: true
  },
  
  // Logging
  LOGGING: {
    LEVEL: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    FORMAT: 'json',
    FILE: 'logs/scriptura.log'
  },
  
  // Monitoring
  MONITORING: {
    HEALTH_CHECK_INTERVAL: 300000, // 5 minutes
    CLEANUP_INTERVAL: 3600000, // 1 heure
    BACKUP_INTERVAL: 86400000 // 24 heures
  }
};