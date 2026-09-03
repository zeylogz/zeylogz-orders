import QRCode from 'qrcode';

/**
 * Format a Tag-Length-Value (TLV) field according to the EMVCo specification.
 * Tag: 2-digit string
 * Length: 2-digit string (zero-padded)
 * Value: string value
 */
export function formatTLV(tag, value) {
  if (value === undefined || value === null) return '';
  const str = String(value);
  const length = String(str.length).padStart(2, '0');
  return `${tag}${length}${str}`;
}

/**
 * Compute CRC-16/CCITT-FALSE checksum for EMVCo payloads.
 * Polynomial: 0x1021, Initial: 0xFFFF, Final XOR: 0x0000
 *
 * @param {string} payload - Payload up to and including the "6304" tag
 * @returns {string} 4-character uppercase hexadecimal string
 */
export function computeCRC16(payload) {
  let crc = 0xffff;
  const polynomial = 0x1021;

  for (let i = 0; i < payload.length; i++) {
    const byte = payload.charCodeAt(i);
    crc ^= (byte << 8);

    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ polynomial) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Generate an EMVCo-compliant LankaQR dynamic QR payload.
 *
 * EMVCo Data Elements used:
 * - 00: Payload Format Indicator ("01")
 * - 01: Point of Initiation Method ("12" for dynamic with amount)
 * - 26: Merchant Account Information (Sri Lanka National QR / CBSL LankaQR)
 * - 52: Merchant Category Code ("5812" for Eating Places / Restaurants)
 * - 53: Transaction Currency ("144" for Sri Lankan Rupee LKR)
 * - 54: Transaction Amount (e.g. "2450.00")
 * - 58: Country Code ("LK")
 * - 59: Merchant Name
 * - 60: Merchant City ("Colombo")
 * - 62: Additional Data Field Template (Subtag 01: Order reference)
 * - 63: CRC-16 Checksum
 *
 * @param {object} params
 * @param {string} params.merchantName
 * @param {string} [params.merchantId]
 * @param {number} params.amount - Total order amount in LKR
 * @param {string} params.orderNumber - Order reference (e.g. "UB-1001")
 * @param {string} [params.city] - City (default: "Colombo")
 * @returns {string} EMVCo-compliant LankaQR string
 */
export function generateLankaQrPayload(params) {
  const {
    merchantName = 'Merchant',
    merchantId = 'LANKAQR01',
    amount = 0,
    orderNumber = '',
    city = 'Colombo',
  } = params;

  // Format amount with 2 decimal places as per EMVCo standard
  const formattedAmount = Number(amount).toFixed(2);

  // Sub-tags for Merchant Account Information (Tag 26)
  // Subtag 00: Globally Unique Identifier for LankaQR
  const tag26Sub00 = formatTLV('00', 'LK.LANKACLEAR.LANKAQR');
  const tag26Sub01 = formatTLV('01', merchantId);
  const tag26 = formatTLV('26', `${tag26Sub00}${tag26Sub01}`);

  // Sub-tags for Additional Data Field Template (Tag 62)
  // Subtag 01: Bill / Reference Number
  const tag62Sub01 = formatTLV('01', orderNumber);
  const tag62 = formatTLV('62', tag62Sub01);

  // Assemble payload before CRC
  const payloadBeforeCRC = [
    formatTLV('00', '01'),                       // Payload Format Indicator
    formatTLV('01', '12'),                       // Dynamic QR (Point of Initiation Method)
    tag26,                                       // Merchant Account Info
    formatTLV('52', '5812'),                     // MCC: Eating Places & Restaurants
    formatTLV('53', '144'),                      // Currency: LKR (ISO 4217 numeric 144)
    formatTLV('54', formattedAmount),            // Transaction Amount
    formatTLV('58', 'LK'),                       // Country Code: LK
    formatTLV('59', merchantName.slice(0, 25)),  // Merchant Name (max 25 chars)
    formatTLV('60', city.slice(0, 15)),          // Merchant City (max 15 chars)
    tag62,                                       // Additional Data (Order ref)
    '6304',                                      // Tag 63 with length 04, awaiting CRC
  ].join('');

  // Calculate CRC-16 over the payload string
  const crc = computeCRC16(payloadBeforeCRC);

  return `${payloadBeforeCRC}${crc}`;
}

/**
 * Generate a PNG Data URL of the QR code for display or embedding.
 *
 * @param {string} payload - LankaQR payload string
 * @returns {Promise<string>} Base64 Data URL (data:image/png;base64,...)
 */
export async function generateQrDataUrl(payload) {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    margin: 2,
    scale: 6,
  });
}

/**
 * Generate a PNG Buffer of the QR code for sending as media.
 *
 * @param {string} payload - LankaQR payload string
 * @returns {Promise<Buffer>} PNG image buffer
 */
export async function generateQrBuffer(payload) {
  return QRCode.toBuffer(payload, {
    errorCorrectionLevel: 'M',
    margin: 2,
    scale: 6,
  });
}
