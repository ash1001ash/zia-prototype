// modules/escalationManager.js

const logger = require('../utilities/logger');
const config = require('../config/appConfig');
const axios = require('axios');

/**
 * Initiate escalation to human support
 * @param {object} session - Current session data
 * @returns {string} Escalation response message
 */
async function initiateEscalation(session) {
  try {
    logger.info('Initiating escalation to human support', { 
      sessionId: session.sessionId,
      customerId: session.customerId,
      orderIds: session.orderIds
    });
    
    // Get customer's first name
    const firstName = session.customerInfo.name.split(' ')[0];
    
    // In demo mode, simulate escalation
    if (config.demoMode) {
      // Log the escalation
      logger.info('Escalation initiated (DEMO MODE)', {
        sessionId: session.sessionId,
        escalationType: 'CUSTOMER_REQUEST',
        ticketId: `esc_${Date.now()}_${Math.floor(Math.random() * 1000)}`
      });
      
      // Return escalation message
      return `I understand you'd like to speak with a human support agent, ${firstName}. I'm escalating your case to our support team now. A support specialist will join this conversation shortly to assist you further. They'll have full access to our conversation history so you won't need to repeat your issue. Thank you for your patience.`;
    }
    
    // In production, create an escalation ticket in the support system
    const escalationData = {
      customerId: session.customerId,
      orderIds: session.orderIds,
      conversationHistory: session.conversationHistory,
      resolutions: session.resolutions,
      priority: determinePriority(session),
      escalationType: 'CUSTOMER_REQUEST',
      timestamp: new Date()
    };
    
    // Call the escalation API
    const response = await axios.post(
      `${config.supportApiBaseUrl}/escalations`,
      escalationData,
      {
        headers: {
          'Authorization': `Bearer ${config.internalApiKey}`
        }
      }
    );
    
    logger.info('Escalation created successfully', {
      ticketId: response.data.ticketId,
      estimatedWaitTime: response.data.estimatedWaitTime
    });
    
    // Format wait time message
    let waitTimeMessage = '';
    if (response.data.estimatedWaitTime) {
      const waitMinutes = Math.ceil(response.data.estimatedWaitTime / 60);
      waitTimeMessage = ` The current estimated wait time is ${waitMinutes} minute${waitMinutes !== 1 ? 's' : ''}.`;
    }
    
    // Return escalation message with ticket ID and wait time
    return `I understand you'd like to speak with a human support agent, ${firstName}. I'm escalating your case to our support team now. Your ticket ID is ${response.data.ticketId}.${waitTimeMessage} A support specialist will join this conversation shortly to assist you further. They'll have full access to our conversation history so you won't need to repeat your issue. Thank you for your patience.`;
  } catch (error) {
    logger.error('Error initiating escalation', { error: error.message });
    
    // Return generic escalation message on error
    const firstName = session.customerInfo ? session.customerInfo.name.split(' ')[0] : 'there';
    
    return `I apologize for the inconvenience, ${firstName}. I'm escalating your case to our human support team now. A support specialist will reach out to you shortly to assist you further. Thank you for your patience.`;
  }
}

/**
 * Check if a session should be auto-escalated
 * @param {object} session - Current session data
 * @returns {boolean} Whether the session should be escalated
 */
function shouldAutoEscalate(session) {
  try {
    // Check if customer is premium tier
    if (session.customerInfo.membershipTier === 'PRO_PLUS') {
      return true;
    }
    
    // Check conversation history for signs of frustration
    const userMessages = session.conversationHistory
      .filter(msg => msg.role === 'user')
      .map(msg => msg.content.toLowerCase());
    
    // Count messages with frustration indicators
    const frustrationIndicators = [
      'speak to a human', 'speak to a person', 'talk to a manager', 
      'talk to a supervisor', 'this is ridiculous', 'this is unacceptable',
      'unhelpful', 'useless', 'waste of time', 'are you a bot'
    ];
    
    const frustrationCount = userMessages.reduce((count, message) => {
      if (frustrationIndicators.some(indicator => message.includes(indicator))) {
        return count + 1;
      }
      return count;
    }, 0);
    
    // Auto-escalate if multiple signs of frustration
    if (frustrationCount >= 2) {
      return true;
    }
    
    // Check for high-value orders
    if (session.orderDetails && session.orderDetails.length > 0) {
      const highValueOrder = session.orderDetails.some(
        order => order.totalAmount > config.thresholds.highValueOrder
      );
      
      if (highValueOrder) {
        return true;
      }
    }
    
    // Check for multiple resolutions in same session
    if (session.resolutions && session.resolutions.length >= 2) {
      return true;
    }
    
    // Default to no auto-escalation
    return false;
  } catch (error) {
    logger.error('Error checking auto-escalation', { error: error.message });
    
    // Default to no auto-escalation on error
    return false;
  }
}

