// Zia - Zomato Intelligent Assistant
// Minimal implementation with Supabase integration

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

// Import custom modules
const database = require('./modules/database');
const languageProcessor = require('./modules/languageProcessor');
const orderManager = require('./modules/orderManager');
const conversationManager = require('./modules/conversationManager');
const decisionEngine = require('./modules/decisionEngine');
const paymentProcessor = require('./modules/paymentProcessor');
const customerManager = require('./modules/customerManager');
const restaurantManager = require('./modules/restaurantManager');
const escalationManager = require('./modules/escalationManager');
const logger = require('./utilities/logger');
const config = require('./config/appConfig');

// Initialize Express app
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Initialize session store (for demo mode only)
const sessions = {};

// Initialize database connection
(async () => {
  try {
    await database.initializeDatabase();
  } catch (error) {
    logger.error('Failed to initialize database', { error: error.message });
    // In production, we might want to exit the process here
    // process.exit(1);
  }
})();

// API endpoints
app.post('/api/conversation/start', async (req, res) => {
  try {
    const { customerId, orderIds = [] } = req.body;
    
    // Generate session ID
    const sessionId = uuidv4();
    
    // Get customer information
    const customerInfo = await customerManager.getCustomerInfo(customerId);
    
    // Get order details if provided
    let orderDetails = [];
    if (orderIds.length > 0) {
      orderDetails = await Promise.all(
        orderIds.map(orderId => orderManager.getOrderDetails(orderId))
      );
    }
    
    // Create session object
    const sessionData = {
      sessionId,
      customerId,
      customerInfo,
      orderIds,
      orderDetails,
      conversationHistory: [],
      createdAt: new Date(),
      lastActivityAt: new Date(),
      status: 'active',
      escalated: false,
      resolutions: []
    };
    
    // Store session - either in memory (demo mode) or database
    if (config.demoMode) {
      sessions[sessionId] = sessionData;
    } else {
      await database.createSession(sessionData);
    }
    
    // Generate welcome message
    const welcomeMessage = conversationManager.generateWelcomeMessage(customerInfo, orderDetails);
    
    // Add welcome message to conversation history
    const assistantMessage = {
      role: 'assistant',
      content: welcomeMessage,
      timestamp: new Date()
    };
    
    if (config.demoMode) {
      sessions[sessionId].conversationHistory.push(assistantMessage);
    } else {
      await database.addMessageToSession(sessionId, assistantMessage);
    }
    
    // Log the session creation
    logger.info('Session created', { sessionId, customerId, orderIds });
    
    res.json({
      sessionId,
      message: welcomeMessage
    });
  } catch (error) {
    logger.error('Error starting conversation', { error: error.message });
    res.status(500).json({
      error: 'Failed to start conversation',
      details: error.message
    });
  }
});

