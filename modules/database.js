// modules/database.js

const { createClient } = require('@supabase/supabase-js');
const logger = require('../utilities/logger');
const config = require('../config/appConfig');

// Initialize Supabase client
const supabase = createClient(
  config.supabase.url,
  config.supabase.apiKey
);

/**
 * Initialize database connections and tables
 */
async function initializeDatabase() {
  try {
    if (config.demoMode) {
      logger.info('Running in demo mode, database initialization skipped');
      return true;
    }
    
    logger.info('Checking Supabase connection');
    const { error } = await supabase.from('sessions').select('count');
    
    if (error) {
      logger.error('Error connecting to Supabase', { error: error.message });
      return false;
    }
    
    logger.info('Connected to Supabase successfully');
    return true;
  } catch (error) {
    logger.error('Failed to initialize Supabase', { error: error.message });
    return false;
  }
}

// Session operations
async function createSession(sessionData) {
  try {
    if (config.demoMode) {
      return { id: sessionData.sessionId };
    }
    
    // Store session in Supabase
    const { data, error } = await supabase
      .from('sessions')
      .insert([
        {
          session_id: sessionData.sessionId,
          customer_id: sessionData.customerId,
          customer_info: sessionData.customerInfo,
          order_ids: sessionData.orderIds,
          order_details: sessionData.orderDetails,
          conversation_history: sessionData.conversationHistory || [],
          created_at: new Date().toISOString(),
          last_activity_at: new Date().toISOString(),
          status: 'active',
          escalated: false,
          resolutions: []
        }
      ]);
    
    if (error) {
      logger.error('Error creating session in Supabase', { error: error.message });
      throw error;
    }
    
    return { id: sessionData.sessionId };
  } catch (error) {
    logger.error('Error creating session', { error: error.message });
    throw error;
  }
}

async function getSession(sessionId) {
  try {
    if (config.demoMode) {
      return null; // In demo mode, sessions are stored in memory
    }
    
    // Get session from Supabase
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single();
    
    if (error) {
      logger.error('Error retrieving session from Supabase', { error: error.message });
      throw error;
    }
    
    if (!data) {
      return null;
    }
    
    // Convert from Supabase snake_case format to camelCase
    return {
      sessionId: data.session_id,
      customerId: data.customer_id,
      customerInfo: data.customer_info,
      orderIds: data.order_ids,
      orderDetails: data.order_details,
      conversationHistory: data.conversation_history || [],
      createdAt: data.created_at,
      lastActivityAt: data.last_activity_at,
      status: data.status,
      escalated: data.escalated,
      resolutions: data.resolutions || []
    };
  } catch (error) {
    logger.error('Error retrieving session', { error: error.message });
    throw error;
  }
}

async function updateSession(sessionId, updateData) {
  try {
    if (config.demoMode) {
      return true;
    }
    
    // Convert camelCase to snake_case for Supabase
    const supabaseUpdateData = {};
    
    if (updateData.lastActivityAt) {
      supabaseUpdateData.last_activity_at = updateData.lastActivityAt;
    }
    
    if (updateData.status) {
      supabaseUpdateData.status = updateData.status;
    }
    
    if (updateData.escalated !== undefined) {
      supabaseUpdateData.escalated = updateData.escalated;
    }
    
    // Always update last activity time
    supabaseUpdateData.last_activity_at = new Date().toISOString();
    
    // Update session in Supabase
    const { error } = await supabase
      .from('sessions')
      .update(supabaseUpdateData)
      .eq('session_id', sessionId);
    
    if (error) {
      logger.error('Error updating session in Supabase', { error: error.message });
      throw error;
    }
    
    return true;
  } catch (error) {
    logger.error('Error updating session', { error: error.message });
    throw error;
  }
}

async function addMessageToSession(sessionId, message) {
  try {
    if (config.demoMode) {
      return true;
    }
    
    // First get the current session
    const { data: session, error: getError } = await supabase
      .from('sessions')
      .select('conversation_history')
      .eq('session_id', sessionId)
      .single();
    
    if (getError) {
      logger.error('Error retrieving session for message addition', { error: getError.message });
      throw getError;
    }
    
    // Add the new message
    const conversationHistory = session.conversation_history || [];
    conversationHistory.push(message);
    
    // Update the session
    const { error: updateError } = await supabase
      .from('sessions')
      .update({
        conversation_history: conversationHistory,
        last_activity_at: new Date().toISOString()
      })
      .eq('session_id', sessionId);
    
    if (updateError) {
      logger.error('Error adding message to session', { error: updateError.message });
      throw updateError;
    }
    
    return true;
  } catch (error) {
    logger.error('Error adding message to session', { error: error.message });
    throw error;
  }
}

