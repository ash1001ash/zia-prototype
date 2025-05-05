// modules/languageProcessor.js

const { NlpManager } = require('node-nlp');
const sentiment = require('sentiment');
const logger = require('../utilities/logger');

// Initialize NLP manager
const manager = new NlpManager({ languages: ['en'], forceNER: true });

// Train the NLP manager with intents and entities
// In a production environment, this would be loaded from a database or file
function initializeNLP() {
  // Add intents
  manager.addDocument('en', 'my order is wrong', 'WRONG_ORDER');
  manager.addDocument('en', 'I received the wrong food', 'WRONG_ORDER');
  manager.addDocument('en', 'they sent me the wrong items', 'WRONG_ORDER');
  manager.addDocument('en', 'my order has the incorrect items', 'WRONG_ORDER');
  manager.addDocument('en', 'this is not what I ordered', 'WRONG_ORDER');
  manager.addDocument('en', 'I got someone else\'s order', 'WRONG_ORDER');
  manager.addDocument('en', 'the restaurant mixed up my order', 'WRONG_ORDER');
  
  manager.addDocument('en', 'items are missing from my order', 'MISSING_ITEM');
  manager.addDocument('en', 'my order is incomplete', 'MISSING_ITEM');
  manager.addDocument('en', 'I didn\'t receive all my items', 'MISSING_ITEM');
  manager.addDocument('en', 'something is missing from my delivery', 'MISSING_ITEM');
  manager.addDocument('en', 'they forgot to include my', 'MISSING_ITEM');
  
  manager.addDocument('en', 'my order is late', 'LATE_DELIVERY');
  manager.addDocument('en', 'where is my food', 'LATE_DELIVERY');
  manager.addDocument('en', 'the delivery is taking too long', 'LATE_DELIVERY');
  manager.addDocument('en', 'my delivery was supposed to arrive', 'LATE_DELIVERY');
  manager.addDocument('en', 'why is my order delayed', 'LATE_DELIVERY');
  
  manager.addDocument('en', 'I want a refund', 'REFUND_REQUEST');
  manager.addDocument('en', 'can I get my money back', 'REFUND_REQUEST');
  manager.addDocument('en', 'please refund my order', 'REFUND_REQUEST');
  manager.addDocument('en', 'I want to be refunded', 'REFUND_REQUEST');
  manager.addDocument('en', 'return my payment', 'REFUND_REQUEST');
  
  manager.addDocument('en', 'I want to speak to a manager', 'ESCALATION_REQUEST');
  manager.addDocument('en', 'let me talk to a supervisor', 'ESCALATION_REQUEST');
  manager.addDocument('en', 'escalate this issue', 'ESCALATION_REQUEST');
  manager.addDocument('en', 'I\'m not satisfied with this response', 'ESCALATION_REQUEST');
  manager.addDocument('en', 'I need to speak with someone else', 'ESCALATION_REQUEST');
  
  manager.addDocument('en', 'where is my order', 'ORDER_STATUS');
  manager.addDocument('en', 'track my order', 'ORDER_STATUS');
  manager.addDocument('en', 'what\'s the status of my delivery', 'ORDER_STATUS');
  manager.addDocument('en', 'has my order been picked up yet', 'ORDER_STATUS');
  manager.addDocument('en', 'when will my food arrive', 'ORDER_STATUS');
  
  // Add entities
  manager.addNamedEntityText('foodItem', 'burger', ['en'], ['burger', 'hamburger', 'cheeseburger']);
  manager.addNamedEntityText('foodItem', 'pizza', ['en'], ['pizza', 'pie', 'pizza pie']);
  manager.addNamedEntityText('foodItem', 'pasta', ['en'], ['pasta', 'spaghetti', 'noodles']);
  manager.addNamedEntityText('foodItem', 'salad', ['en'], ['salad', 'green salad']);
  manager.addNamedEntityText('foodItem', 'rice', ['en'], ['rice', 'rice bowl']);
  manager.addNamedEntityText('foodItem', 'sandwich', ['en'], ['sandwich', 'sub', 'hoagie']);
  manager.addNamedEntityText('foodItem', 'taco', ['en'], ['taco', 'burrito', 'quesadilla']);
  manager.addNamedEntityText('foodItem', 'drink', ['en'], ['drink', 'soda', 'beverage', 'coke', 'pepsi']);
  
  manager.addNamedEntityText('orderIssue', 'cold', ['en'], ['cold', 'not hot', 'cool', 'lukewarm']);
  manager.addNamedEntityText('orderIssue', 'spill', ['en'], ['spill', 'spilled', 'leaked', 'leaking']);
  manager.addNamedEntityText('orderIssue', 'quality', ['en'], ['bad', 'poor quality', 'not fresh', 'stale']);
  
  // Train and save the model
  return manager.train();
}

