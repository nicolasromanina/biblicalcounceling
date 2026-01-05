const NodeCache = require('node-cache');

class CacheService {
  constructor() {
    this.cache = new NodeCache({
      stdTTL: parseInt(process.env.CACHE_TTL) || 600, // 10 minutes
      checkperiod: 120, // Vérifier toutes les 2 minutes
      maxKeys: parseInt(process.env.CACHE_MAX_KEYS) || 100,
      useClones: false // Meilleure performance
    });
    
    console.log('✅ Cache initialisé:', {
      ttl: this.cache.options.stdTTL,
      maxKeys: this.cache.options.maxKeys
    });
  }
  
  // Générer une clé de cache
  generateKey(question, language, context = '') {
    const baseKey = `${language}:${question.toLowerCase().trim().substring(0, 100)}`;
    const contextHash = context ? this.hashString(context) : '';
    return `${baseKey}:${contextHash}`;
  }
  
  // Hacher une chaîne simple
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }
  
  // Obtenir une valeur du cache
  get(question, language = 'FR', context = '') {
    const key = this.generateKey(question, language, context);
    const value = this.cache.get(key);
    
    if (value && process.env.NODE_ENV === 'development') {
      console.log('📦 Cache hit:', key.substring(0, 50) + '...');
    }
    
    return value;
  }
  
  // Définir une valeur dans le cache
  set(question, language = 'FR', context = '', value) {
    const key = this.generateKey(question, language, context);
    const success = this.cache.set(key, value);
    
    if (success && process.env.NODE_ENV === 'development') {
      console.log('💾 Cache set:', key.substring(0, 50) + '...');
    }
    
    return success;
  }
  
  // Vider le cache
  clear() {
    this.cache.flushAll();
    console.log('🧹 Cache vidé');
  }
  
  // Obtenir les statistiques du cache
  getStats() {
    const stats = this.cache.getStats();
    return {
      hits: stats.hits,
      misses: stats.misses,
      keys: stats.keys,
      hitRate: stats.hits / (stats.hits + stats.misses) || 0,
      size: this.cache.keys().length
    };
  }
  
  // Supprimer les entrées anciennes
  cleanup() {
    const keys = this.cache.keys();
    const now = Date.now() / 1000;
    let cleaned = 0;
    
    keys.forEach(key => {
      const val = this.cache.getTtl(key);
      if (val && val < now) {
        this.cache.del(key);
        cleaned++;
      }
    });
    
    if (cleaned > 0) {
      console.log(`🧹 ${cleaned} entrées nettoyées du cache`);
    }
    
    return cleaned;
  }
  
  // Rechercher dans le cache
  search(query) {
    const keys = this.cache.keys();
    const results = [];
    
    keys.forEach(key => {
      if (key.toLowerCase().includes(query.toLowerCase())) {
        results.push({
          key,
          value: this.cache.get(key)?.substring(0, 100) + '...'
        });
      }
    });
    
    return results;
  }
  
  // Cache intelligent avec similarité
  getSimilar(question, language = 'FR', threshold = 0.7) {
    const keys = this.cache.keys();
    const questionLower = question.toLowerCase().trim();
    
    for (const key of keys) {
      if (!key.startsWith(`${language}:`)) continue;
      
      const cachedQuestion = key.split(':')[1];
      const similarity = this.calculateSimilarity(questionLower, cachedQuestion);
      
      if (similarity >= threshold) {
        console.log(`🔍 Similarité trouvée: ${similarity.toFixed(2)}`);
        return this.cache.get(key);
      }
    }
    
    return null;
  }
  
  // Calculer la similarité entre deux chaînes
  calculateSimilarity(str1, str2) {
    const words1 = new Set(str1.split(/\s+/));
    const words2 = new Set(str2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }
}

module.exports = new CacheService();