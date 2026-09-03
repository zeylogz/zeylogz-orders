import { describe, it, expect } from 'vitest';
import { t, formatPriceLocalized } from '../../src/utils/i18n.js';

describe('i18n module', () => {
  describe('t (translate)', () => {
    it('translates keys in English by default', () => {
      expect(t('btn_menu', 'en')).toBe('🍔 View Menu');
      expect(t('btn_cart', 'en')).toBe('🛒 View Cart');
      expect(t('btn_lang_switch', 'en')).toBe('🇱🇰 සිංහල');
    });

    it('translates keys in Sinhala', () => {
      expect(t('btn_menu', 'si')).toBe('🍔 මෙනුව බලන්න');
      expect(t('btn_cart', 'si')).toBe('🛒 මගේ බෑගය');
      expect(t('btn_lang_switch', 'si')).toBe('🇬🇧 English');
    });

    it('interpolates parameters correctly', () => {
      const en = t('welcome_title', 'en', { restaurantName: 'Urban Bites' });
      expect(en).toContain('Welcome to *Urban Bites*!');

      const si = t('welcome_title', 'si', { restaurantName: 'Urban Bites' });
      expect(si).toContain('*Urban Bites* වෙත සාදරයෙන් පිළිගනිමු!');
    });

    it('falls back to English if key missing in Sinhala or unknown language', () => {
      expect(t('btn_menu', 'fr')).toBe('🍔 View Menu');
    });
  });

  describe('formatPriceLocalized', () => {
    it('formats price with Rs. for English', () => {
      expect(formatPriceLocalized(850, 'en')).toBe('Rs. 850');
      expect(formatPriceLocalized(2450, 'en')).toBe('Rs. 2,450');
    });

    it('formats price with රු. for Sinhala', () => {
      expect(formatPriceLocalized(850, 'si')).toBe('රු. 850');
      expect(formatPriceLocalized(2450, 'si')).toBe('රු. 2,450');
    });
  });

  describe('WhatsApp button character limits', () => {
    it('ensures all interactive button labels are <= 20 characters in English and Sinhala', () => {
      const buttonKeys = [
        'btn_menu',
        'btn_cart',
        'btn_lang_switch',
        'btn_add_more',
        'btn_clear_cart',
        'btn_checkout',
        'btn_delivery',
        'btn_pickup',
        'btn_dine_in',
        'btn_skip_notes',
        'btn_cod',
        'btn_lankaqr',
        'btn_confirm',
        'btn_cancel',
      ];

      for (const lang of ['en', 'si']) {
        for (const key of buttonKeys) {
          const label = t(key, lang);
          expect(label.length).toBeLessThanOrEqual(20);
        }
      }
    });
  });
});
