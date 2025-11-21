import 'dotenv/config';
import axios from 'axios';

const API_VERSION = '5.199';
const BASE_URL = 'https://api.vk.com/method';

const token = process.env.VK_API_TOKEN;
const groupId = process.env.VK_GROUP_ID;
const productId = process.argv[2] ? Number(process.argv[2]) : null;

if (!productId || !token || !groupId) {
  console.error('Usage: npx tsx src/scripts/getProductPhotoUrls.ts <productId>');
  process.exit(1);
}

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

    if (data.error) {
      console.error('VK API Error:', data.error);
      process.exit(1);
    }

    if (data.response && data.response.items && data.response.items.length > 0) {
      const product = data.response.items[0];
      
      const photoUrls: string[] = [];
      
      // Добавляем thumb_photo (обложка)
      if (product.thumb_photo) {
        photoUrls.push(product.thumb_photo);
      }
      
      // Добавляем фото из массива photos (используем orig_photo или самый большой размер)
      if (product.photos && Array.isArray(product.photos)) {
        product.photos.forEach((photo: any) => {
          // Используем orig_photo если есть, иначе самый большой размер из sizes
          if (photo.orig_photo && photo.orig_photo.url) {
            photoUrls.push(photo.orig_photo.url);
          } else if (photo.sizes && Array.isArray(photo.sizes) && photo.sizes.length > 0) {
            // Находим самый большой размер
            const largest = photo.sizes.reduce((prev: any, curr: any) => {
              const prevSize = (prev.width || 0) * (prev.height || 0);
              const currSize = (curr.width || 0) * (curr.height || 0);
              return currSize > prevSize ? curr : prev;
            });
            if (largest.url) {
              photoUrls.push(largest.url);
            }
          }
        });
      }
      
      console.log('\n=== URL ссылки на фото товара ===\n');
      console.log(JSON.stringify(photoUrls, null, 2));
      
      console.log(`\n\nВсего фото: ${photoUrls.length}\n`);
      photoUrls.forEach((url, index) => {
        console.log(`${index + 1}. ${url}`);
      });
      
    } else {
      console.error('Товар не найден');
      process.exit(1);
    }
    
  } catch (error: any) {
    console.error('Ошибка:', error.message);
    process.exit(1);
  }
}

main();



