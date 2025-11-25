import 'dotenv/config';
import axios from 'axios';

const API_VERSION = '5.199';
const BASE_URL = 'https://api.vk.com/method';

const token = process.env.VK_API_TOKEN;
const groupId = process.env.VK_GROUP_ID;
const productId = process.argv[2] ? Number(process.argv[2]) : null;

if (!productId || !token || !groupId) {
  console.error('Usage: npx tsx src/scripts/getProductExtended.ts <productId>');
  process.exit(1);
}

async function main() {
  try {
    console.log(`\n=== Сравнение методов для товара ${productId} ===\n`);
    
    // Метод 1: market.getById БЕЗ extended
    console.log('1. market.getById (без extended):');
    const response1 = await axios.get(`${BASE_URL}/market.getById`, {
      params: {
        item_ids: `-${groupId}_${productId}`,
        v: API_VERSION,
        access_token: token,
      },
    });
    
    if (response1.data.response?.items?.[0]) {
      const product1 = response1.data.response.items[0];
      console.log('   - Поля:', Object.keys(product1));
      console.log('   - photos:', product1.photos ? (Array.isArray(product1.photos) ? `массив из ${product1.photos.length} элементов` : typeof product1.photos) : 'отсутствует');
      console.log('   - thumb_photo:', product1.thumb_photo ? 'есть' : 'нет');
      console.log('   - thumb:', product1.thumb ? (Array.isArray(product1.thumb) ? `массив из ${product1.thumb.length} элементов` : typeof product1.thumb) : 'нет');
    }
    
    // Метод 2: market.getById С extended=1
    console.log('\n2. market.getById (с extended=1):');
    const response2 = await axios.get(`${BASE_URL}/market.getById`, {
      params: {
        item_ids: `-${groupId}_${productId}`,
        v: API_VERSION,
        access_token: token,
        extended: 1,
      },
    });
    
    if (response2.data.response?.items?.[0]) {
      const product2 = response2.data.response.items[0];
      console.log('   - Поля:', Object.keys(product2));
      console.log('   - photos:', product2.photos ? (Array.isArray(product2.photos) ? `массив из ${product2.photos.length} элементов` : typeof product2.photos) : 'отсутствует');
      console.log('   - thumb_photo:', product2.thumb_photo ? 'есть' : 'нет');
      console.log('   - thumb:', product2.thumb ? (Array.isArray(product2.thumb) ? `массив из ${product2.thumb.length} элементов` : typeof product2.thumb) : 'нет');
      
      // Выводим полную структуру photos, если есть
      if (product2.photos && Array.isArray(product2.photos) && product2.photos.length > 0) {
        console.log('\n   - Структура photos:');
        console.log(JSON.stringify(product2.photos.slice(0, 2), null, 6));
      }
    }
    
    // Метод 3: Проверяем, есть ли в описании ссылки на фото
    console.log('\n3. Проверка описания на наличие ссылок:');
    if (response2.data.response?.items?.[0]?.description) {
      const desc = response2.data.response.items[0].description;
      const urlMatches = desc.match(/https?:\/\/[^\s]+/g);
      if (urlMatches) {
        console.log('   - Найдено ссылок в описании:', urlMatches.length);
        urlMatches.slice(0, 3).forEach((url: string, i: number) => {
          console.log(`     ${i + 1}. ${url.substring(0, 80)}...`);
        });
      } else {
        console.log('   - Ссылок в описании не найдено');
      }
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










