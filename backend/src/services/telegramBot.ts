import axios from 'axios';
import pino from 'pino';

const logger = pino();
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const TELEGRAM_FILE_URL = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}`;

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

type TelegramFileInfo = {
  filePath: string;
  fileSize?: number;
  fileUrl: string;
};

export const getTelegramFileLink = async (fileId: string): Promise<TelegramFileInfo> => {
  if (!TELEGRAM_BOT_TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN is not configured');
  }

  try {
    const response = await axios.get(`${TELEGRAM_API_URL}/getFile`, {
      params: {
        file_id: fileId,
      },
    });

    const filePath = response.data?.result?.file_path;

    if (!filePath) {
      throw new Error('File path not found in Telegram response');
    }

    return {
      filePath,
      fileSize: response.data?.result?.file_size,
      fileUrl: `${TELEGRAM_FILE_URL}/${filePath}`,
    };
  } catch (error: any) {
    logger.error(
      {
        error: error?.response?.data || error?.message,
        status: error?.response?.status,
        fileId,
      },
      'Failed to get Telegram file info',
    );
    throw error;
  }
};

export const downloadTelegramFile = async (fileUrl: string): Promise<Buffer> => {
  try {
    const response = await axios.get<ArrayBuffer>(fileUrl, {
      responseType: 'arraybuffer',
    });
    return Buffer.from(response.data);
  } catch (error: any) {
    logger.error(
      {
        error: error?.response?.data || error?.message,
        status: error?.response?.status,
        fileUrl,
      },
      'Failed to download Telegram file',
    );
    throw error;
  }
};

