// modules/orderManager.js

const logger = require('../utilities/logger');
const config = require('../config/appConfig');
const axios = require('axios');

/**
 * Get details for a specific order
 * @param {string} orderId - ID of the order
 * @returns {object} Order details
 */
async function getOrderDetails(orderId) {
  try {
    logger.info('Fetching order details', { orderId });
    
    // In demo mode, return mock data
    if (config.demoMode) {
      return getMockOrderDetails(orderId);
    }
    
    // In production, call the order service API
    const response = await axios.get(
      `${config.apiBaseUrl}/orders/${orderId}`,
      {
        headers: {
          'Authorization': `Bearer ${config.internalApiKey}`
        }
      }
    );
    
    return response.data;
  } catch (error) {
    logger.error('Error fetching order details', { error: error.message, orderId });
    
    // Return minimal mock data if real data fetch fails
    return {
      id: orderId,
      status: 'UNKNOWN',
      restaurantName: 'Unknown Restaurant',
      items: [],
      totalAmount: 0,
      error: 'Unable to retrieve order details'
    };
  }
}

/**
 * Get the current status of an order
 * @param {string} orderId - ID of the order
 * @returns {object} Current order status
 */
async function getOrderStatus(orderId) {
  try {
    logger.info('Fetching order status', { orderId });
    
    // In demo mode, return mock data
    if (config.demoMode) {
      const mockOrder = getMockOrderDetails(orderId);
      
      return {
        status: mockOrder.status,
        estimatedDeliveryTime: mockOrder.estimatedDeliveryTime,
        deliveryPartnerName: mockOrder.deliveryPartnerName,
        lastUpdated: new Date()
      };
    }
    
    // In production, call the order tracking service API
    const response = await axios.get(
      `${config.apiBaseUrl}/orders/${orderId}/status`,
      {
        headers: {
          'Authorization': `Bearer ${config.internalApiKey}`
        }
      }
    );
    
    return response.data;
  } catch (error) {
    logger.error('Error fetching order status', { error: error.message, orderId });
    
    return {
      status: 'UNKNOWN',
      error: 'Unable to retrieve order status'
    };
  }
}

/**
 * Initiate a redelivery for an order
 * @param {string} originalOrderId - ID of the original order
 * @param {array} items - Items to redeliver
 * @returns {object} Result of the redelivery request
 */
async function initiateRedelivery(originalOrderId, items) {
  try {
    logger.info('Initiating redelivery', { originalOrderId, items });
    
    // In demo mode, return success
    if (config.demoMode) {
      return {
        success: true,
        newOrderId: `reorder_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        estimatedDeliveryTime: new Date(Date.now() + 35 * 60 * 1000), // 35 minutes from now
        trackingUrl: `https://zomato.com/track/reorder-demo-${originalOrderId}`
      };
    }
    
    // In production, call the redelivery service API
    const response = await axios.post(
      `${config.apiBaseUrl}/orders/redelivery`,
      {
        originalOrderId,
        items,
        priority: 'HIGH'
      },
      {
        headers: {
          'Authorization': `Bearer ${config.internalApiKey}`
        }
      }
    );
    
    return {
      success: true,
      newOrderId: response.data.orderId,
      estimatedDeliveryTime: new Date(response.data.estimatedDeliveryTime),
      trackingUrl: response.data.trackingUrl
    };
  } catch (error) {
    logger.error('Error initiating redelivery', { error: error.message, originalOrderId });
    
    return {
      success: false,
      error: 'Unable to initiate redelivery'
    };
  }
}

/**
 * Get recent orders for a customer
 * @param {string} customerId - ID of the customer
 * @param {number} limit - Maximum number of orders to return
 * @returns {array} Recent orders
 */
async function getRecentOrders(customerId, limit = 5) {
  try {
    logger.info('Fetching recent orders', { customerId, limit });
    
    // In demo mode, return mock data
    if (config.demoMode) {
      return getMockRecentOrders(customerId, limit);
    }
    
    // In production, call the orders API
    const response = await axios.get(
      `${config.apiBaseUrl}/customers/${customerId}/orders`,
      {
        params: { limit },
        headers: {
          'Authorization': `Bearer ${config.internalApiKey}`
        }
      }
    );
    
    return response.data;
  } catch (error) {
    logger.error('Error fetching recent orders', { error: error.message, customerId });
    
    return [];
  }
}

/**
 * Update order problem flag
 * @param {string} orderId - ID of the order
 * @param {boolean} problemFlag - Whether the order has problems
 * @param {string} problemType - Type of problem
 * @returns {boolean} Success status
 */
async function updateOrderProblemFlag(orderId, problemFlag, problemType) {
  try {
    logger.info('Updating order problem flag', { orderId, problemFlag, problemType });
    
    // In demo mode, return success
    if (config.demoMode) {
      return true;
    }
    
    // In production, call the orders API
    await axios.patch(
      `${config.apiBaseUrl}/orders/${orderId}`,
      {
        problemFlag,
        problemType,
        updatedAt: new Date()
      },
      {
        headers: {
          'Authorization': `Bearer ${config.internalApiKey}`
        }
      }
    );
    
    return true;
  } catch (error) {
    logger.error('Error updating order problem flag', { error: error.message, orderId });
    
    return false;
  }
}

