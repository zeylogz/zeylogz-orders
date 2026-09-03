import { describe, it, expect } from 'vitest';
import { formatPrice, generateOrderNumber } from '../../src/utils/formatting.js';

describe('formatPrice', () => {
  it('formats a whole number price with Rs. prefix', () => {
    expect(formatPrice(850)).toBe('Rs. 850');
  });

  it('formats a larger price with thousands separator', () => {
    expect(formatPrice(2150)).toBe('Rs. 2,150');
  });

  it('formats zero', () => {
    expect(formatPrice(0)).toBe('Rs. 0');
  });
});

describe('generateOrderNumber', () => {
  it('generates order number with prefix and sequential id', () => {
    expect(generateOrderNumber('UB', 1042)).toBe('UB-1042');
  });

  it('works with different prefixes', () => {
    expect(generateOrderNumber('CR', 1)).toBe('CR-1');
  });
});
