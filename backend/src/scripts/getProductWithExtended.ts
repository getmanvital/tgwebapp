import 'dotenv/config';
import axios from 'axios';

const API_VERSION = '5.199';
const BASE_URL = 'https://api.vk.com/method';

const token = process.env.VK_API_TOKEN;
const groupId = process.env.VK_GROUP_ID;
const productId = process.argv[2] ? Number(process.argv[2]) : null;

if (!productId || !token || !groupId) {
  console.error('Usage: npx tsx src/scripts/getProductWithExtended.ts <productId>');
  console.error('Example: npx tsx src/scripts/getProductWithExtended.ts 12963521');
  process.exit(1);
}

async function main() {
  try {
    console.log(`\n=== Запрос товара ${productId} через market.getById с extended=1 ===\n`);
    
    const { data } = await axios.get(`${BASE_URL}/market.getById`, {
      params: {
        item_ids: `-${groupId}_${productId}`,
        v: API_VERSION,
        access_token: token,
        extended: 1, // Ключевой параметр для получения всех фото
      },
    });

    if (data.error) {
      console.error('VK API Error:', data.error);
      process.exit(1);
    }

    if (data.response && data.response.items && data.response.items.length > 0) {
      const product = data.response.items[0];
      
      console.log('=== ПОЛНАЯ ИНФОРМАЦИЯ О ТОВАРЕ ===\n');
      console.log(JSON.stringify(product, null, 2));
      
      // Дополнительный анализ фото
      console.log('\n\n=== АНАЛИЗ ФОТО ===\n');
      console.log(`thumb_photo: ${product.thumb_photo ? 'есть' : 'нет'}`);
      console.log(`thumb: ${product.thumb ? (Array.isArray(product.thumb) ? `массив из ${product.thumb.length} элементов` : typeof product.thumb) : 'нет'}`);
      console.log(`photos: ${product.photos ? (Array.isArray(product.photos) ? `массив из ${product.photos.length} элементов` : typeof product.photos) : 'нет'}`);
      
      if (product.photos && Array.isArray(product.photos)) {
        console.log(`\nНайдено ${product.photos.length} фото в массиве photos:\n`);
        product.photos.forEach((photo: any, index: number) => {
          console.log(`Фото ${index + 1}:`);
          console.log(`  - ID: ${photo.id}`);
          console.log(`  - Owner ID: ${photo.owner_id}`);
          console.log(`  - Дата: ${new Date(photo.date * 1000).toLocaleString()}`);
          console.log(`  - Размеров в sizes: ${photo.sizes ? photo.sizes.length : 0}`);
          if (photo.sizes && photo.sizes.length > 0) {
            const largest = photo.sizes.reduce((prev: any, curr: any) => {
              const prevSize = (prev.width || 0) * (prev.height || 0);
              const currSize = (curr.width || 0) * (curr.height || 0);
              return currSize > prevSize ? curr : prev;
            });
            console.log(`  - Самый большой размер: ${largest.width}x${largest.height} (${largest.type})`);
            console.log(`  - URL: ${largest.url.substring(0, 100)}...`);
          }
          if (photo.orig_photo) {
            console.log(`  - Оригинальное фото: ${photo.orig_photo.width}x${photo.orig_photo.height}`);
            console.log(`  - Оригинальный URL: ${photo.orig_photo.url.substring(0, 100)}...`);
          }
          console.log('');
        });
      }
      
    } else {
      console.error('Товар не найден');
      process.exit(1);
    }
    
  } catch (error: any) {
    console.error('Ошибка:', error.message);
    if (error.response) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

main();


