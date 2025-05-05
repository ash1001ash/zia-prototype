// modules/conversationManager.js

const logger = require('../utilities/logger');

/**
 * Generate a welcome message for the customer
 * @param {object} customerInfo - Customer information
 * @param {array} orderDetails - Details of relevant orders
 * @returns {string} Welcome message
 */
function generateWelcomeMessage(customerInfo, orderDetails) {
  try {
    // Get customer's first name
    const firstName = customerInfo.name.split(' ')[0];
    
    // Determine time of day for greeting
    const hour = new Date().getHours();
    let greeting = 'Hello';
    
    if (hour < 12) {
      greeting = 'Good morning';
    } else if (hour < 17) {
      greeting = 'Good afternoon';
    } else {
      greeting = 'Good evening';
    }
    
    // Basic welcome if no order context
    if (!orderDetails || orderDetails.length === 0) {
      return `${greeting}, ${firstName}! I'm Zia, your Zomato support assistant. How can I help you today?`;
    }
    
    // Get the most recent order
    const latestOrder = orderDetails[0];
    
    // Check order status for contextual greeting
    if (latestOrder.status === 'DELIVERED') {
      const deliveryTime = new Date(latestOrder.deliveredAt);
      const now = new Date();
      const minutesSinceDelivery = Math.round((now - deliveryTime) / (1000 * 60));
      
      if (minutesSinceDelivery < 30) {
        return `${greeting}, ${firstName}! I'm Zia, your Zomato support assistant. I see your order from ${latestOrder.restaurantName} was delivered about ${minutesSinceDelivery} minutes ago. How can I help you with this order?`;
      } else {
        return `${greeting}, ${firstName}! I'm Zia, your Zomato support assistant. I see you recently received an order from ${latestOrder.restaurantName}. How can I help you today?`;
      }
    } else if (latestOrder.status === 'IN_TRANSIT') {
      return `${greeting}, ${firstName}! I'm Zia, your Zomato support assistant. I see your order from ${latestOrder.restaurantName} is currently on the way. How can I help you with this order?`;
    } else if (latestOrder.status === 'PREPARING') {
      return `${greeting}, ${firstName}! I'm Zia, your Zomato support assistant. I see your order from ${latestOrder.restaurantName} is currently being prepared. How can I help you today?`;
    } else {
      return `${greeting}, ${firstName}! I'm Zia, your Zomato support assistant. How can I help you today?`;
    }
  } catch (error) {
    logger.error('Error generating welcome message', { error: error.message });
    
    // Fallback welcome message
    return `Hello! I'm Zia, your Zomato support assistant. How can I help you today?`;
  }
}

/**
 * Generate a response for a resolution
 * @param {object} solution - Solution details
 * @param {object} resolutionResult - Result of applying the solution
 * @param {object} orderDetails - Order details
 * @returns {string} Response message
 */
function generateResolutionResponse(solution, resolutionResult, orderDetails) {
  try {
    if (!resolutionResult.success) {
      return `I'm very sorry, but I encountered an issue while trying to process the ${solution.type.toLowerCase()} for your order. Rest assured, I'm escalating this to our support team, and someone will contact you within the next 2 hours to resolve this issue. In the meantime, is there anything else I can help you with?`;
    }
    
    const restaurantName = orderDetails.restaurantName;
    const formattedAmount = formatCurrency(solution.amount);
    
    switch (solution.type) {
      case 'REFUND':
        return `I've processed a refund of ${formattedAmount} for your order from ${restaurantName}. The refund should be credited back to your original payment method within 3-5 business days, though it's often much quicker. I've also made a note about this issue to help prevent similar problems in the future. Is there anything else I can assist you with today?`;
        
      case 'REDELIVERY':
        return `I've arranged for a redelivery of the correct items from ${restaurantName}. Your food should arrive in approximately ${solution.estimatedTime} minutes. You'll receive tracking updates just like a regular order. I've also notified the restaurant about the issue to ensure they get it right this time. Is there anything else you need while you wait for your redelivery?`;
        
      case 'CREDIT':
        const bonusMessage = solution.bonusAmount 
          ? ` (including a bonus of ${formatCurrency(solution.bonusAmount)} for the inconvenience)`
          : '';
          
        return `I've added ${formattedAmount} in Zomato credits to your account${bonusMessage}. These credits will be automatically applied to your next order and are valid for 3 months. I've also reported this issue to help improve our service. Is there anything else I can help you with today?`;
        
      default:
        return `I've processed a solution for the issue with your order from ${restaurantName}. Is there anything else I can assist you with today?`;
    }
  } catch (error) {
    logger.error('Error generating resolution response', { error: error.message });
    
    // Fallback resolution message
    return `I've processed a resolution for your order. Is there anything else I can help you with today?`;
  }
}

