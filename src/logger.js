/**
 * Simple logging system with level control
 * 
 * Usage:
 *   import { logger } from './logger.js';
 *   logger.debug('Debug message');
 *   logger.info('Info message');
 *   logger.warn('Warning message');
 *   logger.error('Error message');
 * 
 * Set LOG_LEVEL environment variable: debug, info, warn, error
 * Default: info (shows info, warn, error)
 */

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4
};

const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL?.toLowerCase()] ?? LOG_LEVELS.info;

/**
 * Format timestamp for logs
 */
function timestamp() {
  return new Date().toISOString();
}

/**
 * Logger implementation
 */
export const logger = {
  debug: (...args) => {
    if (currentLevel <= LOG_LEVELS.debug) {
      console.log(`[${timestamp()}] 🐛 DEBUG:`, ...args);
    }
  },

  info: (...args) => {
    if (currentLevel <= LOG_LEVELS.info) {
      console.log(`[${timestamp()}] ℹ️  INFO:`, ...args);
    }
  },

  warn: (...args) => {
    if (currentLevel <= LOG_LEVELS.warn) {
      console.warn(`[${timestamp()}] ⚠️  WARN:`, ...args);
    }
  },

  error: (...args) => {
    if (currentLevel <= LOG_LEVELS.error) {
      console.error(`[${timestamp()}] ❌ ERROR:`, ...args);
    }
  },

  // Always log regardless of level
  always: (...args) => {
    console.log(`[${timestamp()}]`, ...args);
  }
};

export default logger;

