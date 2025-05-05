// utilities/logger.js

const config = require('../config/appConfig');

/**
 * Simple logger utility for consistent logging across the application
 * In a production environment, this would be replaced with a more robust logging solution
 * such as Winston, Bunyan, or a cloud-based logging service
 */
class Logger {
  constructor() {
    this.logLevel = this._getLogLevel();
    this.logFormat = config.logging.format || 'json';
    this.destination = config.logging.destination || 'console';
  }
  
  /**
   * Convert log level string to numeric value for comparison
   * @param {string} level - Log level name
   * @returns {number} Numeric log level
   */
  _getLogLevelValue(level) {
    const levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
    
    return levels[level.toLowerCase()] || 1; // Default to info level
  }
  
  /**
   * Get the configured log level
   * @returns {number} Configured log level
   */
  _getLogLevel() {
    const configuredLevel = config.logging && config.logging.level 
      ? config.logging.level.toLowerCase() 
      : 'info';
      
    return this._getLogLevelValue(configuredLevel);
  }
  
  /**
   * Format the log entry
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {object} meta - Additional metadata
   * @returns {string} Formatted log entry
   */
  _formatLog(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    
    if (this.logFormat === 'json') {
      return JSON.stringify({
        timestamp,
        level,
        message,
        ...meta
      });
    } else {
      // Simple text format
      let metaString = '';
      
      if (Object.keys(meta).length > 0) {
        metaString = ' ' + JSON.stringify(meta);
      }
      
      return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaString}`;
    }
  }
  
  /**
   * Write log entry to configured destination
   * @param {string} entry - Formatted log entry
   */
  _writeLog(entry) {
    if (this.destination === 'console') {
      console.log(entry);
    } else if (this.destination === 'file') {
      // In a real implementation, this would write to a file
      // For now, just console.log
      console.log(`[FILE] ${entry}`);
    } else if (this.destination === 'service') {
      // In a real implementation, this would send to a logging service
      // For now, just console.log
      console.log(`[SERVICE] ${entry}`);
    }
  }
  
  /**
   * Log a debug message
   * @param {string} message - Log message
   * @param {object} meta - Additional metadata
   */
  debug(message, meta = {}) {
    if (this._getLogLevelValue('debug') >= this.logLevel) {
      const entry = this._formatLog('debug', message, meta);
      this._writeLog(entry);
    }
  }
  
  /**
   * Log an info message
   * @param {string} message - Log message
   * @param {object} meta - Additional metadata
   */
  info(message, meta = {}) {
    if (this._getLogLevelValue('info') >= this.logLevel) {
      const entry = this._formatLog('info', message, meta);
      this._writeLog(entry);
    }
  }
  
  /**
   * Log a warning message
   * @param {string} message - Log message
   * @param {object} meta - Additional metadata
   */
  warn(message, meta = {}) {
    if (this._getLogLevelValue('warn') >= this.logLevel) {
      const entry = this._formatLog('warn', message, meta);
      this._writeLog(entry);
    }
  }
  
  /**
   * Log an error message
   * @param {string} message - Log message
   * @param {object} meta - Additional metadata
   */
  error(message, meta = {}) {
    if (this._getLogLevelValue('error') >= this.logLevel) {
      const entry = this._formatLog('error', message, meta);
      this._writeLog(entry);
    }
  }
}

// Export a singleton instance of the logger
module.exports = new Logger();