// Helper functions for mock data

/**
 * Get mock order details for demo mode
 * @param {string} orderId - ID of the order
 * @returns {object} Mock order details
 */
function getMockOrderDetails(orderId) {
  // Generate a consistent order based on the order ID
  const orderIdNum = parseInt(orderId.replace(/\D/g, '')) || 12345;
  
  // Determine order status based on order ID
  const statusOptions = ['CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'IN_TRANSIT', 'DELIVERED'];
  const statusIndex = orderIdNum % statusOptions.length;
  const status = statusOptions[statusIndex];
  
  // Generate realistic order times
  const now = new Date();
  const orderedAt = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
  const estimatedDeliveryTime = new Date(now.getTime() + 20 * 60 * 1000); // 20 minutes from now
  const deliveredAt = status === 'DELIVERED' ? new Date(now.getTime() - 10 * 60 * 1000) : null; // 10 minutes ago if delivered
  
  // Choose a restaurant
  const restaurants = [
    'Taco Bell', 'McDonald\'s', 'Pizza Hut', 'Domino\'s', 
    'Subway', 'KFC', 'Burger King', 'Starbucks'
  ];
  const restaurantIndex = orderIdNum % restaurants.length;
  const restaurantName = restaurants[restaurantIndex];
  
  // Generate order items based on the restaurant
  let items = [];
  let totalAmount = 0;
  
  switch (restaurantName) {
    case 'Taco Bell':
      items = [
        { name: 'Crunchwrap Supreme', price: 199, quantity: 1 },
        { name: 'Nachos BellGrande', price: 179, quantity: 1 },
        { name: 'Soft Taco', price: 129, quantity: 2 }
      ];
      break;
      
    case 'McDonald\'s':
      items = [
        { name: 'Big Mac', price: 189, quantity: 1 },
        { name: 'McChicken', price: 159, quantity: 1 },
        { name: 'French Fries (Large)', price: 99, quantity: 1 },
        { name: 'Coca-Cola (Medium)', price: 79, quantity: 2 }
      ];
      break;
      
    case 'Pizza Hut':
      items = [
        { name: 'Pepperoni Pizza (Medium)', price: 349, quantity: 1 },
        { name: 'Garlic Breadsticks', price: 129, quantity: 1 },
        { name: 'Sprite (Large)', price: 89, quantity: 1 }
      ];
      break;
      
    case 'Domino\'s':
      items = [
        { name: 'Margherita Pizza (Large)', price: 299, quantity: 1 },
        { name: 'Chicken Wings', price: 249, quantity: 1 },
        { name: 'Chocolate Lava Cake', price: 99, quantity: 2 }
      ];
      break;
      
    default:
      items = [
        { name: 'Specialty Item 1', price: 199, quantity: 1 },
        { name: 'Specialty Item 2', price: 149, quantity: 2 },
        { name: 'Beverage', price: 79, quantity: 1 }
      ];
  }
  
  // Calculate total amount
  totalAmount = items.reduce((total, item) => total + (item.price * item.quantity), 0);
  
  // Add taxes and delivery fee
  const taxRate = 0.05; // 5% tax
  const taxes = Math.round(totalAmount * taxRate);
  const deliveryFee = 49;
  const grandTotal = totalAmount + taxes + deliveryFee;
  
  return {
    id: orderId,
    customerId: 'cust_12345',
    restaurantId: `rest_${restaurantIndex}`,
    restaurantName,
    status,
    items,
    subtotal: totalAmount,
    taxes,
    deliveryFee,
    totalAmount: grandTotal,
    paymentId: `pay_${orderId}_${Date.now()}`,
    paymentMethod: 'CREDIT_CARD',
    deliveryAddress: '123 Customer Street, City',
    orderedAt,
    estimatedDeliveryTime,
    deliveredAt,
    deliveryPartnerName: 'Raj S.',
    problemFlag: false,
    refunded: false,
    restaurantCloseTime: new Date(now.getTime() + 5 * 60 * 60 * 1000) // 5 hours from now
  };
}

/**
 * Get mock recent orders for demo mode
 * @param {string} customerId - ID of the customer
 * @param {number} limit - Maximum number of orders to return
 * @returns {array} Mock recent orders
 */
function getMockRecentOrders(customerId, limit) {
  const orders = [];
  
  // Generate a few mock orders
  for (let i = 0; i < limit; i++) {
    const orderId = `order_${Date.now()}_${i}`;
    orders.push(getMockOrderDetails(orderId));
  }
  
  // Sort by ordered time (descending)
  return orders.sort((a, b) => new Date(b.orderedAt) - new Date(a.orderedAt));
}

module.exports = {
  getOrderDetails,
  getOrderStatus,
  initiateRedelivery,
  getRecentOrders,
  updateOrderProblemFlag
};