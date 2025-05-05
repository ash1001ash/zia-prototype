// modules/customerManager.js

const logger = require('../utilities/logger');
const config = require('../config/appConfig');
const axios = require('axios');

/**
 * Get customer information
 * @param {string} customerId - ID of the customer
 * @returns {object} Customer information
 */
async function getCustomerInfo(customerId) {
  try {
    logger.info('Fetching customer information', { customerId });
    
    // In demo mode, return mock data
    if (config.demoMode) {
      return getMockCustomerInfo(customerId);
    }
    
    // In production, call the customer service API
    const response = await axios.get(
      `${config.apiBaseUrl}/customers/${customerId}`,
      {
        headers: {
          'Authorization': `Bearer ${config.internalApiKey}`
        }
      }
    );
    
    return response.data;
  } catch (error) {
    logger.error('Error fetching customer information', { error: error.message, customerId });
    
    // Return minimal mock data if real data fetch fails
    return {
      id: customerId,
      name: 'Customer',
      email: 'customer@example.com',
      membershipTier: 'REGULAR',
      error: 'Unable to retrieve customer information'
    };
  }
}

/**
 * Add Zomato credits to a customer account
 * @param {string} customerId - ID of the customer
 * @param {number} amount - Amount to add
 * @param {string} reason - Reason for adding credits
 * @returns {object} Result of the credit addition
 */
