/**
 * Invoice Number Formatter Utility
 * 
 * Provides consistent invoice/order number formatting across the application.
 * Replaces UUID-based identifiers with human-readable invoice numbers.
 */

/**
 * Format an order ID as a human-readable invoice number
 * 
 * Priority:
 * 1. Use bill_number if available (e.g., "INV-0001234")
 * 2. Use order_number if available (e.g., "ORD-0001234")
 * 3. Generate date-based format from order.id and created_at (e.g., "240831-0042")
 * 
 * @param {Object} order - The order object
 * @param {string} order.id - UUID of the order
 * @param {string} [order.bill_number] - Optional bill number
 * @param {string} [order.order_number] - Optional order number
 * @param {string} [order.created_at] - ISO timestamp of order creation
 * @returns {string} Formatted invoice number
 */
export function formatInvoiceNumber(order) {
  if (!order || !order.id) {
    return 'N/A';
  }

  // Priority 1: Use bill_number if available
  if (order.bill_number) {
    return order.bill_number;
  }

  // Priority 2: Use order_number if available
  if (order.order_number) {
    return order.order_number;
  }

  // Priority 3: Generate date-based format
  // Format: YYMMDD-NNNN where NNNN is last 4 chars of UUID
  try {
    const date = order.created_at ? new Date(order.created_at) : new Date();
    const yy = String(date.getFullYear()).slice(-2);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const sequence = order.id.replace(/-/g, '').slice(-4).toUpperCase();
    
    return `${yy}${mm}${dd}-${sequence}`;
  } catch (error) {
    // Fallback: just use last 8 chars of UUID
    return order.id.slice(0, 8).toUpperCase();
  }
}

/**
 * Format an order ID as a technical reference (short UUID)
 * 
 * Used for support/debugging purposes. Shows first 8 characters of UUID in uppercase.
 * 
 * @param {Object|string} orderOrId - The order object or UUID string
 * @returns {string} Short technical ID (e.g., "A3B4C5D6")
 */
export function formatTechnicalId(orderOrId) {
  if (!orderOrId) {
    return 'N/A';
  }

  const id = typeof orderOrId === 'string' ? orderOrId : orderOrId.id;
  
  if (!id) {
    return 'N/A';
  }

  return id.slice(0, 8).toUpperCase();
}

/**
 * Format invoice number for display in tables and lists
 * 
 * Adds "#" prefix and ensures consistent styling.
 * 
 * @param {Object} order - The order object
 * @returns {string} Formatted display number (e.g., "#INV-0001234" or "#240831-0042")
 */
export function formatInvoiceDisplay(order) {
  const invoiceNum = formatInvoiceNumber(order);
  return invoiceNum === 'N/A' ? 'N/A' : `#${invoiceNum}`;
}

/**
 * Extract searchable text from order for filtering
 * 
 * Returns all possible identifiers that a user might search for.
 * 
 * @param {Object} order - The order object
 * @returns {string} Space-separated searchable identifiers
 */
export function getSearchableOrderIds(order) {
  if (!order) {
    return '';
  }

  const parts = [];
  
  // Add invoice number
  parts.push(formatInvoiceNumber(order));
  
  // Add technical ID
  parts.push(formatTechnicalId(order));
  
  // Add original fields if they exist
  if (order.bill_number) parts.push(order.bill_number);
  if (order.order_number) parts.push(order.order_number);
  if (order.id) parts.push(order.id);
  
  return parts.join(' ').toLowerCase();
}
