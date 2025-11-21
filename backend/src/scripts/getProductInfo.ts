import 'dotenv/config';
import { fetchProductById } from '../services/vkClient.js';

const productId = process.argv[2] ? Number(process.argv[2]) : null;

if (!productId) {
  console.error('Usage: npm run get-product-info <productId>');
  console.error('Example: npm run get-product-info 12963521');
  process.exit(1);
}

async function main() {
  try {
    console.log(`\nЗапрос полной информации о товаре ${productId} из VK API...\n`);
    
    const product = await fetchProductById(productId);
    
    if (!product) {
      console.error('Товар не найден или произошла ошибка при запросе');
      process.exit(1);
    }
    
    console.log('=== Полная информация о товаре из VK API ===\n');
    console.log(JSON.stringify(product, null, 2));
    
  } catch (error: any) {
    console.error('Ошибка:', error.message);
    process.exit(1);
  }
}

main();


