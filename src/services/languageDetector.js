class LanguageDetector {
  static detect(text) {
    if (!text || typeof text !== 'string') return 'FR';
    
    const textLower = text.toLowerCase().trim();
    
    // Dictionnaire de mots-clés par langue
    const keywords = {
      MG: [
        'manao ahoana', 'misaotra', 'azafady', 'tsara', 'ratsy',
        'miala tsiny', 'tongasoa', 'veloma', 'maraina', 'hariva',
        'baiboly', 'jesosy', 'kristy', 'andriamanitra', 'vavaka',
        'finoana', 'fahasoavana', 'ota', 'famonjena', 'fiangonana',
        'mpitory', 'filazantsara', 'teny', 'tany', 'lanitra',
        'olona', 'zavatra', 'zoma', 'sabotsy', 'alahady',
        'ankizy', 'ray', 'reny', 'namana', 'sakaiza'
      ],
      FR: [
        'bonjour', 'salut', 'merci', 's\'il vous plaît', 'désolé',
        'bienvenue', 'au revoir', 'matin', 'soir', 'nuit',
        'bible', 'jésus', 'christ', 'dieu', 'prière',
        'foi', 'grâce', 'péché', 'salut', 'église',
        'pasteur', 'évangile', 'parole', 'terre', 'ciel',
        'personne', 'chose', 'vendredi', 'samedi', 'dimanche',
        'enfant', 'père', 'mère', 'ami', 'amie'
      ]
    };
    
    // Compter les occurrences
    let mgScore = 0;
    let frScore = 0;
    
    // Détection par mots-clés
    keywords.MG.forEach(word => {
      if (textLower.includes(word)) mgScore++;
    });
    
    keywords.FR.forEach(word => {
      if (textLower.includes(word)) frScore++;
    });
    
    // Détection par caractères spécifiques
    const mgChars = /[àáâèéêìíîòóôùúûñ]/g;
    const frChars = /[éèêëàâäîïôöùûüçœæ]/g;
    
    const mgCharCount = (text.match(mgChars) || []).length;
    const frCharCount = (text.match(frChars) || []).length;
    
    mgScore += mgCharCount * 0.5;
    frScore += frCharCount * 0.5;
    
    // Détection par mots courts communs
    const mgCommonWords = ['ny', 'ho', 'dia', 'ary', 'fa', 'raha', 'tsy'];
    const frCommonWords = ['le', 'la', 'de', 'et', 'mais', 'si', 'ne'];
    
    const words = textLower.split(/\s+/);
    words.forEach(word => {
      if (mgCommonWords.includes(word)) mgScore++;
      if (frCommonWords.includes(word)) frScore++;
    });
    
    // Log pour débogage
    if (process.env.NODE_ENV === 'development') {
      console.log('🔤 Détection langue:', {
        texte: text.substring(0, 50),
        scores: { MG: mgScore, FR: frScore },
        détermination: mgScore > frScore ? 'MG' : 'FR'
      });
    }
    
    // Décision avec seuil de confiance
    const totalScore = mgScore + frScore;
    if (totalScore === 0) return 'FR'; // Par défaut
    
    const mgRatio = mgScore / totalScore;
    const frRatio = frScore / totalScore;
    
    const confidenceThreshold = 0.1; // Seuil bas pour plus de flexibilité
    
    if (mgRatio > frRatio + confidenceThreshold) {
      return 'MG';
    } else if (frRatio > mgRatio + confidenceThreshold) {
      return 'FR';
    } else {
      // Trop proche, utiliser des indices supplémentaires
      return this.detectWithAdditionalClues(text);
    }
  }
  
  static detectWithAdditionalClues(text) {
    const textLower = text.toLowerCase();
    
    // Vérifier les phrases typiques
    const mgPhrases = [
      'manao ahoana ianao',
      'misaotra betsaka',
      'azafady kely',
      'veloma tompoko',
      'maraina tsara'
    ];
    
    const frPhrases = [
      'comment allez-vous',
      'merci beaucoup',
      's\'il vous plaît',
      'au revoir',
      'bonne journée'
    ];
    
    mgPhrases.forEach(phrase => {
      if (textLower.includes(phrase)) return 'MG';
    });
    
    frPhrases.forEach(phrase => {
      if (textLower.includes(phrase)) return 'FR';
    });
    
    // Vérifier la longueur des mots (le malgache a souvent des mots plus longs)
    const words = textLower.split(/\s+/);
    const avgLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
    
    // Le malgache a généralement des mots plus longs
    if (avgLength > 6) return 'MG';
    
    return 'FR'; // Par défaut
  }
  
  static getPrefix(language) {
    switch (language) {
      case 'MG':
        return '[MG] ';
      case 'FR':
        return '[FR] ';
      default:
        return '';
    }
  }
  
  static getWelcomeMessage(language) {
    const messages = {
      MG: `🤖 Tongasoa eto amin'i Scriptura!
        
Ianao dia mpanampy ara-Baiboly miorina amin'ny teolojia reformista protestanta.

**Ny anjara asako:**
• Hanazava ny lahatsoratra ara-Baiboly
• Hitari-dalana amin'ny dinika ara-Baiboly
• Hanoro ny loharanom-pahalalana reformista

**Ny fetrako:**
⚠️ Tsy manome faminaniana manokana
⚠️ Tsy misolo toerana ny mpitory
⚠️ Tsy manome toro-hevitra ara-pitsaboana

**Andehano ny fanontanianao:**`,
      
      FR: `🤖 Bienvenue sur Scriptura!
        
Je suis un assistant biblique basé sur la théologie réformée protestante.

**Mon rôle:**
• Expliquer les textes bibliques
• Guider la réflexion biblique
• Orienter vers des ressources réformées

**Mes limites:**
⚠️ Pas de prophéties personnelles
⚠️ Pas de substitution au pasteur
⚠️ Pas de conseils médicaux

**Posez votre question:**`
    };
    
    return messages[language] || messages.FR;
  }
  
  static getErrorMessages() {
    return {
      MG: {
        timeout: 'Niharitra laval ny fangatahana. Andramo indray azafady.',
        api_error: 'Nisy olana tamin\'ny API. Miala tsiny.',
        invalid_question: 'Tsy azoko atao ny mamaly io fanontaniana io.',
        rate_limit: 'Tafahoatra ny fangatahana. Andramo indray afaka minitra.'
      },
      FR: {
        timeout: 'La requête a pris trop de temps. Veuillez réessayer.',
        api_error: 'Erreur API. Désolé.',
        invalid_question: 'Je ne peux pas répondre à cette question.',
        rate_limit: 'Trop de requêtes. Veuillez patienter.'
      }
    };
  }
  
  static getErrorMessage(language, errorType) {
    const messages = this.getErrorMessages();
    const langMessages = messages[language] || messages.FR;
    return langMessages[errorType] || 'Une erreur est survenue.';
  }
}

module.exports = LanguageDetector;