/**
 * Format a price in LKR (Sri Lankan Rupees).
 * Prices are stored as integers (no decimal fractions for LKR).
 */
export function formatPrice(amount) {
  return `Rs. ${Number(amount).toLocaleString('en-LK')}`;
}

/**
 * Generate a human-friendly order number.
 * Format: PREFIX-SEQUENTIAL (e.g. UB-1042)
 */
export function generateOrderNumber(prefix, sequentialId) {
  return `${prefix}-${sequentialId}`;
}