app.post('/api/conversation/message', async (req, res) => {
  try {
    const { sessionId, message } = req.body;
    
    // Get session data - either from memory (demo mode) or database
    let session;
    if (config.demoMode) {
      session = sessions[sessionId];
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
    } else {
      session = await database.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
    }
    
    // Update session last activity
    session.lastActivityAt = new Date();
    
    // Add user message to conversation history
    const userMessage = {
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    
    if (config.demoMode) {
      session.conversationHistory.push(userMessage);
    } else {
      await database.addMessageToSession(sessionId, userMessage);
    }
    
    // Process the message
    const intent = await languageProcessor.detectIntent(message, session);
    const entities = await languageProcessor.extractEntities(message, session);
    const sentiment = await languageProcessor.analyzeSentiment(message);
    
    // Log the intent and entities
    logger.info('Message processed', { 
      sessionId, 
      intent, 
      entities,
      sentiment: sentiment.score 
    });
    
    // For simplified prototype, we'll implement just a few intent handlers
    let response;
    
    switch (intent.type) {
      case 'WRONG_ORDER':
        response = await handleWrongOrderIntent(session, entities);
        break;
        
      case 'MISSING_ITEM':
        response = "I understand there are missing items in your order. Let me help you with that. I'll process a refund for the missing items right away. You should receive the refund in your original payment method within 3-5 business days.";
        break;
        
      case 'LATE_DELIVERY':
        response = "I'm sorry your delivery was delayed. As compensation, I've added 100 Zomato credits to your account which you can use on your next order. These credits are valid for 3 months.";
        break;
        
      case 'REFUND_REQUEST':
        response = "I've processed a full refund for your order. The refund should be credited back to your original payment method within 3-5 business days. I apologize for the inconvenience caused.";
        break;
        
      case 'ESCALATION_REQUEST':
        session.escalated = true;
        response = "I understand you'd like to speak with a human agent. I'm connecting you with our support team now. A support specialist will join this conversation shortly to assist you further.";
        break;
        
      case 'ORDER_STATUS':
        response = "Your order is currently being prepared by the restaurant and should be picked up by our delivery partner soon. The estimated delivery time is 30 minutes from now.";
        break;
        
      case 'GENERAL_QUERY':
      default:
        response = "Thank you for your message. How can I assist you with your Zomato order today?";
        break;
    }
    
    // Add AI response to conversation history
    const assistantMessage = {
      role: 'assistant',
      content: response,
      timestamp: new Date()
    };
    
    if (config.demoMode) {
      session.conversationHistory.push(assistantMessage);
    } else {
      await database.addMessageToSession(sessionId, assistantMessage);
    }
    
    res.json({ 
      response,
      escalated: session.escalated
    });
  } catch (error) {
    logger.error('Error processing message', { error: error.message });
    res.status(500).json({
      error: 'Failed to process message',
      details: error.message
    });
  }
});

app.post('/api/conversation/end', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    // Get session data - either from memory (demo mode) or database
    let session;
    if (config.demoMode) {
      session = sessions[sessionId];
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
    } else {
      session = await database.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
    }
    
    // Update session status
    if (config.demoMode) {
      // Archive session data for analytics
      logger.info('Session ended', { 
        sessionId, 
        duration: new Date() - session.createdAt,
        messageCount: session.conversationHistory.length,
        resolutionsApplied: session.resolutions.length,
        wasEscalated: session.escalated
      });
      
      // Remove session from memory
      delete sessions[sessionId];
    } else {
      await database.updateSession(sessionId, { status: 'ended' });
      
      logger.info('Session ended', { 
        sessionId, 
        duration: new Date() - new Date(session.createdAt),
        messageCount: session.conversationHistory.length,
        resolutionsApplied: session.resolutions.length,
        wasEscalated: session.escalated
      });
    }
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Error ending conversation', { error: error.message });
    res.status(500).json({
      error: 'Failed to end conversation',
      details: error.message
    });
  }
});

// Simplified wrong order intent handler
async function handleWrongOrderIntent(session, entities) {
  try {
    // Get order ID
    const orderId = entities.orderId || (session.orderIds.length > 0 ? session.orderIds[0] : null);
    
    if (!orderId) {
      return "I don't see any recent orders associated with your account. Please provide your order number so I can help you better.";
    }
    
    // Get mock order details
    const orderDetails = await orderManager.getOrderDetails(orderId);
    
    // Record a resolution
    const resolution = {
      type: 'REFUND',
      orderId,
      amount: orderDetails.totalAmount,
      timestamp: new Date(),
      success: true
    };
    
    if (config.demoMode) {
      session.resolutions.push(resolution);
    } else {
      await database.addResolutionToSession(session.sessionId, resolution);
      
      // Log resolution for analytics
      await database.logResolution({
        sessionId: session.sessionId,
        customerId: session.customerId,
        orderId,
        resolutionType: 'REFUND',
        amount: orderDetails.totalAmount,
        reason: 'Wrong order received',
        agentType: 'AI',
        success: true,
        metadata: {
          restaurantId: orderDetails.restaurantId,
          issueType: 'WRONG_ORDER',
          items: entities.wrongItems
        }
      });
    }
    
    // Generate response
    return `I'm very sorry about the wrong order you received. I've processed a full refund of ₹${orderDetails.totalAmount.toFixed(2)} for your order from ${orderDetails.restaurantName}. The refund should be credited back to your original payment method within 3-5 business days. I've also notified the restaurant about this issue to prevent it from happening again. Is there anything else I can help you with today?`;
  } catch (error) {
    logger.error('Error handling wrong order intent', { error: error.message });
    return "I apologize, but I'm experiencing a technical issue while processing your request. Please try again in a few moments or contact our customer support team directly.";
  }
}

// Add a simple frontend for testing
app.use(express.static('public'));

// Start the server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Zia is running on port ${PORT}`);
  logger.info(`Server started on port ${PORT}`);
});

module.exports = app;