async function addResolutionToSession(sessionId, resolution) {
  try {
    if (config.demoMode) {
      return true;
    }
    
    // First get the current session
    const { data: session, error: getError } = await supabase
      .from('sessions')
      .select('resolutions')
      .eq('session_id', sessionId)
      .single();
    
    if (getError) {
      logger.error('Error retrieving session for resolution addition', { error: getError.message });
      throw getError;
    }
    
    // Add the new resolution
    const resolutions = session.resolutions || [];
    resolutions.push(resolution);
    
    // Update the session
    const { error: updateError } = await supabase
      .from('sessions')
      .update({
        resolutions,
        last_activity_at: new Date().toISOString()
      })
      .eq('session_id', sessionId);
    
    if (updateError) {
      logger.error('Error adding resolution to session', { error: updateError.message });
      throw updateError;
    }
    
    return true;
  } catch (error) {
    logger.error('Error adding resolution to session', { error: error.message });
    throw error;
  }
}

// Resolution logging
async function logResolution(resolutionData) {
  try {
    if (config.demoMode) {
      return { id: `res_log_${Date.now()}` };
    }
    
    // Store in Supabase
    const { data, error } = await supabase
      .from('resolution_logs')
      .insert([
        {
          session_id: resolutionData.sessionId,
          customer_id: resolutionData.customerId,
          order_id: resolutionData.orderId,
          resolution_type: resolutionData.resolutionType,
          amount: resolutionData.amount,
          reason: resolutionData.reason,
          agent_type: resolutionData.agentType || 'AI',
          created_at: new Date().toISOString(),
          success: resolutionData.success,
          metadata: resolutionData.metadata
        }
      ]);
    
    if (error) {
      logger.error('Error logging resolution in Supabase', { error: error.message });
      throw error;
    }
    
    return { id: data[0].id };
  } catch (error) {
    logger.error('Error logging resolution', { error: error.message });
    throw error;
  }
}

// Analytics operations
async function getCustomerResolutionHistory(customerId, limit = 10) {
  try {
    if (config.demoMode) {
      return [];
    }
    
    // Get from Supabase
    const { data, error } = await supabase
      .from('resolution_logs')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      logger.error('Error retrieving customer resolution history', { error: error.message });
      throw error;
    }
    
    return data;
  } catch (error) {
    logger.error('Error retrieving customer resolution history', { error: error.message });
    throw error;
  }
}

async function getRestaurantResolutionStats(restaurantId, startDate, endDate) {
  try {
    if (config.demoMode) {
      return {
        totalResolutions: 0,
        refundCount: 0,
        redeliveryCount: 0,
        creditCount: 0,
        totalRefundAmount: 0
      };
    }
    
    // Query Supabase for resolution stats
    const { data, error } = await supabase
      .from('resolution_logs')
      .select('resolution_type, amount')
      .eq('metadata->restaurantId', restaurantId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());
    
    if (error) {
      logger.error('Error retrieving restaurant resolution stats', { error: error.message });
      throw error;
    }
    
    // Process results
    const result = {
      totalResolutions: data.length,
      refundCount: 0,
      redeliveryCount: 0,
      creditCount: 0,
      totalRefundAmount: 0
    };
    
    data.forEach(item => {
      if (item.resolution_type === 'REFUND') {
        result.refundCount++;
        result.totalRefundAmount += item.amount || 0;
      } else if (item.resolution_type === 'REDELIVERY') {
        result.redeliveryCount++;
      } else if (item.resolution_type === 'CREDIT') {
        result.creditCount++;
      }
    });
    
    return result;
  } catch (error) {
    logger.error('Error retrieving restaurant resolution stats', { error: error.message });
    throw error;
  }
}

module.exports = {
  initializeDatabase,
  createSession,
  getSession,
  updateSession,
  addMessageToSession,
  addResolutionToSession,
  logResolution,
  getCustomerResolutionHistory,
  getRestaurantResolutionStats
};