const { LANGUAGES } = require('../config/constants');

class Formatters {
  
  // Formater une réponse biblique pour Messenger
  static formatBiblicalResponse(response, language = 'FR') {
    if (!response || typeof response !== 'string') {
      return language === 'MG' 
        ? 'Tsy nahazo valiny aho. Miala tsiny, andramo indray.'
        : 'Je n\'ai pas reçu de réponse. Désolé, veuillez réessayer.';
    }
    
    // Nettoyer les retours à la ligne multiples
    let formatted = response.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    // Ajouter des sauts de ligne après les points si la ligne est longue
    formatted = formatted.replace(/\. ([A-Z])/g, '.\n\n$1');
    
    // Formater les références bibliques
    formatted = this.formatBibleReferences(formatted, language);
    
    // Limiter la longueur
    formatted = this.limitLength(formatted, language);
    
    // Ajouter un formatage markdown simple pour Messenger
    formatted = this.addMessengerFormatting(formatted);
    
    return formatted;
  }
  
  // Formater les références bibliques
  static formatBibleReferences(text, language) {
    // Patterns pour les références bibliques
    const patterns = [
      /(\d?\s*[A-Za-zÀ-ÿ]+)\s+(\d+):(\d+)(?:-(\d+))?/g,
      /(\d?\s*[A-Za-zÀ-ÿ]+)\s+(\d+)/g
    ];
    
    patterns.forEach(pattern => {
      text = text.replace(pattern, (match, book, chapter, verse, endVerse) => {
        if (verse) {
          if (endVerse) {
            return `**${book} ${chapter}:${verse}-${endVerse}**`;
          }
          return `**${book} ${chapter}:${verse}**`;
        }
        return `**${book} ${chapter}**`;
      });
    });
    
    return text;
  }
  
  // Limiter la longueur pour Messenger
  static limitLength(text, language) {
    const maxLength = 1900;
    
    if (text.length <= maxLength) return text;
    
    // Chercher un bon point de coupure
    const truncated = text.substring(0, maxLength);
    
    // Chercher le dernier point, point d'interrogation ou saut de ligne
    const lastPeriod = truncated.lastIndexOf('. ');
    const lastQuestion = truncated.lastIndexOf('? ');
    const lastNewline = truncated.lastIndexOf('\n\n');
    
    const cutoff = Math.max(lastPeriod, lastQuestion, lastNewline, maxLength - 100);
    
    if (cutoff > maxLength * 0.7) {
      // Bon point de coupure trouvé
      const continuationText = language === 'MG'
        ? '\n\n[...]\n\n**Fanamarihana:** Nohatsariny ny valiny. Azonao atao ny manontany fanazavana fanampiny.'
        : '\n\n[...]\n\n**Note:** La réponse a été raccourcie. Vous pouvez demander plus de détails.';
      
      return truncated.substring(0, cutoff) + continuationText;
    }
    
    // Pas de bon point de coupure, couper simplement
    return truncated + '...';
  }
  
  // Ajouter le formatage Messenger
  static addMessengerFormatting(text) {
    // Mettre en gras les titres (lignes entre ** **)
    text = text.replace(/\*\*(.+?)\*\*/g, '**$1**');
    
    // Ajouter des sauts de ligne pour les listes
    text = text.replace(/^\d+\.\s+/gm, '\n$&');
    text = text.replace(/^[-•*]\s+/gm, '\n$&');
    
    // S'assurer qu'il n'y a pas de lignes trop longues
    const lines = text.split('\n');
    const formattedLines = lines.map(line => {
      if (line.length > 80 && !line.includes('**')) {
        // Couper les lignes longues aux espaces
        const words = line.split(' ');
        let result = '';
        let currentLine = '';
        
        for (const word of words) {
          if (currentLine.length + word.length + 1 > 80) {
            result += currentLine + '\n';
            currentLine = word;
          } else {
            currentLine += (currentLine ? ' ' : '') + word;
          }
        }
        
        if (currentLine) {
          result += currentLine;
        }
        
        return result;
      }
      return line;
    });
    
    return formattedLines.join('\n').trim();
  }
  
  // Formater un timestamp
  static formatTimestamp(timestamp, language = 'FR') {
    const date = new Date(timestamp);
    
    const options = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    
    if (language === 'MG') {
      return date.toLocaleDateString('mg-MG', options);
    }
    
    return date.toLocaleDateString('fr-FR', options);
  }
  
