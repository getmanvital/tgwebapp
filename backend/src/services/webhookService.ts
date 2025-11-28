import axios from 'axios';
import pino from 'pino';

const logger = pino({ name: 'webhookService' });

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BACKEND_URL = process.env.BACKEND_URL;
const AUTO_SETUP_WEBHOOK = process.env.AUTO_SETUP_WEBHOOK === 'true';

interface WebhookInfo {
  url: string;
  has_custom_certificate: boolean;
  pending_update_count: number;
  last_error_date?: number;
  last_error_message?: string;
}

/**
 * Получает информацию о текущем webhook
 */
async function getWebhookInfo(): Promise<WebhookInfo | null> {
  if (!TELEGRAM_BOT_TOKEN) {
    return null;
  }

  try {
    const response = await axios.get(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`,
      { timeout: 10000 }
    );
    
    if (response.data.ok) {
      return response.data.result;
    }
    
    return null;
  } catch (error: any) {
    logger.error(
      {
        error: error?.message,
      },
      'Error getting webhook info'
    );
    return null;
  }
}

/**
 * Устанавливает webhook для Telegram бота
 */
async function setWebhook(webhookUrl: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    logger.warn('TELEGRAM_BOT_TOKEN not set, skipping webhook setup');
    return false;
  }

  try {
    logger.info({ webhookUrl }, 'Setting webhook...');
    
    const response = await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`,
      {
        url: webhookUrl,
        allowed_updates: ['message'],
        drop_pending_updates: false,
      },
      { timeout: 10000 }
    );
    
    if (response.data.ok) {
      logger.info('✅ Webhook set successfully');
      return true;
    }
    
    logger.error({ data: response.data }, '❌ Failed to set webhook');
    return false;
  } catch (error: any) {
    logger.error(
      {
        error: error?.message,
        response: error?.response?.data,
      },
      '❌ Error setting webhook'
    );
    return false;
  }
}

/**
 * Автоматическая настройка webhook при старте сервера
 */
export async function autoSetupWebhook(): Promise<void> {
  // Проверяем, включена ли автоматическая настройка
  if (!AUTO_SETUP_WEBHOOK) {
    logger.debug('Auto webhook setup is disabled (AUTO_SETUP_WEBHOOK=false)');
    return;
  }

  if (!TELEGRAM_BOT_TOKEN) {
    logger.warn('TELEGRAM_BOT_TOKEN not set, skipping auto webhook setup');
    return;
  }

  if (!BACKEND_URL) {
    logger.warn('BACKEND_URL not set, skipping auto webhook setup');
    return;
  }

  // Проверяем, что BACKEND_URL не localhost
  if (BACKEND_URL.includes('localhost') || BACKEND_URL.includes('127.0.0.1')) {
    logger.warn(
      { backendUrl: BACKEND_URL },
      'BACKEND_URL points to localhost, skipping auto webhook setup'
    );
    return;
  }

  const webhookUrl = `${BACKEND_URL}/messages/webhook`;

  try {
    logger.info('🔍 Checking current webhook configuration...');
    
    // Получаем текущую информацию о webhook
    const currentInfo = await getWebhookInfo();
    
    if (currentInfo) {
      // Проверяем, уже ли установлен правильный webhook
      if (currentInfo.url === webhookUrl) {
        logger.info(
          { webhookUrl },
          '✅ Webhook is already configured correctly'
        );
        
        // Проверяем наличие ошибок
        if (currentInfo.last_error_date) {
          logger.warn(
            {
              errorDate: new Date(currentInfo.last_error_date * 1000),
              errorMessage: currentInfo.last_error_message,
            },
            '⚠️  Webhook has errors'
          );
        }
        
        if (currentInfo.pending_update_count > 0) {
          logger.warn(
            { pendingUpdates: currentInfo.pending_update_count },
            '⚠️  Webhook has pending updates'
          );
        }
        
        return;
      }
      
      if (currentInfo.url) {
        logger.info(
          { oldUrl: currentInfo.url, newUrl: webhookUrl },
          '🔄 Updating webhook URL...'
        );
      }
    }

    // Устанавливаем webhook
    const success = await setWebhook(webhookUrl);
    
    if (success) {
      logger.info(
        { webhookUrl },
        '✅ Webhook auto-configured successfully'
      );
      
      // Получаем и логируем обновленную информацию
      const newInfo = await getWebhookInfo();
      if (newInfo) {
        logger.info(
          {
            url: newInfo.url,
            pendingUpdates: newInfo.pending_update_count,
          },
          'Webhook status'
        );
      }
    } else {
      logger.error('❌ Failed to auto-configure webhook');
    }
  } catch (error: any) {
    logger.error(
      {
        error: error?.message,
        stack: error?.stack,
      },
      '❌ Error during auto webhook setup'
    );
  }
}

/**
 * Получить статус webhook (для health check)
 */
export async function getWebhookStatus(): Promise<{
  configured: boolean;
  url?: string;
  hasErrors: boolean;
  pendingUpdates: number;
}> {
  if (!TELEGRAM_BOT_TOKEN) {
    return {
      configured: false,
      hasErrors: false,
      pendingUpdates: 0,
    };
  }

  try {
    const info = await getWebhookInfo();
    
    if (!info) {
      return {
        configured: false,
        hasErrors: false,
        pendingUpdates: 0,
      };
    }

    return {
      configured: !!info.url,
      url: info.url,
      hasErrors: !!info.last_error_date,
      pendingUpdates: info.pending_update_count,
    };
  } catch (error) {
    return {
      configured: false,
      hasErrors: true,
      pendingUpdates: 0,
    };
  }
}
