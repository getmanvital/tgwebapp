import 'dotenv/config';
import axios from 'axios';

const API_VERSION = '5.199';
const BASE_URL = 'https://api.vk.com/method';

const token = process.env.VK_API_TOKEN;
const groupId = process.env.VK_GROUP_ID;
const productId = process.argv[2] ? Number(process.argv[2]) : null;

if (!productId || !token || !groupId) {
  console.error('Usage: npx tsx src/scripts/getProductByMarketGet.ts <productId>');
  console.error('Example: npx tsx src/scripts/getProductByMarketGet.ts 12963521');
  process.exit(1);
}

async function main() {
  try {
    console.log(`\nЗапрос товара ${productId} через market.get с extended=1...\n`);
    
    // Пробуем получить товар через market.get
    // Для этого нужно найти товар в какой-то коллекции
    // Сначала получим все товары и найдем нужный
    const { data } = await axios.get(`${BASE_URL}/market.get`, {
      params: {
        owner_id: `-${groupId}`,
        v: API_VERSION,
        access_token: token,
        extended: 1,
        count: 200, // Максимум за один запрос
      },
    });

    if (data.error) {
      console.error('VK API Error:', data.error);
      process.exit(1);
    }

    const items = data.response?.items || [];
    const product = items.find((item: any) => item.id === productId);

    if (!product) {
      console.log('Товар не найден в первых 200 товарах. Пробуем поиск по всем коллекциям...\n');
      
      // Получаем все коллекции
      const albumsResponse = await axios.get(`${BASE_URL}/market.getAlbums`, {
        params: {
          owner_id: `-${groupId}`,
          v: API_VERSION,
          access_token: token,
        },
      });

      const albums = albumsResponse.data.response?.items || [];
      
      // Ищем товар в каждой коллекции
      for (const album of albums) {
        const productsResponse = await axios.get(`${BASE_URL}/market.get`, {
          params: {
            owner_id: `-${groupId}`,
            album_id: album.id,
            v: API_VERSION,
            access_token: token,
            extended: 1,
            count: 200,
          },
        });

        const products = productsResponse.data.response?.items || [];
        const foundProduct = products.find((item: any) => item.id === productId);
        
        if (foundProduct) {
          console.log(`Товар найден в коллекции "${album.title}" (ID: ${album.id})\n`);
          console.log('=== Товар из market.get с extended=1 ===\n');
          console.log(JSON.stringify(foundProduct, null, 2));
          return;
        }
      }
      
      console.error('Товар не найден ни в одной коллекции');
      process.exit(1);
    }

    console.log('=== Товар из market.get с extended=1 ===\n');
    console.log(JSON.stringify(product, null, 2));
    
  } catch (error: any) {
    console.error('Ошибка:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

main();