  // Formater une durée
  static formatDuration(ms, language = 'FR') {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (language === 'MG') {
      if (hours > 0) return `${hours} ora ${minutes % 60} minitra`;
      if (minutes > 0) return `${minutes} minitra ${seconds % 60} segondra`;
      return `${seconds} segondra`;
    }
    
    if (hours > 0) return `${hours}h ${minutes % 60}min`;
    if (minutes > 0) return `${minutes}min ${seconds % 60}s`;
    return `${seconds}s`;
  }
  
  // Formater les statistiques
  static formatStats(stats, language = 'FR') {
    const translations = {
      MG: {
        requests: 'Fangatahana',
        users: 'Mpampiasa',
        cacheHits: 'Cache nahita',
        responseTime: 'Fotoana valiny',
        errors: 'Hadisoana'
      },
      FR: {
        requests: 'Requêtes',
        users: 'Utilisateurs',
        cacheHits: 'Cache hits',
        responseTime: 'Temps réponse',
        errors: 'Erreurs'
      }
    };
    
    const lang = translations[language] || translations.FR;
    
    let formatted = '';
    
    if (stats.requests) {
      formatted += `**${lang.requests}:** ${stats.requests}\n`;
    }
    
    if (stats.activeUsers) {
      formatted += `**${lang.users} actifs:** ${stats.activeUsers}\n`;
    }
    
    if (stats.cacheHits !== undefined) {
      const hitRate = stats.cacheHits / (stats.cacheHits + stats.cacheMisses) * 100 || 0;
      formatted += `**${lang.cacheHits}:** ${stats.cacheHits} (${hitRate.toFixed(1)}%)\n`;
    }
    
    if (stats.avgResponseTime) {
      formatted += `**${lang.responseTime}:** ${this.formatDuration(stats.avgResponseTime, language)}\n`;
    }
    
    if (stats.errors) {
      formatted += `**${lang.errors}:** ${stats.errors}\n`;
    }
    
    return formatted.trim();
  }
  
  // Formater un message d'erreur
  static formatError(error, language = 'FR') {
    const errorMessages = LANGUAGES.ERROR_MESSAGES[language] || LANGUAGES.ERROR_MESSAGES.FR;
    
    if (error.code) {
      switch (error.code) {
        case 'TIMEOUT':
          return errorMessages.TIMEOUT;
        case 'RATE_LIMIT':
          return errorMessages.RATE_LIMIT;
        case 'NETWORK_ERROR':
          return errorMessages.NETWORK_ERROR;
        case 'API_ERROR':
          return errorMessages.API_ERROR;
        default:
          return error.message || errorMessages.API_ERROR;
      }
    }
    
    return error.message || errorMessages.API_ERROR;
  }
  
  // Formater un verset biblique
  static formatBibleVerse(reference, text, language = 'FR') {
    const prefix = language === 'MG' ? '**Andininy:**' : '**Verset:**';
    return `${prefix} ${reference}\n\n"${text}"`;
  }
  
  // Formater une liste
  static formatList(items, language = 'FR') {
    if (!items || !Array.isArray(items)) return '';
    
    const prefix = language === 'MG' ? '\n' : '\n';
    
    return prefix + items.map((item, index) => {
      if (typeof item === 'object') {
        return `${index + 1}. **${item.title}** - ${item.description}`;
      }
      return `${index + 1}. ${item}`;
    }).join('\n');
  }
  
  // Nettoyer le texte pour Messenger
  static sanitizeText(text) {
    if (!text) return '';
    
    // Remplacer les caractères problématiques
    let sanitized = text
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, "'")
      .replace(/\n{3,}/g, '\n\n'); // Pas plus de 2 sauts de ligne consécutifs
    
    // Supprimer les caractères de contrôle
    sanitized = sanitized.replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F\x7F]/g, '');
    
    return sanitized;
  }
  
  // Tronquer le texte avec ellipse
  static truncateText(text, maxLength = 100, addEllipsis = true) {
    if (!text || text.length <= maxLength) return text;
    
    const truncated = text.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > maxLength * 0.7) {
      return truncated.substring(0, lastSpace) + (addEllipsis ? '...' : '');
    }
    
    return truncated + (addEllipsis ? '...' : '');
  }
  
  // Capitaliser la première lettre
  static capitalizeFirst(text) {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
  
  // Formater un nombre
  static formatNumber(number, language = 'FR') {
    if (typeof number !== 'number') return number;
    
    if (language === 'MG') {
      return number.toLocaleString('mg-MG');
    }
    
    return number.toLocaleString('fr-FR');
  }
  
  // Formater un pourcentage
  static formatPercentage(value, language = 'FR') {
    if (typeof value !== 'number') return value;
    
    const formatted = value.toFixed(1);
    
    if (language === 'MG') {
      return `${formatted}%`;
    }
    
    return `${formatted} %`;
  }
}

module.exports = Formatters;