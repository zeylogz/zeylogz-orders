import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

// In-memory mock storage for testing and development
let mockSentMessages = [];

export function getMockSentMessages() {
  return [...mockSentMessages];
}

export function clearMockSentMessages() {
  mockSentMessages = [];
}

/**
 * Check if real Meta credentials are configured.
 */
export function isMetaConfigured(token = env.META_ACCESS_TOKEN, phoneId = env.META_PHONE_NUMBER_ID) {
  return Boolean(
    token &&
    token !== 'your_meta_access_token_here' &&
    phoneId &&
    phoneId !== 'your_phone_number_id_here'
  );
}

/**
 * Send an API call to Meta WhatsApp Cloud API Graph endpoint.
 */
async function callWhatsAppGraphApi(endpoint, payload, accessToken = env.META_ACCESS_TOKEN) {
  const url = `https://graph.facebook.com/${env.META_GRAPH_API_VERSION}/${endpoint}`;

  logger.info('Calling Meta WhatsApp Cloud API', {
    url,
    type: payload.type,
    to: payload.to,
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    logger.error('Meta WhatsApp API error response', { status: response.status, data });
    throw new Error(`WhatsApp API error: ${data.error?.message || response.statusText}`);
  }

  return data;
}

/**
 * Send a plain text message to a WhatsApp user.
 */
export async function sendTextMessage(
  to,
  text,
  phoneNumberId = env.META_PHONE_NUMBER_ID,
  accessToken = env.META_ACCESS_TOKEN
) {
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: String(to).replace(/\D/g, ''),
    type: 'text',
    text: {
      preview_url: false,
      body: text,
    },
  };

  if (!isMetaConfigured(accessToken, phoneNumberId) || env.NODE_ENV === 'test') {
    logger.debug('[MOCK WhatsApp] Text message queued', payload);
    mockSentMessages.push({ ...payload, timestamp: new Date().toISOString() });
    return { mock: true, success: true, messages: [{ id: `mock_msg_${Date.now()}` }] };
  }

  return callWhatsAppGraphApi(`${phoneNumberId}/messages`, payload, accessToken);
}

/**
 * Send an interactive buttons message (up to 3 buttons).
 * WhatsApp limits button titles to 20 characters.
 */
export async function sendInteractiveButtons(
  to,
  body,
  buttons,
  footer = '',
  phoneNumberId = env.META_PHONE_NUMBER_ID,
  accessToken = env.META_ACCESS_TOKEN
) {
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: String(to).replace(/\D/g, ''),
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: body },
      ...(footer ? { footer: { text: footer } } : {}),
      action: {
        buttons: buttons.map((btn) => ({
          type: 'reply',
          reply: {
            id: btn.id,
            title: btn.title.slice(0, 20),
          },
        })),
      },
    },
  };

  if (!isMetaConfigured(accessToken, phoneNumberId) || env.NODE_ENV === 'test') {
    logger.debug('[MOCK WhatsApp] Buttons message queued', payload);
    mockSentMessages.push({ ...payload, timestamp: new Date().toISOString() });
    return { mock: true, success: true, messages: [{ id: `mock_msg_${Date.now()}` }] };
  }

  return callWhatsAppGraphApi(`${phoneNumberId}/messages`, payload, accessToken);
}

/**
 * Send an interactive list message.
 * WhatsApp limits:
 * - button: 20 chars
 * - section title: 24 chars
 * - row title: 24 chars
 * - row description: 72 chars
 */
export async function sendInteractiveList(
  to,
  body,
  buttonText,
  sections,
  phoneNumberId = env.META_PHONE_NUMBER_ID,
  accessToken = env.META_ACCESS_TOKEN
) {
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: String(to).replace(/\D/g, ''),
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: body },
      action: {
        button: buttonText.slice(0, 20),
        sections: sections.map((sec) => ({
          title: sec.title.slice(0, 24),
          rows: sec.rows.map((r) => ({
            id: r.id,
            title: r.title.slice(0, 24),
            ...(r.description ? { description: r.description.slice(0, 72) } : {}),
          })),
        })),
      },
    },
  };

  if (!isMetaConfigured(accessToken, phoneNumberId) || env.NODE_ENV === 'test') {
    logger.debug('[MOCK WhatsApp] List message queued', payload);
    mockSentMessages.push({ ...payload, timestamp: new Date().toISOString() });
    return { mock: true, success: true, messages: [{ id: `mock_msg_${Date.now()}` }] };
  }

  return callWhatsAppGraphApi(`${phoneNumberId}/messages`, payload, accessToken);
}

/**
 * Send formatted message object (text, buttons, or list) produced by message.formatter.js.
 */
export async function sendFormattedMessage(
  to,
  messageObj,
  phoneNumberId = env.META_PHONE_NUMBER_ID,
  accessToken = env.META_ACCESS_TOKEN
) {
  if (!messageObj) return null;

  switch (messageObj.type) {
    case 'buttons':
      return sendInteractiveButtons(
        to,
        messageObj.body,
        messageObj.buttons,
        messageObj.footer || '',
        phoneNumberId,
        accessToken
      );

    case 'list':
      return sendInteractiveList(
        to,
        messageObj.body,
        messageObj.buttonText || 'Select',
        messageObj.sections,
        phoneNumberId,
        accessToken
      );

    case 'text':
    default:
      return sendTextMessage(to, messageObj.body, phoneNumberId, accessToken);
  }
}

/**
 * Parse incoming Meta WhatsApp Cloud API webhook body.
 */
export function parseIncomingWebhook(body) {
  try {
    if (!body || body.object !== 'whatsapp_business_account') {
      return null;
    }

    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    if (!value || change.field !== 'messages') {
      return null;
    }

    // Ignore status updates (sent, delivered, read)
    if (value.statuses && (!value.messages || value.messages.length === 0)) {
      return null;
    }

    const message = value.messages?.[0];
    if (!message) {
      return null;
    }

    const metadata = value.metadata || {};
    const phoneNumberId = metadata.phone_number_id;
    const messageId = message.id;
    const from = message.from;
    const timestamp = message.timestamp;
    const type = message.type;

    let text = '';
    let buttonId = '';
    let listRowId = '';

    if (type === 'text') {
      text = message.text?.body || '';
    } else if (type === 'interactive') {
      const interactive = message.interactive;
      if (interactive?.type === 'button_reply') {
        buttonId = interactive.button_reply?.id || '';
        text = interactive.button_reply?.title || '';
      } else if (interactive?.type === 'list_reply') {
        listRowId = interactive.list_reply?.id || '';
        text = interactive.list_reply?.title || '';
      }
    } else if (type === 'button') {
      buttonId = message.button?.payload || message.button?.text || '';
      text = message.button?.text || '';
    }

    return {
      phoneNumberId,
      messageId,
      from,
      timestamp,
      type,
      text,
      buttonId,
      listRowId,
    };
  } catch (err) {
    logger.error('Error parsing WhatsApp webhook payload', { error: err.message });
    return null;
  }
}