/**
 * Determine priority level for escalation
 * @param {object} session - Current session data
 * @returns {string} Priority level (HIGH, MEDIUM, LOW)
 */
function determinePriority(session) {
  try {
    // Check customer tier
    if (session.customerInfo.membershipTier === 'PRO_PLUS') {
      return 'HIGH';
    }
    
    if (session.customerInfo.membershipTier === 'PRO') {
      return 'HIGH';
    }
    
    // Check conversation length
    if (session.conversationHistory.length > 10) {
      return 'HIGH'; // Long conversation suggests complex issue
    }
    
    // Check order value
    if (session.orderDetails && session.orderDetails.length > 0) {
      const highValueOrder = session.orderDetails.some(
        order => order.totalAmount > config.thresholds.highValueOrder
      );
      
      if (highValueOrder) {
        return 'HIGH';
      }
    }
    
    // Check for repeated issues
    if (session.customerInfo.complaintFrequency > 3) {
      return 'HIGH';
    }
    
    // Default to medium priority
    return 'MEDIUM';
  } catch (error) {
    logger.error('Error determining priority', { error: error.message });
    
    // Default to medium priority on error
    return 'MEDIUM';
  }
}

/**
 * Create notes for human agent
 * @param {object} session - Current session data
 * @returns {string} Formatted notes for human agent
 */
function createAgentNotes(session) {
  try {
    const notes = [];
    
    // Basic customer info
    notes.push(`Customer: ${session.customerInfo.name} (${session.customerInfo.membershipTier || 'REGULAR'})`);
    notes.push(`Customer ID: ${session.customerId}`);
    
    // Order info
    if (session.orderDetails && session.orderDetails.length > 0) {
      const latestOrder = session.orderDetails[0];
      notes.push(`Latest Order: #${latestOrder.id} from ${latestOrder.restaurantName}`);
      notes.push(`Order Status: ${latestOrder.status}`);
      notes.push(`Order Total: ₹${latestOrder.totalAmount.toFixed(2)}`);
    } else {
      notes.push('No order details available');
    }
    
    // Resolution history
    if (session.resolutions && session.resolutions.length > 0) {
      notes.push('\nResolutions Applied:');
      session.resolutions.forEach(resolution => {
        notes.push(`- ${resolution.type}: ₹${resolution.amount.toFixed(2)} for Order #${resolution.orderId}`);
      });
    }
    
    // Detected issues
    notes.push('\nDetected Issues:');
    const issues = [];
    
    // Analyze conversation history for issues
    const userMessages = session.conversationHistory
      .filter(msg => msg.role === 'user')
      .map(msg => msg.content.toLowerCase());
    
    if (userMessages.some(msg => msg.includes('wrong') || msg.includes('incorrect'))) {
      issues.push('Wrong items received');
    }
    
    if (userMessages.some(msg => msg.includes('missing'))) {
      issues.push('Missing items');
    }
    
    if (userMessages.some(msg => msg.includes('late') || msg.includes('delay'))) {
      issues.push('Late delivery');
    }
    
    if (userMessages.some(msg => msg.includes('refund'))) {
      issues.push('Refund requested');
    }
    
    if (issues.length === 0) {
      notes.push('- No specific issues detected');
    } else {
      issues.forEach(issue => {
        notes.push(`- ${issue}`);
      });
    }
    
    return notes.join('\n');
  } catch (error) {
    logger.error('Error creating agent notes', { error: error.message });
    
    // Return basic notes on error
    return `Customer: ${session.customerInfo.name}\nCustomer ID: ${session.customerId}\nIssue: Requires human assistance`;
  }
}

module.exports = {
  initiateEscalation,
  shouldAutoEscalate,
  determinePriority,
  createAgentNotes
};