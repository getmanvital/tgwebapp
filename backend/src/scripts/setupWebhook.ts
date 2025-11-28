import 'dotenv/config';
import axios from 'axios';
import pino from 'pino';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname',
    },
  },
});

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BACKEND_URL = process.env.BACKEND_URL;

interface WebhookInfo {
  url: string;
  has_custom_certificate: boolean;
  pending_update_count: number;
  last_error_date?: number;
  last_error_message?: string;
  max_connections?: number;
  allowed_updates?: string[];
}

/**
 * Получает информацию о текущем webhook
 */
async function getWebhookInfo(): Promise<WebhookInfo | null> {
  try {
    const response = await axios.get(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`
    );
    
    if (response.data.ok) {
      return response.data.result;
    }
    
    logger.error({ data: response.data }, 'Failed to get webhook info');
    return null;
  } catch (error: any) {
    logger.error(
      {
        error: error?.message,
        response: error?.response?.data,
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
  try {
    logger.info({ webhookUrl }, 'Setting webhook...');
    
    const response = await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`,
      {
        url: webhookUrl,
        allowed_updates: ['message'],
        drop_pending_updates: false,
      }
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
 * Удаляет webhook
 */
async function deleteWebhook(): Promise<boolean> {
  try {
    logger.info('Deleting webhook...');
    
    const response = await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook`,
      {
        drop_pending_updates: false,
      }
    );
    
    if (response.data.ok) {
      logger.info('✅ Webhook deleted successfully');
      return true;
    }
    
    logger.error({ data: response.data }, '❌ Failed to delete webhook');
    return false;
  } catch (error: any) {
    logger.error(
      {
        error: error?.message,
        response: error?.response?.data,
      },
      '❌ Error deleting webhook'
    );
    return false;
  }
}

/**
 * Отображает информацию о webhook в удобном формате
 */
function displayWebhookInfo(info: WebhookInfo): void {
  logger.info('');
  logger.info('📊 Webhook Information:');
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (info.url) {
    logger.info(`🔗 URL: ${info.url}`);
  } else {
    logger.warn('⚠️  Webhook is not set');
  }
  
  logger.info(`📝 Pending updates: ${info.pending_update_count}`);
  
  if (info.last_error_date) {
    const errorDate = new Date(info.last_error_date * 1000);
    logger.warn(`❌ Last error: ${errorDate.toLocaleString()}`);
    logger.warn(`   Message: ${info.last_error_message}`);
  } else {
    logger.info('✅ No errors');
  }
  
  if (info.allowed_updates && info.allowed_updates.length > 0) {
    logger.info(`📬 Allowed updates: ${info.allowed_updates.join(', ')}`);
  }
  
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info('');
}

/**
 * Главная функция
 */
async function main() {
  const command = process.argv[2]?.toLowerCase();
  
  logger.info('🤖 Telegram Webhook Setup Script');
  logger.info('');
  
  // Проверка переменных окружения
  if (!TELEGRAM_BOT_TOKEN) {
    logger.error('❌ TELEGRAM_BOT_TOKEN is not set in environment variables');
    logger.info('💡 Add TELEGRAM_BOT_TOKEN to your .env file');
    process.exit(1);
  }
  
  if (!BACKEND_URL && command !== 'info' && command !== 'delete') {
    logger.error('❌ BACKEND_URL is not set in environment variables');
    logger.info('💡 Add BACKEND_URL to your .env file');
    process.exit(1);
  }
  
  // Обработка команд
  switch (command) {
    case 'info':
    case 'status':
      {
        logger.info('📡 Getting webhook information...');
        const info = await getWebhookInfo();
        if (info) {
          displayWebhookInfo(info);
        }
      }
      break;
      
    case 'delete':
    case 'remove':
      {
        const success = await deleteWebhook();
        if (success) {
          logger.info('');
          logger.info('✅ Webhook has been deleted');
          logger.info('💡 Bot will no longer receive updates via webhook');
        }
      }
      break;
      
    case 'set':
    case 'setup':
    default:
      {
        const webhookUrl = `${BACKEND_URL}/messages/webhook`;
        
        logger.info('🔍 Checking current webhook...');
        const currentInfo = await getWebhookInfo();
        
        if (currentInfo?.url === webhookUrl) {
          logger.info('');
          logger.info('✅ Webhook is already set to the correct URL');
          displayWebhookInfo(currentInfo);
          break;
        }
        
        if (currentInfo?.url) {
          logger.warn(`⚠️  Current webhook URL: ${currentInfo.url}`);
          logger.info('🔄 Updating webhook...');
        }
        
        const success = await setWebhook(webhookUrl);
        
        if (success) {
          logger.info('');
          logger.info('✅ Webhook configured successfully!');
          logger.info('');
          logger.info('📝 Next steps:');
          logger.info('   1. Make sure your backend is running and accessible');
          logger.info('   2. Verify HTTPS is working (Telegram requires HTTPS)');
          logger.info('   3. Send a message to your bot to test');
          logger.info('');
          
          // Показываем обновленную информацию
          const newInfo = await getWebhookInfo();
          if (newInfo) {
            displayWebhookInfo(newInfo);
          }
        }
      }
      break;
  }
}

// Запуск скрипта
main().catch((error) => {
  logger.error({ error: error?.message }, '❌ Script failed');
  process.exit(1);
});