// Initialize once when the module is loaded
let initialized = false;
async function ensureInitialized() {
  if (!initialized) {
    await initializeNLP();
    initialized = true;
    logger.info('NLP manager trained and ready');
  }
}

/**
 * Detect the intent of a message
 * @param {string} message - The message to analyze
 * @param {object} session - The current session data
 * @returns {object} The detected intent
 */
async function detectIntent(message, session) {
  await ensureInitialized();
  
  try {
    // Process the message with NLP
    const result = await manager.process('en', message);
    
    // Get the top intent
    const topIntent = result.intent;
    const score = result.score;
    
    // If confidence is too low, default to general query
    if (score < 0.7) {
      return {
        type: 'GENERAL_QUERY',
        confidence: score,
        original: message
      };
    }
    
    return {
      type: topIntent,
      confidence: score,
      original: message
    };
  } catch (error) {
    logger.error('Error detecting intent', { error: error.message, message });
    
    // Default to general query on error
    return {
      type: 'GENERAL_QUERY',
      confidence: 0,
      original: message
    };
  }
}

/**
 * Extract entities from a message
 * @param {string} message - The message to analyze
 * @param {object} session - The current session data
 * @returns {object} The extracted entities
 */
async function extractEntities(message, session) {
  await ensureInitialized();
  
  try {
    // Process the message with NLP
    const result = await manager.process('en', message);
    
    // Extract entities
    const entities = result.entities || [];
    
    // Convert to a more usable format
    const processedEntities = {
      orderId: null,
      wrongItems: [],
      missingItems: [],
      issues: [],
      reason: null
    };
    
    // Process each entity
    entities.forEach(entity => {
      // Extract order ID if it matches a pattern
      if (entity.entity === 'number' && message.toLowerCase().includes('order')) {
        processedEntities.orderId = entity.utteranceText;
      }
      
      // Extract food items
      if (entity.entity === 'foodItem') {
        // Determine if it's a wrong item or missing item based on context
        if (result.intent === 'WRONG_ORDER') {
          processedEntities.wrongItems.push(entity.utteranceText);
        } else if (result.intent === 'MISSING_ITEM') {
          processedEntities.missingItems.push(entity.utteranceText);
        }
      }
      
      // Extract order issues
      if (entity.entity === 'orderIssue') {
        processedEntities.issues.push(entity.utteranceText);
      }
    });
    
    // Extract refund reason from refund request
    if (result.intent === 'REFUND_REQUEST') {
      // Simple extraction based on common patterns
      if (message.includes('because')) {
        processedEntities.reason = message.split('because')[1].trim();
      } else if (message.includes('as')) {
        processedEntities.reason = message.split('as')[1].trim();
      }
    }
    
    // If order ID wasn't found, try to extract it using regex
    if (!processedEntities.orderId) {
      const orderIdMatch = message.match(/order #?(\d+)/i);
      if (orderIdMatch) {
        processedEntities.orderId = orderIdMatch[1];
      }
    }
    
    // If there are session orders but no orderId was detected, use the most recent
    if (!processedEntities.orderId && session.orderIds && session.orderIds.length > 0) {
      processedEntities.orderId = session.orderIds[0];
    }
    
    return processedEntities;
  } catch (error) {
    logger.error('Error extracting entities', { error: error.message, message });
    
    // Return empty entities on error
    return {
      orderId: null,
      wrongItems: [],
      missingItems: [],
      issues: [],
      reason: null
    };
  }
}

/**
 * Analyze the sentiment of a message
 * @param {string} message - The message to analyze
 * @returns {object} The sentiment analysis result
 */
function analyzeSentiment(message) {
  try {
    const result = sentiment(message);
    
    // Normalize score to range between -1 and 1
    const normalizedScore = result.score / Math.max(1, result.tokens.length);
    
    return {
      score: normalizedScore,
      comparative: result.comparative,
      tokens: result.tokens,
      positive: result.positive,
      negative: result.negative
    };
  } catch (error) {
    logger.error('Error analyzing sentiment', { error: error.message, message });
    
    // Return neutral sentiment on error
    return {
      score: 0,
      comparative: 0,
      tokens: [],
      positive: [],
      negative: []
    };
  }
}

module.exports = {
  detectIntent,
  extractEntities,
  analyzeSentiment
};