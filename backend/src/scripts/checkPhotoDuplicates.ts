import 'dotenv/config';
import axios from 'axios';

const API_VERSION = '5.199';
const BASE_URL = 'https://api.vk.com/method';

const token = process.env.VK_API_TOKEN;
const groupId = process.env.VK_GROUP_ID;
const productId = process.argv[2] ? Number(process.argv[2]) : 12111338;

async function main() {
  try {
    const { data } = await axios.get(`${BASE_URL}/market.getById`, {
      params: {
        item_ids: `-${groupId}_${productId}`,
        v: API_VERSION,
        access_token: token,
        extended: 1,
      },
    });

    if (data.error || !data.response?.items?.[0]) {
      console.error('Товар не найден');
      return;
    }

    const product = data.response.items[0];
    
    console.log('\n=== Анализ фото товара ===\n');
    console.log(`thumb_photo: ${product.thumb_photo?.substring(0, 100)}...`);
    
    if (product.photos && Array.isArray(product.photos) && product.photos.length > 0) {
      console.log(`\nФото в массиве photos: ${product.photos.length}`);
      
      product.photos.forEach((photo: any, index: number) => {
        console.log(`\nФото ${index}:`);
        console.log(`  ID: ${photo.id}`);
        
        let photoUrl = '';
        if (photo.orig_photo && photo.orig_photo.url) {
          photoUrl = photo.orig_photo.url;
          console.log(`  URL (orig_photo): ${photoUrl.substring(0, 100)}...`);
        } else if (photo.sizes && photo.sizes.length > 0) {
          const largest = photo.sizes.reduce((prev: any, curr: any) => {
            const prevSize = (prev.width || 0) * (prev.height || 0);
            const currSize = (curr.width || 0) * (curr.height || 0);
            return currSize > prevSize ? curr : prev;
          });
          photoUrl = largest.url;
          console.log(`  URL (largest size): ${photoUrl.substring(0, 100)}...`);
        }
        
        // Проверяем, является ли это тем же фото, что и thumb_photo
        if (product.thumb_photo && photoUrl) {
          // Извлекаем базовый путь файла (без параметров)
          const thumbBase = product.thumb_photo.split('?')[0].split('/').pop()?.split('_')[0];
          const photoBase = photoUrl.split('?')[0].split('/').pop()?.split('_')[0];
          
          console.log(`  Базовое имя thumb: ${thumbBase}`);
          console.log(`  Базовое имя photo: ${photoBase}`);
          console.log(`  Совпадают: ${thumbBase === photoBase}`);
        }
      });
    }
    
  } catch (error: any) {
    console.error('Ошибка:', error.message);
  }
}

main();


