import axios from 'axios';
import pino from 'pino';

const logger = pino();
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

if (!TELEGRAM_BOT_TOKEN) {
  logger.warn('TELEGRAM_BOT_TOKEN is not set in environment variables');
}

/**
 * Отправляет текстовое сообщение через Telegram Bot API
 */
export const sendMessage = async (
  chatId: number,
  text: string,
  parseMode: 'HTML' | 'Markdown' = 'HTML',
  replyToMessageId?: number
): Promise<number> => {
  if (!TELEGRAM_BOT_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN is not configured');
  }

  try {
    const payload: any = {
      chat_id: chatId,
      text,
      parse_mode: parseMode,
    };

    if (replyToMessageId) {
      payload.reply_to_message_id = replyToMessageId;
    }

    const response = await axios.post(`${TELEGRAM_API_URL}/sendMessage`, payload);
    return response.data.result.message_id;
  } catch (error: any) {
    logger.error({
      error: error?.response?.data,
      status: error?.response?.status,
      chatId,
    }, 'Failed to send Telegram message');
    throw error;
  }
};

/**
 * Отправляет сообщение с фото через Telegram Bot API
 */
export const sendPhoto = async (
  chatId: number,
  photoUrl: string,
  caption?: string,
  parseMode: 'HTML' | 'Markdown' = 'HTML',
  replyToMessageId?: number
): Promise<number> => {
  if (!TELEGRAM_BOT_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN is not configured');
  }

  try {
    const payload: any = {
      chat_id: chatId,
      photo: photoUrl,
    };

    if (caption) {
      payload.caption = caption;
      payload.parse_mode = parseMode;
    }

    if (replyToMessageId) {
      payload.reply_to_message_id = replyToMessageId;
    }

    const response = await axios.post(`${TELEGRAM_API_URL}/sendPhoto`, payload);
    return response.data.result.message_id;
  } catch (error: any) {
    logger.error({
      error: error?.response?.data,
      status: error?.response?.status,
      chatId,
      photoUrl,
    }, 'Failed to send Telegram photo');
    throw error;
  }
};

/**
 * Отправляет медиа-группу (несколько фото) через Telegram Bot API
 */
export const sendMediaGroup = async (
  chatId: number,
  media: Array<{ type: string; media: string; caption?: string }>,
  replyToMessageId?: number
): Promise<number[]> => {
  if (!TELEGRAM_BOT_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN is not configured');
  }

  try {
    const payload: any = {
      chat_id: chatId,
      media: JSON.stringify(media),
    };

    if (replyToMessageId) {
      payload.reply_to_message_id = replyToMessageId;
    }

    const response = await axios.post(`${TELEGRAM_API_URL}/sendMediaGroup`, payload);
    return response.data.result.map((msg: any) => msg.message_id);
  } catch (error: any) {
    logger.error({
      error: error?.response?.data,
      status: error?.response?.status,
      chatId,
    }, 'Failed to send Telegram media group');
    throw error;
  }
};

