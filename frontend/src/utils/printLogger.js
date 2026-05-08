/**
 * Print Operation Logger
 * 
 * Comprehensive logging for all print operations across platforms
 * Tracks errors, warnings, and successes for debugging
 */

class PrintLogger {
  constructor() {
    this.logs = [];
    this.maxLogs = 100; // Keep last 100 logs
    this.enableDebug = this.isDebugMode();
  }

  /**
   * Check if debug mode is enabled
   */
  isDebugMode() {
    try {
      return localStorage.getItem('PRINT_DEBUG_MODE') === 'true';
    } catch (e) {
      return false;
    }
  }

  /**
   * Log a print operation
   */
  log(level, component, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      component,
      message,
      data,
      url: typeof window !== 'undefined' ? window.location.pathname : 'N/A',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 50) : 'N/A'
    };

    // Add to in-memory logs
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output
    const prefix = `[${timestamp}] [${component}] ${level}:`;
    switch (level) {
      case 'ERROR':
        console.error(prefix, message, data);
        break;
      case 'WARN':
        console.warn(prefix, message, data);
        break;
      case 'INFO':
        console.info(prefix, message, data);
        break;
      case 'DEBUG':
        if (this.enableDebug) {
          console.debug(prefix, message, data);
        }
        break;
      default:
        console.log(prefix, message, data);
    }

    // Try to persist to localStorage for later analysis
    try {
      if (level === 'ERROR' || level === 'WARN') {
        const existing = JSON.parse(localStorage.getItem('PRINT_ERRORS') || '[]');
        existing.push(logEntry);
        if (existing.length > 50) existing.shift(); // Keep 50 error logs
        localStorage.setItem('PRINT_ERRORS', JSON.stringify(existing));
      }
    } catch (e) {
      // Ignore storage errors
    }
  }

  /**
   * Log error
   */
  error(component, message, err = null) {
    const data = err ? {
      name: err.name,
      message: err.message,
      stack: err.stack?.substring(0, 500)
    } : null;
    this.log('ERROR', component, message, data);
  }

  /**
   * Log warning
   */
  warn(component, message, data = null) {
    this.log('WARN', component, message, data);
  }

  /**
   * Log info
   */
  info(component, message, data = null) {
    this.log('INFO', component, message, data);
  }

  /**
   * Log debug
   */
  debug(component, message, data = null) {
    this.log('DEBUG', component, message, data);
  }

  /**
   * Log print job start
   */
  logPrintStart(type, platform, order = null) {
    this.info('PRINT_JOB', `Starting ${type} print on ${platform}`, {
      type,
      platform,
      orderId: order?.id?.substring(0, 8),
      itemCount: order?.items?.length || 0
    });
  }

  /**
   * Log print job success
   */
  logPrintSuccess(type, platform, duration = 0) {
    this.info('PRINT_JOB', `${type} print succeeded on ${platform}`, {
      type,
      platform,
      duration: `${duration}ms`
    });
  }

  /**
   * Log print job failure
   */
  logPrintFailure(type, platform, err, duration = 0) {
    this.error('PRINT_JOB', `${type} print failed on ${platform}`, {
      type,
      platform,
      error: err?.message,
      errorName: err?.name,
      duration: `${duration}ms`
    });
  }

  /**
   * Log printer connection
   */
  logPrinterConnection(printerName, success, err = null) {
    if (success) {
      this.info('PRINTER', `Connected to printer: ${printerName}`);
    } else {
      this.error('PRINTER', `Failed to connect to printer: ${printerName}`, err);
    }
  }

  /**
   * Log printer disconnect
   */
  logPrinterDisconnection(printerName, reason = 'Manual') {
    this.info('PRINTER', `Disconnected from printer: ${printerName}`, { reason });
  }

  /**
   * Get all logs
   */
  getLogs() {
    return this.logs;
  }

  /**
   * Get error logs
   */
  getErrorLogs() {
    return this.logs.filter(log => log.level === 'ERROR');
  }

  /**
   * Clear logs
   */
  clearLogs() {
    this.logs = [];
  }

  /**
   * Export logs as JSON
   */
  exportLogs() {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Log to file (simulated)
   */
  downloadLogs() {
    try {
      const logsJson = this.exportLogs();
      const blob = new Blob([logsJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `print-logs-${new Date().toISOString().substring(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.info('LOGGER', 'Logs downloaded successfully');
    } catch (err) {
      this.error('LOGGER', 'Failed to download logs', err);
    }
  }
}

// Singleton instance
const printLogger = new PrintLogger();

// Export
export default printLogger;

/**
 * Helper: Create a timer for tracking operation duration
 */
export class PrintTimer {
  constructor(name) {
    this.name = name;
    this.startTime = Date.now();
  }

  end() {
    const duration = Date.now() - this.startTime;
    printLogger.debug('TIMER', `${this.name} took ${duration}ms`);
    return duration;
  }
}

/**
 * Helper: Print operation wrapper with error handling
 */
export async function withPrintErrorHandling(operation, context = {}) {
  const {
    type = 'unknown',
    platform = 'unknown',
    timeout = 30000
  } = context;

  const timer = new PrintTimer(`${type} on ${platform}`);

  try {
    printLogger.logPrintStart(type, platform, context.order);

    // Run operation with timeout
    const result = await Promise.race([
      operation(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Print timeout after ${timeout}ms`)), timeout)
      )
    ]);

    const duration = timer.end();
    printLogger.logPrintSuccess(type, platform, duration);
    return result;
  } catch (err) {
    const duration = timer.end();
    printLogger.logPrintFailure(type, platform, err, duration);
    throw err;
  }
}
