class Validators {
  // Valider une question biblique
  static validateQuestion(question) {
    const errors = [];
    const warnings = [];
    
    if (!question || typeof question !== 'string') {
      errors.push('Question invalide');
      return { isValid: false, errors, warnings };
    }
    
    const trimmedQuestion = question.trim();
    
    // Vérifier la longueur
    if (trimmedQuestion.length < 2) {
      errors.push('Question trop courte');
    }
    
    if (trimmedQuestion.length > 1000) {
      warnings.push('Question très longue - risque de timeout');
    }
    
    // Vérifier le contenu problématique
    const problematicPatterns = [
      {
        pattern: /(?:https?:\/\/|www\.)[^\s]+/gi,
        type: 'error',
        message: 'Les liens ne sont pas autorisés'
      },
      {
        pattern: /[<>{}[\]\\]/g,
        type: 'warning',
        message: 'Caractères spéciaux détectés'
      },
      {
        pattern: /(.)\1{10,}/g, // Caractère répété 10+ fois
        type: 'error',
        message: 'Texte répété détecté'
      },
      {
        pattern: /\b(?:sexe|pornographie|explicite)\b/i,
        type: 'error',
        message: 'Contenu inapproprié'
      }
    ];
    
    problematicPatterns.forEach(({ pattern, type, message }) => {
      if (pattern.test(trimmedQuestion)) {
        if (type === 'error') {
          errors.push(message);
        } else {
          warnings.push(message);
        }
      }
    });
    
    // Vérifier le niveau de complexité
    const wordCount = trimmedQuestion.split(/\s+/).length;
    if (wordCount > 200) {
      warnings.push('Question très complexe');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      stats: {
        length: trimmedQuestion.length,
        wordCount,
        language: 'auto' // À détecter séparément
      }
    };
  }
  
  // Valider un ID Facebook
  static validateFacebookId(id) {
    if (!id || typeof id !== 'string') {
      return { isValid: false, error: 'ID invalide' };
    }
    
    // Facebook IDs sont généralement numériques et longs
    if (!/^\d+$/.test(id)) {
      return { isValid: false, error: 'ID doit être numérique' };
    }
    
    if (id.length < 5 || id.length > 50) {
      return { isValid: false, error: 'ID longueur invalide' };
    }
    
    return { isValid: true };
  }
  
  // Valider une réponse biblique
  static validateBiblicalResponse(response) {
    if (!response || typeof response !== 'string') {
      return { isValid: false, error: 'Réponse invalide' };
    }
    
    const issues = [];
    
    // Vérifier la longueur
    if (response.length > 2000) {
      issues.push('Réponse trop longue pour Messenger');
    }
    
    if (response.length < 10) {
      issues.push('Réponse trop courte');
    }
    
    // Vérifier la présence de contenu biblique
    const biblicalTerms = [
      'bible', 'écriture', 'verset', 'passage',
      'jésus', 'christ', 'dieu', 'esprit',
      'grâce', 'foi', 'salut', 'péché',
      'baiboly', 'jesosy', 'andriamanitra',
      'fahasoavana', 'finoana', 'famonjena'
    ];
    
    const hasBiblicalContent = biblicalTerms.some(term => 
      response.toLowerCase().includes(term)
    );
    
    if (!hasBiblicalContent) {
      issues.push('Peu de contenu biblique détecté');
    }
    
    // Vérifier la structure
    const hasParagraphs = response.includes('\n\n');
    const hasReferences = /(\d\s*[A-Za-z]+\s*\d+:\d+)/.test(response);
    
    return {
      isValid: issues.length === 0,
      issues,
      stats: {
        length: response.length,
        hasParagraphs,
        hasReferences,
        biblicalContent: hasBiblicalContent
      }
    };
  }
  
  // Valider les variables d'environnement
  static validateEnvironment() {
    const requiredVars = [
      'FACEBOOK_PAGE_ACCESS_TOKEN',
      'FACEBOOK_VERIFY_TOKEN',
      'GROQ_API_KEY'
    ];
    
    const missing = [];
    const warnings = [];
    
    requiredVars.forEach(varName => {
      if (!process.env[varName]) {
        missing.push(varName);
      }
    });
    
    // Vérifications optionnelles
    if (!process.env.FACEBOOK_APP_SECRET) {
      warnings.push('FACEBOOK_APP_SECRET non défini (signature désactivée)');
    }
    
    // Vérifier le format du token Facebook
    if (process.env.FACEBOOK_PAGE_ACCESS_TOKEN) {
      const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
      if (token.length < 50) {
        warnings.push('Token Facebook semble trop court');
      }
    }
    
    // Vérifier le format de la clé GROQ
    if (process.env.GROQ_API_KEY) {
      const key = process.env.GROQ_API_KEY;
      if (!key.startsWith('gsk_')) {
        warnings.push('Clé GROQ format inhabituel');
      }
    }
    
    return {
      isValid: missing.length === 0,
      missing,
      warnings,
      env: process.env.NODE_ENV || 'development'
    };
  }
  
  // Valider l'URL du webhook
  static validateWebhookUrl(url) {
    try {
      const urlObj = new URL(url);
      
      // Vérifier le protocole
      if (urlObj.protocol !== 'https:') {
        return { isValid: false, error: 'URL doit être HTTPS' };
      }
      
      // Vérifier le chemin
      if (!urlObj.pathname.includes('/webhook')) {
        return { isValid: false, error: 'URL doit contenir /webhook' };
      }
      
      return {
        isValid: true,
        domain: urlObj.hostname,
        path: urlObj.pathname,
        fullUrl: urlObj.href
      };
      
    } catch (error) {
      return { isValid: false, error: 'URL invalide' };
    }
  }
}

module.exports = Validators;