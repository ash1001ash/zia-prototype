// modules/decisionEngine.js

const logger = require('../utilities/logger');
const config = require('../config/appConfig');

/**
 * Verify that a wrong order issue is valid
 * @param {object} orderDetails - Details of the order
 * @param {array} wrongItems - List of items claimed to be wrong
 * @param {object} customerInfo - Customer information
 * @returns {object} Verification result
 */
async function verifyWrongOrderIssue(orderDetails, wrongItems, customerInfo) {
  try {
    // If order is already marked as problematic, automatically verify
    if (orderDetails.problemFlag) {
      return {
        verified: true,
        reason: 'Order already flagged as problematic'
      };
    }
    
    // If customer is a high-tier member (e.g., Zomato Pro), trust them
    if (customerInfo.membershipTier === 'PRO' || customerInfo.membershipTier === 'PRO_PLUS') {
      return {
        verified: true,
        reason: 'Trusted customer tier'
      };
    }
    
    // Check if order was delivered recently (within verification window)
    const deliveryTime = new Date(orderDetails.deliveredAt);
    const now = new Date();
    const minutesSinceDelivery = (now - deliveryTime) / (1000 * 60);
    
    if (minutesSinceDelivery > config.verificationWindows.wrongOrder) {
      return {
        verified: false,
        reason: 'Complaint received too long after delivery'
      };
    }
    
    // Check customer history for fraudulent behavior
    if (customerInfo.fraudRiskScore > config.thresholds.fraudRiskScore) {
      return {
        verified: false,
        reason: 'Customer risk score exceeds threshold'
      };
    }
    
    // Check if complaint frequency is excessive
    if (customerInfo.complaintFrequency > config.thresholds.complaintFrequency) {
      // Add extra verification for frequent complainers
      // For demo purposes, we're just returning verified: true
      // In a real system, this might require additional proof
      logger.warn('High complaint frequency customer', { 
        customerId: customerInfo.id, 
        complaintFrequency: customerInfo.complaintFrequency 
      });
    }
    
    // In a real implementation, we might have more sophisticated checks:
    // - Driver GPS verification
    // - Restaurant order confirmation
    // - Image verification
    
    // For now, we'll trust the customer's report
    return {
      verified: true,
      reason: 'Customer report accepted'
    };
  } catch (error) {
    logger.error('Error verifying wrong order issue', { error: error.message });
    
    // Default to verification passed on error
    return {
      verified: true,
      reason: 'Verification error, giving benefit of doubt to customer'
    };
  }
}

/**
 * Verify that a missing item issue is valid
 * @param {object} orderDetails - Details of the order
 * @param {array} missingItems - List of items claimed to be missing
 * @param {object} customerInfo - Customer information
 * @returns {object} Verification result
 */
async function verifyMissingItemIssue(orderDetails, missingItems, customerInfo) {
  try {
    // Similar logic to verifyWrongOrderIssue
    
    // Check if the items claimed to be missing were actually ordered
    const orderedItems = orderDetails.items.map(item => item.name.toLowerCase());
    const validMissingItems = missingItems.filter(item =>
      orderedItems.includes(item.toLowerCase())
    );
    
    // If none of the claimed missing items were ordered, reject
    if (validMissingItems.length === 0 && missingItems.length > 0) {
      return {
        verified: false,
        reason: 'Claimed missing items were not in the original order'
      };
    }
    
    // Apply standard verification checks
    if (orderDetails.problemFlag) {
      return {
        verified: true,
        reason: 'Order already flagged as problematic'
      };
    }
    
    if (customerInfo.membershipTier === 'PRO' || customerInfo.membershipTier === 'PRO_PLUS') {
      return {
        verified: true,
        reason: 'Trusted customer tier'
      };
    }
    
    const deliveryTime = new Date(orderDetails.deliveredAt);
    const now = new Date();
    const minutesSinceDelivery = (now - deliveryTime) / (1000 * 60);
    
    if (minutesSinceDelivery > config.verificationWindows.missingItem) {
      return {
        verified: false,
        reason: 'Complaint received too long after delivery'
      };
    }
    
    if (customerInfo.fraudRiskScore > config.thresholds.fraudRiskScore) {
      return {
        verified: false,
        reason: 'Customer risk score exceeds threshold'
      };
    }
    
    return {
      verified: true,
      reason: 'Customer report accepted',
      validMissingItems
    };
  } catch (error) {
    logger.error('Error verifying missing item issue', { error: error.message });
    
    return {
      verified: true,
      reason: 'Verification error, giving benefit of doubt to customer'
    };
  }
}