/**
 * Generate a response for a refund
 * @param {object} refundResult - Result of the refund process
 * @param {object} orderDetails - Order details
 * @returns {string} Response message
 */
function generateRefundResponse(refundResult, orderDetails) {
  try {
    if (!refundResult.success) {
      return `I apologize, but I encountered an issue while processing your refund request. I'm escalating this to our support team, and someone will contact you within the next 2 hours to resolve this issue. In the meantime, is there anything else I can help you with?`;
    }
    
    const restaurantName = orderDetails.restaurantName;
    const formattedAmount = formatCurrency(refundResult.amount);
    const orderId = orderDetails.id;
    
    return `I've processed a refund of ${formattedAmount} for your order #${orderId} from ${restaurantName}. The refund will be credited back to your original payment method within 3-5 business days, though it's often much quicker. I've sent a confirmation email with all the refund details to your registered email address. Is there anything else I can assist you with today?`;
  } catch (error) {
    logger.error('Error generating refund response', { error: error.message });
    
    // Fallback refund message
    return `I've processed your refund request. The refund should be credited back to your original payment method within 3-5 business days. Is there anything else I can help you with?`;
  }
}

/**
 * Generate a response for order status
 * @param {object} currentStatus - Current status of the order
 * @param {object} orderDetails - Order details
 * @returns {string} Response message
 */
function generateOrderStatusResponse(currentStatus, orderDetails) {
  try {
    const restaurantName = orderDetails.restaurantName;
    const orderId = orderDetails.id;
    
    switch (currentStatus.status) {
      case 'CONFIRMED':
        return `Your order #${orderId} from ${restaurantName} has been confirmed. The restaurant will start preparing your food shortly. The estimated delivery time is ${formatTime(currentStatus.estimatedDeliveryTime)}. You'll receive updates as your order progresses.`;
        
      case 'PREPARING':
        return `Your order #${orderId} from ${restaurantName} is currently being prepared by the restaurant. The estimated delivery time is ${formatTime(currentStatus.estimatedDeliveryTime)}. I'll notify you once your order is picked up by the delivery partner.`;
        
      case 'READY_FOR_PICKUP':
        return `Your order #${orderId} from ${restaurantName} is ready and waiting for a delivery partner. The estimated delivery time is ${formatTime(currentStatus.estimatedDeliveryTime)}. A delivery partner should be assigned very soon.`;
        
      case 'IN_TRANSIT':
        const deliveryPartner = currentStatus.deliveryPartnerName;
        return `Your order #${orderId} from ${restaurantName} is on the way! ${deliveryPartner} is your delivery partner and is expected to deliver your order by ${formatTime(currentStatus.estimatedDeliveryTime)}. You can track the live location in your Zomato app.`;
        
      case 'DELIVERED':
        const deliveryTime = new Date(orderDetails.deliveredAt);
        const formattedDeliveryTime = formatTime(deliveryTime);
        return `Your order #${orderId} from ${restaurantName} was delivered at ${formattedDeliveryTime}. If you have any issues with your order, please let me know and I'll be happy to help.`;
        
      case 'CANCELLED':
        return `Your order #${orderId} from ${restaurantName} was cancelled. ${currentStatus.cancellationReason || 'No specific reason was provided.'}`;
        
      default:
        return `I'm checking the status of your order #${orderId} from ${restaurantName}. Let me know if you have any specific questions about it.`;
    }
  } catch (error) {
    logger.error('Error generating order status response', { error: error.message });
    
    // Fallback order status message
    return `I'm having trouble retrieving the detailed status of your order right now. You can check the latest status in your Zomato app. Is there something specific you'd like to know about your order?`;
  }
}

/**
 * Generate a response when no order is found
 * @returns {string} Response message
 */
function generateNoOrderFoundResponse() {
  return `I don't see any recent orders associated with your account. If you're inquiring about a specific order, could you please provide the order number? You can find this in your order confirmation email or in the Zomato app under your order history.`;
}

