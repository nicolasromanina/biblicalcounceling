module.exports = (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Scriptura Biblical Chatbot',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    memory: {
      rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`
    },
    dependencies: {
      node: process.version,
      platform: process.platform
    },
    checks: {
      facebook_api: 'configured',
      groq_api: 'configured',
      cache: 'active'
    }
  };
  
  // Vérifications supplémentaires
  if (!process.env.GROQ_API_KEY) {
    health.status = 'degraded';
    health.checks.groq_api = 'missing_api_key';
  }
  
  if (!process.env.FACEBOOK_PAGE_ACCESS_TOKEN) {
    health.status = 'degraded';
    health.checks.facebook_api = 'missing_token';
  }
  
  res.status(200).json(health);
};