/**
 * Verify that a late delivery issue is valid
 * @param {object} orderDetails - Details of the order
 * @param {object} customerInfo - Customer information
 * @returns {object} Verification result
 */
async function verifyLateDeliveryIssue(orderDetails, customerInfo) {
  try {
    // Check if the delivery was actually late
    const estimatedDeliveryTime = new Date(orderDetails.estimatedDeliveryTime);
    const actualDeliveryTime = new Date(orderDetails.deliveredAt);
    
    // Calculate lateness in minutes
    const latenessMinutes = (actualDeliveryTime - estimatedDeliveryTime) / (1000 * 60);
    
    // If delivery was on time or early, reject the complaint
    if (latenessMinutes <= 0) {
      return {
        verified: false,
        reason: 'Delivery was on time or early',
        latenessMinutes: 0
      };
    }
    
    // If lateness is within acceptable threshold, reject
    if (latenessMinutes < config.thresholds.acceptableLateness) {
      return {
        verified: false,
        reason: `Delivery was only ${Math.round(latenessMinutes)} minutes late, within acceptable range`,
        latenessMinutes
      };
    }
    
    // Verify if this complaint is being made within a reasonable timeframe
    const now = new Date();
    const hoursSinceDelivery = (now - actualDeliveryTime) / (1000 * 60 * 60);
    
    if (hoursSinceDelivery > config.verificationWindows.lateDeliveryHours) {
      return {
        verified: false,
        reason: 'Complaint received too long after delivery',
        latenessMinutes
      };
    }
    
    return {
      verified: true,
      reason: `Delivery was ${Math.round(latenessMinutes)} minutes late`,
      latenessMinutes
    };
  } catch (error) {
    logger.error('Error verifying late delivery issue', { error: error.message });
    
    return {
      verified: true,
      reason: 'Verification error, giving benefit of doubt to customer',
      latenessMinutes: 0
    };
  }
}

/**
 * Check if a refund is eligible
 * @param {object} orderDetails - Details of the order
 * @param {object} customerInfo - Customer information
 * @param {string} reason - Reason for the refund
 * @returns {object} Eligibility result
 */
async function checkRefundEligibility(orderDetails, customerInfo, reason) {
  try {
    // Check if order is already refunded
    if (orderDetails.refunded) {
      return {
        eligible: false,
        reason: 'Order has already been refunded'
      };
    }
    
    // Check if order is too old for refund
    const orderDate = new Date(orderDetails.orderedAt);
    const now = new Date();
    const daysSinceOrder = (now - orderDate) / (1000 * 60 * 60 * 24);
    
    if (daysSinceOrder > config.thresholds.refundEligibilityDays) {
      return {
        eligible: false,
        reason: `Order is more than ${config.thresholds.refundEligibilityDays} days old`
      };
    }
    
    // Calculate refund amount based on order age
    let refundPercentage = 100;
    
    // Reduce refund amount for older orders (unless customer is premium)
    if (customerInfo.membershipTier !== 'PRO' && customerInfo.membershipTier !== 'PRO_PLUS') {
      if (daysSinceOrder > 3) {
        refundPercentage = 50;
      } else if (daysSinceOrder > 1) {
        refundPercentage = 75;
      }
    }
    
    const refundAmount = (orderDetails.totalAmount * refundPercentage) / 100;
    
    return {
      eligible: true,
      amount: refundAmount,
      percentage: refundPercentage
    };
  } catch (error) {
    logger.error('Error checking refund eligibility', { error: error.message });
    
    return {
      eligible: false,
      reason: 'Error determining eligibility'
    };
  }
}

/**
 * Decide on the best solution for an issue
 * @param {string} issueType - Type of issue
 * @param {object} orderDetails - Details of the order
 * @param {object} customerInfo - Customer information
 * @param {object} entities - Extracted entities
 * @returns {object} Solution details
 */