async function addZomatoCredits(customerId, amount, reason) {
  try {
    logger.info('Adding Zomato credits', { customerId, amount, reason });
    
    // In demo mode, return success
    if (config.demoMode) {
      return {
        success: true,
        creditId: `cred_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        amount,
        expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days from now
      };
    }
    
    // In production, call the credits API
    const response = await axios.post(
      `${config.apiBaseUrl}/customers/${customerId}/credits`,
      {
        amount,
        reason,
        expiryDays: 90
      },
      {
        headers: {
          'Authorization': `Bearer ${config.internalApiKey}`
        }
      }
    );
    
    return {
      success: true,
      creditId: response.data.creditId,
      amount,
      expiryDate: new Date(response.data.expiryDate)
    };
  } catch (error) {
    logger.error('Error adding Zomato credits', { error: error.message, customerId });
    
    return {
      success: false,
      error: 'Unable to add Zomato credits'
    };
  }
}

/**
 * Update customer complaint history
 * @param {string} customerId - ID of the customer
 * @param {string} orderId - ID of the order
 * @param {string} complaintType - Type of complaint
 * @param {boolean} resolved - Whether the complaint was resolved
 * @returns {boolean} Success status
 */
async function updateComplaintHistory(customerId, orderId, complaintType, resolved) {
  try {
    logger.info('Updating customer complaint history', { 
      customerId, 
      orderId, 
      complaintType, 
      resolved 
    });
    
    // In demo mode, return success
    if (config.demoMode) {
      return true;
    }
    
    // In production, call the customer service API
    await axios.post(
      `${config.apiBaseUrl}/customers/${customerId}/complaints`,
      {
        orderId,
        complaintType,
        resolved,
        timestamp: new Date()
      },
      {
        headers: {
          'Authorization': `Bearer ${config.internalApiKey}`
        }
      }
    );
    
    return true;
  } catch (error) {
    logger.error('Error updating complaint history', { error: error.message, customerId });
    
    return false;
  }
}

/**
 * Get customer complaint history
 * @param {string} customerId - ID of the customer
 * @returns {array} Complaint history
 */
async function getComplaintHistory(customerId) {
  try {
    logger.info('Fetching customer complaint history', { customerId });
    
    // In demo mode, return mock data
    if (config.demoMode) {
      return getMockComplaintHistory(customerId);
    }
    
    // In production, call the customer service API
    const response = await axios.get(
      `${config.apiBaseUrl}/customers/${customerId}/complaints`,
      {
        headers: {
          'Authorization': `Bearer ${config.internalApiKey}`
        }
      }
    );
    
    return response.data;
  } catch (error) {
    logger.error('Error fetching complaint history', { error: error.message, customerId });
    
    return [];
  }
}

/**
 * Get customer loyalty information
 * @param {string} customerId - ID of the customer
 * @returns {object} Loyalty information
 */
async function getLoyaltyInfo(customerId) {
  try {
    logger.info('Fetching customer loyalty information', { customerId });
    
    // In demo mode, return mock data
    if (config.demoMode) {
      return getMockLoyaltyInfo(customerId);
    }
    
    // In production, call the loyalty service API
    const response = await axios.get(
      `${config.apiBaseUrl}/customers/${customerId}/loyalty`,
      {
        headers: {
          'Authorization': `Bearer ${config.internalApiKey}`
        }
      }
    );
    
    return response.data;
  } catch (error) {
    logger.error('Error fetching loyalty information', { error: error.message, customerId });
    
    return {
      tier: 'REGULAR',
      points: 0,
      error: 'Unable to retrieve loyalty information'
    };
  }
}

// Helper functions for mock data

/**
 * Get mock customer information for demo mode
 * @param {string} customerId - ID of the customer
 * @returns {object} Mock customer information
 */
function getMockCustomerInfo(customerId) {
  // Generate a consistent customer based on the customer ID
  const customerIdNum = parseInt(customerId.replace(/\D/g, '')) || 12345;
  
  // Determine membership tier based on customer ID
  const tierOptions = ['REGULAR', 'PRO', 'PRO_PLUS'];
  const tierIndex = customerIdNum % tierOptions.length;
  const membershipTier = tierOptions[tierIndex];
  
  // Generate a name
  const firstNames = ['Rahul', 'Priya', 'Amit', 'Sneha', 'Raj', 'Ananya', 'Vikram', 'Neha'];
  const lastNames = ['Sharma', 'Patel', 'Singh', 'Kumar', 'Joshi', 'Shah', 'Gupta', 'Verma'];
  
  const firstNameIndex = customerIdNum % firstNames.length;
  const lastNameIndex = (customerIdNum + 3) % lastNames.length;
  
  const firstName = firstNames[firstNameIndex];
  const lastName = lastNames[lastNameIndex];
  const name = `${firstName} ${lastName}`;
  
  // Generate an email
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`;
  
  // Calculate fraud risk score and complaint frequency based on customer ID
  const fraudRiskScore = (customerIdNum % 10) / 10; // Between 0.0 and 0.9
  const complaintFrequency = customerIdNum % 8; // Between 0 and 7
  
  return {
    id: customerId,
    name,
    email,
    phone: `+91 9${Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')}`,
    membershipTier,
    joinedDate: new Date(Date.now() - (customerIdNum % 1000) * 24 * 60 * 60 * 1000), // Random date in the past
    orderCount: 10 + (customerIdNum % 90), // Between 10 and 99
    fraudRiskScore,
    complaintFrequency,
    preferredLanguage: 'en',
    savedAddresses: [
      {
        type: 'HOME',
        address: `${customerIdNum} Park Street, Sector ${customerIdNum % 100 + 1}`,
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: `40000${customerIdNum % 10}`
      },
      {
        type: 'WORK',
        address: `${customerIdNum + 100} Business Park, ${(customerIdNum + 5) % 20 + 1}th Floor`,
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: `40001${customerIdNum % 10}`
      }
    ]
  };
}

/**
 * Get mock complaint history for demo mode
 * @param {string} customerId - ID of the customer
 * @returns {array} Mock complaint history
 */
function getMockComplaintHistory(customerId) {
  const customerIdNum = parseInt(customerId.replace(/\D/g, '')) || 12345;
  const complaintCount = customerIdNum % 8; // Between 0 and 7
  
  const complaints = [];
  const complaintTypes = ['WRONG_ORDER', 'MISSING_ITEM', 'LATE_DELIVERY', 'QUALITY_ISSUE', 'PACKAGING_ISSUE'];
  
  // Generate a few mock complaints
  for (let i = 0; i < complaintCount; i++) {
    const orderId = `order_${Date.now() - i * 24 * 60 * 60 * 1000}_${i}`;
    const typeIndex = (customerIdNum + i) % complaintTypes.length;
    
    complaints.push({
      orderId,
      complaintType: complaintTypes[typeIndex],
      timestamp: new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000), // Every week in the past
      resolved: i % 3 !== 0, // 2/3 of complaints are resolved
      resolution: i % 3 !== 0 ? (i % 2 === 0 ? 'REFUND' : 'CREDIT') : null
    });
  }
  
  return complaints;
}

/**
 * Get mock loyalty information for demo mode
 * @param {string} customerId - ID of the customer
 * @returns {object} Mock loyalty information
 */
function getMockLoyaltyInfo(customerId) {
  const customerIdNum = parseInt(customerId.replace(/\D/g, '')) || 12345;
  
  // Determine tier based on customer ID (same as in getCustomerInfo)
  const tierOptions = ['REGULAR', 'PRO', 'PRO_PLUS'];
  const tierIndex = customerIdNum % tierOptions.length;
  const tier = tierOptions[tierIndex];
  
  // Calculate points based on customer ID
  const points = 100 + (customerIdNum % 900); // Between 100 and 999
  
  // Calculate tier expiry date
  const now = new Date();
  const expiryDate = new Date(now.getFullYear(), now.getMonth() + 6, now.getDate());
  
  return {
    customerId,
    tier,
    points,
    tierExpiryDate: expiryDate,
    pointsExpiryDate: expiryDate,
    lifetimePoints: points * 3,
    nextTierThreshold: tier === 'PRO_PLUS' ? null : (tier === 'PRO' ? 2000 : 1000)
  };
}

module.exports = {
  getCustomerInfo,
  addZomatoCredits,
  updateComplaintHistory,
  getComplaintHistory,
  getLoyaltyInfo
};