// modules/paymentProcessor.js

const logger = require('../utilities/logger');
const config = require('../config/appConfig');
const axios = require('axios');

/**
 * Process a refund for an order
 * @param {string} paymentId - ID of the original payment
 * @param {number} amount - Amount to refund
 * @param {string} reason - Reason for the refund
 * @returns {object} Result of the refund process
 */
async function processRefund(paymentId, amount, reason) {
  try {
    logger.info('Processing refund', { paymentId, amount, reason });
    
    // Check if we're in demo mode
    if (config.demoMode) {
      // In demo mode, always return success
      logger.info('Refund processed successfully (DEMO MODE)', { paymentId, amount });
      
      return {
        success: true,
        transactionId: `ref_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        amount,
        timestamp: new Date(),
        estimatedCreditDays: 3
      };
    }
    
    // In production, call the payment gateway API
    // This is a mock implementation - would be replaced with actual payment gateway integration
    try {
      // API call to payment gateway
      const response = await axios.post(`${config.paymentGateway.baseUrl}/refunds`, {
        paymentId,
        amount,
        reason,
        merchantId: config.paymentGateway.merchantId,
        apiKey: config.paymentGateway.apiKey
      });
      
      logger.info('Refund processed successfully', { 
        paymentId, 
        amount, 
        transactionId: response.data.transactionId 
      });
      
      return {
        success: true,
        transactionId: response.data.transactionId,
        amount,
        timestamp: new Date(),
        estimatedCreditDays: response.data.estimatedDays || 5
      };
    } catch (apiError) {
      logger.error('Payment gateway API error', {
        error: apiError.message,
        paymentId,
        amount
      });
      
      // Check if we should auto-escalate based on error type
      if (apiError.response && apiError.response.status >= 500) {
        // Server error from payment gateway - auto-escalate
        return {
          success: false,
          error: 'Payment gateway unavailable',
          escalate: true
        };
      }
      
      // Client error from payment gateway
      return {
        success: false,
        error: apiError.response ? apiError.response.data.message : apiError.message,
        escalate: false
      };
    }
  } catch (error) {
    logger.error('Error processing refund', { error: error.message });
    
    return {
      success: false,
      error: 'Internal server error',
      escalate: true
    };
  }
}

/**
 * Check payment status
 * @param {string} paymentId - ID of the payment
 * @returns {object} Payment status
 */
async function checkPaymentStatus(paymentId) {
  try {
    logger.info('Checking payment status', { paymentId });
    
    // Demo mode
    if (config.demoMode) {
      return {
        status: 'COMPLETED',
        method: 'CREDIT_CARD',
        amount: 450.00,
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
      };
    }
    
    // Real implementation would call the payment gateway API
    const response = await axios.get(
      `${config.paymentGateway.baseUrl}/payments/${paymentId}`,
      {
        headers: {
          'Authorization': `Bearer ${config.paymentGateway.apiKey}`,
          'Merchant-ID': config.paymentGateway.merchantId
        }
      }
    );
    
    return {
      status: response.data.status,
      method: response.data.method,
      amount: response.data.amount,
      timestamp: new Date(response.data.timestamp)
    };
  } catch (error) {
    logger.error('Error checking payment status', { error: error.message });
    
    return {
      status: 'UNKNOWN',
      error: 'Unable to retrieve payment status'
    };
  }
}

/**
 * Process Zomato credits
 * @param {string} customerId - ID of the customer
 * @param {number} amount - Amount to add as credits
 * @param {string} reason - Reason for the credits
 * @returns {object} Result of the credit process
 */
async function processCredits(customerId, amount, reason) {
  try {
    logger.info('Processing Zomato credits', { customerId, amount, reason });
    
    // Demo mode
    if (config.demoMode) {
      return {
        success: true,
        creditId: `zc_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        amount,
        timestamp: new Date(),
        expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days from now
      };
    }
    
    // Real implementation would call the Zomato credits API
    const response = await axios.post(`${config.apiBaseUrl}/customers/${customerId}/credits`, {
      amount,
      reason,
      expiryDays: 90,
      apiKey: config.internalApiKey
    });
    
    return {
      success: true,
      creditId: response.data.creditId,
      amount,
      timestamp: new Date(),
      expiryDate: new Date(response.data.expiryDate)
    };
  } catch (error) {
    logger.error('Error processing Zomato credits', { error: error.message });
    
    return {
      success: false,
      error: 'Unable to add Zomato credits'
    };
  }
}

module.exports = {
  processRefund,
  checkPaymentStatus,
  processCredits
};