/**
 * Generate a response when verification fails
 * @param {string} reason - Reason for verification failure
 * @returns {string} Response message
 */
function generateVerificationFailedResponse(reason) {
  if (reason === 'Complaint received too long after delivery') {
    return `I apologize, but I'm unable to process this request as it's been too long since the order was delivered. For food quality and accuracy issues, we require customers to report them within 60 minutes of delivery. Is there anything else I can help you with today?`;
  } else if (reason === 'Customer risk score exceeds threshold') {
    return `I'm unable to process this request automatically at this time. I'm escalating this to our support team for further review, and someone will contact you shortly. Thank you for your patience.`;
  } else if (reason === 'Claimed missing items were not in the original order') {
    return `I've checked your order details, and I don't see the items you mentioned in your original order. Could you please confirm which items from your order are missing so I can help you better?`;
  } else {
    return `I'm unable to verify this issue automatically. Could you please provide more details about the problem you're experiencing with your order? This will help me assist you better.`;
  }
}

/**
 * Generate a response when a refund is rejected
 * @param {string} reason - Reason for refund rejection
 * @returns {string} Response message
 */
function generateRefundRejectionResponse(reason) {
  if (reason === 'Order has already been refunded') {
    return `I checked our records and found that a refund for this order has already been processed. It can take 3-5 business days for the refund to appear in your account, depending on your bank's processing times. If you haven't received it after 5 business days, please let me know.`;
  } else if (reason.includes('Order is more than')) {
    return `I apologize, but I'm unable to process a refund for this order as it exceeds our refund eligibility period. Our policy allows refunds for orders placed within the last 7 days. If you'd like to discuss this further, I can connect you with our support team.`;
  } else {
    return `I'm unable to process your refund request automatically at this time. I'm escalating this to our support team for further review, and someone will contact you shortly. Thank you for your patience.`;
  }
}

/**
 * Generate a general response
 * @param {object} intent - Detected intent
 * @param {object} entities - Extracted entities
 * @param {object} session - Session data
 * @returns {string} Response message
 */
function generateResponse(intent, entities, session) {
  try {
    // Get customer's first name
    const firstName = session.customerInfo.name.split(' ')[0];
    
    // Generate response based on intent confidence
    if (intent.confidence < 0.5) {
      return `I'm not quite sure I understand what you're asking about, ${firstName}. Could you please provide more details so I can help you better? If you're having an issue with an order, please let me know the specific problem.`;
    }
    
    // Generic responses for different intents
    switch (intent.type) {
      case 'GENERAL_QUERY':
        return `Thanks for reaching out, ${firstName}. I'm here to help with any food delivery issues or questions about your Zomato orders. What specifically can I assist you with today?`;
        
      default:
        return `I understand you're trying to ${intent.type.toLowerCase().replace('_', ' ')}. Could you please provide a few more details so I can assist you better?`;
    }
  } catch (error) {
    logger.error('Error generating general response', { error: error.message });
    
    // Fallback general message
    return `I'm here to help with any issues related to your Zomato orders. Could you please provide more details about how I can assist you today?`;
  }
}

/**
 * Generate an error response
 * @returns {string} Error response message
 */
function generateErrorResponse() {
  return `I apologize, but I'm experiencing a technical issue while processing your request. I'm escalating this to our support team, and someone will contact you shortly to resolve this issue. Thank you for your patience.`;
}

/**
 * Format currency value
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount) {
  return `₹${amount.toFixed(2)}`;
}

/**
 * Format time value
 * @param {Date|string} time - Time to format
 * @returns {string} Formatted time string
 */
function formatTime(time) {
  const date = typeof time === 'string' ? new Date(time) : time;
  
  const hours = date.getHours();
  const minutes = date.getMinutes();
  
  const formattedHours = hours % 12 || 12;
  const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
  const period = hours >= 12 ? 'PM' : 'AM';
  
  return `${formattedHours}:${formattedMinutes} ${period}`;
}

module.exports = {
  generateWelcomeMessage,
  generateResolutionResponse,
  generateRefundResponse,
  generateOrderStatusResponse,
  generateNoOrderFoundResponse,
  generateVerificationFailedResponse,
  generateRefundRejectionResponse,
  generateResponse,
  generateErrorResponse
};