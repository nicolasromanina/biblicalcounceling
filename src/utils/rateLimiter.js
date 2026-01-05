class RateLimiter {
  constructor() {
    this.requests = new Map();
    this.windowMs = parseInt(process.env.RATE_LIMIT_WINDOW) || 60000; // 1 minute
    this.maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 30;
    this.cleanupInterval = 60000; // Nettoyage toutes les minutes
    this.blockedUsers = new Map();
    
    // Nettoyage périodique
    setInterval(() => this.cleanup(), this.cleanupInterval);
  }
  
  // Vérifier si un utilisateur peut envoyer une requête
  checkLimit(userId) {
    const now = Date.now();
    
    // Vérifier si l'utilisateur est bloqué
    const blockInfo = this.blockedUsers.get(userId);
    if (blockInfo && blockInfo.until > now) {
      const remaining = Math.ceil((blockInfo.until - now) / 1000);
      console.log(`⏸️ Utilisateur bloqué: ${userId.substring(0, 10)}... (${remaining}s restants)`);
      return false;
    }
    
    // Libérer si le blocage est terminé
    if (blockInfo && blockInfo.until <= now) {
      this.blockedUsers.delete(userId);
    }
    
    // Obtenir l'historique des requêtes
    const userRequests = this.requests.get(userId) || [];
    
    // Filtrer les requêtes dans la fenêtre de temps
    const recentRequests = userRequests.filter(time => now - time < this.windowMs);
    
    // Vérifier si la limite est atteinte
    if (recentRequests.length >= this.maxRequests) {
      // Bloquer l'utilisateur pendant 5 minutes
      this.blockedUsers.set(userId, {
        until: now + 300000, // 5 minutes
        reason: 'rate_limit_exceeded'
      });
      
      console.log(`🚫 Limite atteinte pour: ${userId.substring(0, 10)}... (${recentRequests.length} requêtes)`);
      return false;
    }
    
    // Ajouter la nouvelle requête
    recentRequests.push(now);
    this.requests.set(userId, recentRequests);
    
    return true;
  }
  
  // Enregistrer une requête
  recordRequest(userId) {
    const now = Date.now();
    const userRequests = this.requests.get(userId) || [];
    userRequests.push(now);
    this.requests.set(userId, userRequests);
  }
  
  // Obtenir le statut d'un utilisateur
  getUserStatus(userId) {
    const now = Date.now();
    const userRequests = this.requests.get(userId) || [];
    const blockInfo = this.blockedUsers.get(userId);
    
    const recentRequests = userRequests.filter(time => now - time < this.windowMs);
    const isBlocked = blockInfo && blockInfo.until > now;
    
    return {
      userId: userId.substring(0, 10) + '...',
      recentRequests: recentRequests.length,
      maxRequests: this.maxRequests,
      isBlocked,
      blockedUntil: isBlocked ? new Date(blockInfo.until).toISOString() : null,
      timeWindow: this.windowMs / 1000 + ' seconds'
    };
  }
  
  // Nettoyer les anciennes entrées
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    // Nettoyer les requêtes anciennes
    for (const [userId, requests] of this.requests.entries()) {
      const recentRequests = requests.filter(time => now - time < this.windowMs * 2);
      
      if (recentRequests.length === 0) {
        this.requests.delete(userId);
        cleaned++;
      } else {
        this.requests.set(userId, recentRequests);
      }
    }
    
    // Nettoyer les blocages expirés
    for (const [userId, blockInfo] of this.blockedUsers.entries()) {
      if (blockInfo.until <= now) {
        this.blockedUsers.delete(userId);
        cleaned++;
      }
    }
    
    if (cleaned > 0 && process.env.NODE_ENV === 'development') {
      console.log(`🧹 ${cleaned} entrées nettoyées du rate limiter`);
    }
  }
  
  // Réinitialiser pour un utilisateur
  resetUser(userId) {
    this.requests.delete(userId);
    this.blockedUsers.delete(userId);
    console.log(`🔄 Rate limit réinitialisé pour: ${userId.substring(0, 10)}...`);
  }
  
  // Obtenir les statistiques globales
  getStats() {
    const now = Date.now();
    let activeUsers = 0;
    let blockedUsers = 0;
    
    for (const [userId, requests] of this.requests.entries()) {
      const recentRequests = requests.filter(time => now - time < this.windowMs);
      if (recentRequests.length > 0) {
        activeUsers++;
      }
    }
    
    for (const [userId, blockInfo] of this.blockedUsers.entries()) {
      if (blockInfo.until > now) {
        blockedUsers++;
      }
    }
    
    return {
      activeUsers,
      blockedUsers,
      totalUsers: this.requests.size,
      totalBlocked: this.blockedUsers.size,
      windowMs: this.windowMs,
      maxRequests: this.maxRequests
    };
  }
}

module.exports = new RateLimiter();