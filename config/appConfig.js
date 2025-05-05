// config/appConfig.js

/**
 * Application configuration
 * In a production environment, these values would be loaded from environment
 * variables, configuration files, or a configuration service
 */
module.exports = {
  // Enable demo mode for local development
  demoMode: true,
  
  // Supabase configuration
  supabase: {
    url: process.env.SUPABASE_URL || 'https://your-supabase-project.supabase.co',
    apiKey: process.env.SUPABASE_KEY || 'your-supabase-anon-key',
  },
  
  // API base URLs
  apiBaseUrl: 'https://api.zomato.com/v2',
  supportApiBaseUrl: 'https://support.zomato.com/api/v1',
  
  // API keys (these would be environment variables in production)
  internalApiKey: process.env.INTERNAL_API_KEY || 'demo_internal_api_key',
  
  // Payment gateway configuration
  paymentGateway: {
    baseUrl: 'https://payments.zomato.com/api',
    merchantId: process.env.PAYMENT_MERCHANT_ID || 'zomato_merchant_123',
    apiKey: process.env.PAYMENT_API_KEY || 'demo_payment_gateway_key'
  },
  
  // Verification windows (time limits for various actions)
  verificationWindows: {
    wrongOrder: 60, // Minutes after delivery to report wrong order
    missingItem: 60, // Minutes after delivery to report missing item
    lateDeliveryHours: 24, // Hours after delivery to report late delivery
    qualityIssueHours: 2 // Hours after delivery to report food quality issues
  },
  
  // Thresholds for various decisions
  thresholds: {
    fraudRiskScore: 0.7, // Score above which customer requires additional verification
    complaintFrequency: 5, // Complaints per month that trigger additional verification
    acceptableLateness: 10, // Minutes of lateness that are considered acceptable
    redeliveryWindowMinutes: 120, // Minutes after order when redelivery is possible
    refundEligibilityDays: 7, // Days after order when refund is possible
    maxLateFee: 200, // Maximum amount for late delivery compensation
    maxBonusAmount: 100, // Maximum bonus amount for premium customers
    highValueOrder: 1000 // Threshold for high-value order (in INR)
  },
  
  // Compensation rates for different issues
  compensationRates: {
    slightlyLate: 0.1, // 10% of order total for slightly late delivery
    moderatelyLate: 0.2, // 20% of order total for moderately late delivery
    veryLate: 0.3, // 30% of order total for very late delivery
    premiumBonus: 0.2 // 20% bonus for premium members
  },
  
  // Escalation thresholds
  escalationThresholds: {
    sentiment: -0.5, // Sentiment score below which to auto-escalate
    messageCount: 10 // Number of messages after which to suggest escalation
  },
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info', // Log level (debug, info, warn, error)
    format: process.env.LOG_FORMAT || 'json', // Log format (json, text)
    destination: process.env.LOG_DESTINATION || 'console' // Where to send logs (console, file, service)
  }
};