async function decideSolution(issueType, orderDetails, customerInfo, entities) {
  try {
    // Get current time to check if redelivery is an option
    const now = new Date();
    const deliveryTime = orderDetails.deliveredAt ? new Date(orderDetails.deliveredAt) : null;
    
    // Determine if the restaurant is still open
    const restaurantOpenUntil = new Date(orderDetails.restaurantCloseTime);
    const restaurantIsOpen = now < restaurantOpenUntil;
    
    // Calculate minutes since delivery (if delivered)
    const minutesSinceDelivery = deliveryTime ? (now - deliveryTime) / (1000 * 60) : 0;
    
    // Determine if redelivery is an option based on time
    const redeliveryIsPossible = restaurantIsOpen && 
                               minutesSinceDelivery < config.thresholds.redeliveryWindowMinutes;
    
    // For wrong orders or missing items
    if (issueType === 'WRONG_ORDER' || issueType === 'MISSING_ITEM') {
      // Start with determining the affected amount
      let affectedAmount = 0;
      
      if (issueType === 'WRONG_ORDER') {
        // For wrong orders, default to full refund unless specific items are mentioned
        affectedAmount = entities.wrongItems && entities.wrongItems.length > 0
          ? calculateAffectedItemsAmount(orderDetails, entities.wrongItems)
          : orderDetails.totalAmount;
      } else {
        // For missing items, calculate the value of the missing items
        affectedAmount = calculateAffectedItemsAmount(orderDetails, entities.missingItems);
      }
      
      // If redelivery is possible, offer it as an option
      if (redeliveryIsPossible) {
        return {
          type: 'REDELIVERY',
          amount: affectedAmount,
          reason: `${issueType === 'WRONG_ORDER' ? 'Wrong items' : 'Missing items'} in order`,
          estimatedTime: 35 // minutes, would be calculated based on restaurant metrics
        };
      }
      
      // If customer is a premium member, give extra credit
      if (customerInfo.membershipTier === 'PRO' || customerInfo.membershipTier === 'PRO_PLUS') {
        const bonusAmount = Math.min(
          affectedAmount * config.compensationRates.premiumBonus, 
          config.thresholds.maxBonusAmount
        );
        
        return {
          type: 'CREDIT',
          amount: affectedAmount + bonusAmount,
          reason: `${issueType === 'WRONG_ORDER' ? 'Wrong items' : 'Missing items'} in order`,
          bonusAmount
        };
      }
      
      // Default to refund
      return {
        type: 'REFUND',
        amount: affectedAmount,
        reason: `${issueType === 'WRONG_ORDER' ? 'Wrong items' : 'Missing items'} in order`
      };
    }
    
    // For late delivery
    if (issueType === 'LATE_DELIVERY') {
      const latenessMinutes = entities.latenessMinutes || 0;
      
      // Calculate compensation based on lateness
      let compensationRate = 0;
      
      if (latenessMinutes > 60) {
        compensationRate = config.compensationRates.veryLate;
      } else if (latenessMinutes > 30) {
        compensationRate = config.compensationRates.moderatelyLate;
      } else if (latenessMinutes > 15) {
        compensationRate = config.compensationRates.slightlyLate;
      }
      
      const compensationAmount = Math.min(
        orderDetails.totalAmount * compensationRate,
        config.thresholds.maxLateFee
      );
      
      // For extreme lateness, offer full refund
      if (latenessMinutes > 90) {
        return {
          type: 'REFUND',
          amount: orderDetails.totalAmount,
          reason: `Extreme delivery delay (${Math.round(latenessMinutes)} minutes late)`
        };
      }
      
      // For moderate to significant lateness, offer credit with bonus
      return {
        type: 'CREDIT',
        amount: compensationAmount,
        reason: `Delivery delay (${Math.round(latenessMinutes)} minutes late)`
      };
    }
    
    // Default solution if no specific logic matches
    return {
      type: 'CREDIT',
      amount: orderDetails.deliveryFee || 50,
      reason: 'Compensation for inconvenience'
    };
  } catch (error) {
    logger.error('Error deciding solution', { error: error.message });
    
    // Default solution on error
    return {
      type: 'CREDIT',
      amount: 100,
      reason: 'Standard compensation'
    };
  }
}

/**
 * Calculate the amount for affected items
 * @param {object} orderDetails - Details of the order
 * @param {array} itemNames - Names of affected items
 * @returns {number} Total amount for affected items
 */
function calculateAffectedItemsAmount(orderDetails, itemNames) {
  if (!itemNames || itemNames.length === 0) {
    return 0;
  }
  
  let totalAmount = 0;
  
  // Convert item names to lowercase for case-insensitive matching
  const lowerCaseItemNames = itemNames.map(name => name.toLowerCase());
  
  // Calculate total for affected items
  orderDetails.items.forEach(item => {
    if (lowerCaseItemNames.some(name => item.name.toLowerCase().includes(name))) {
      totalAmount += item.price * item.quantity;
    }
  });
  
  // If no specific items were matched but items were specified,
  // return a percentage of the total order
  if (totalAmount === 0 && itemNames.length > 0) {
    return orderDetails.totalAmount * 0.3; // 30% of order value as default
  }
  
  return totalAmount;
}

module.exports = {
  verifyWrongOrderIssue,
  verifyMissingItemIssue,
  verifyLateDeliveryIssue,
  checkRefundEligibility,
  decideSolution
};