import { describe, it, expect } from 'vitest';
import {
  formatTLV,
  computeCRC16,
  generateLankaQrPayload,
  generateQrDataUrl,
  generateQrBuffer,
} from '../../src/services/lankaqr.service.js';

describe('LankaQR Service', () => {
  describe('formatTLV', () => {
    it('formats 2-digit tag, 2-digit length, and string value', () => {
      expect(formatTLV('00', '01')).toBe('000201');
      expect(formatTLV('53', '144')).toBe('5303144');
      expect(formatTLV('58', 'LK')).toBe('5802LK');
    });

    it('returns empty string for null or undefined value', () => {
      expect(formatTLV('00', null)).toBe('');
      expect(formatTLV('00', undefined)).toBe('');
    });
  });

  describe('computeCRC16', () => {
    it('computes 4-character hex CRC-16/CCITT-FALSE', () => {
      // Standard test string
      const crc = computeCRC16('0002010102126304');
      expect(crc).toHaveLength(4);
      expect(crc).toMatch(/^[0-9A-F]{4}$/);
    });
  });

  describe('generateLankaQrPayload', () => {
    it('builds EMVCo-compliant LankaQR payload', () => {
      const payload = generateLankaQrPayload({
        merchantName: 'Urban Bites',
        merchantId: 'UB94001',
        amount: 2450,
        orderNumber: 'UB-1001',
        city: 'Colombo',
      });

      // Begins with Tag 00 length 02 value 01
      expect(payload.startsWith('000201')).toBe(true);

      // Contains Point of Initiation 01 (Dynamic = 12)
      expect(payload).toContain('010212');

      // Contains Currency 144 (LKR)
      expect(payload).toContain('5303144');

      // Contains Amount 2450.00
      expect(payload).toContain('54072450.00');

      // Contains Country Code LK
      expect(payload).toContain('5802LK');

      // Contains Merchant Name
      expect(payload).toContain('Urban Bites');

      // Contains Order reference UB-1001 in Tag 62
      expect(payload).toContain('UB-1001');

      // Ends with 4-character hex CRC
      expect(payload).toMatch(/6304[0-9A-F]{4}$/);
    });

    it('handles decimal or whole amounts properly', () => {
      const payload = generateLankaQrPayload({
        merchantName: 'Urban Bites',
        amount: 850,
        orderNumber: 'UB-1002',
      });

      expect(payload).toContain('5406850.00');
    });
  });

  describe('generateQrDataUrl & generateQrBuffer', () => {
    it('generates a valid PNG base64 Data URL', async () => {
      const payload = generateLankaQrPayload({
        merchantName: 'Urban Bites',
        amount: 500,
        orderNumber: 'UB-1003',
      });

      const dataUrl = await generateQrDataUrl(payload);
      expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true);
    });

    it('generates a valid PNG Buffer', async () => {
      const payload = generateLankaQrPayload({
        merchantName: 'Urban Bites',
        amount: 500,
        orderNumber: 'UB-1003',
      });

      const buffer = await generateQrBuffer(payload);
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });
});
