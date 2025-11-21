import 'dotenv/config';
import axios from 'axios';

const API_VERSION = '5.199';
const BASE_URL = 'https://api.vk.com/method';

const token = process.env.VK_API_TOKEN;
const groupId = process.env.VK_GROUP_ID;
const productId = process.argv[2] ? Number(process.argv[2]) : 12111338;

async function main() {
  try {
    console.log(`\n=== Проверка всех источников thumb_photo для товара ${productId} ===\n`);
    
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
      process.exit(1);
    }

    const product = data.response.items[0];
    
    console.log('=== 1. thumb_photo (основная обложка) ===');
    if (product.thumb_photo) {
      console.log(`URL: ${product.thumb_photo}`);
      
      // Извлекаем базовое имя файла
      let thumbBaseName = '';
      try {
        const thumbUrlObj = new URL(product.thumb_photo);
        const thumbBasePath = thumbUrlObj.pathname.split('/').pop()?.split('?')[0];
        thumbBaseName = thumbBasePath?.split('.')[0] || '';
      } catch {
        const thumbBasePath = product.thumb_photo.split('/').pop()?.split('?')[0]?.split('&')[0];
        thumbBaseName = thumbBasePath?.split('.')[0] || '';
      }
      console.log(`Базовое имя файла: ${thumbBaseName}\n`);
      
      // Проверяем, есть ли это фото в других местах
      console.log('=== 2. Проверка массива thumb ===');
      if (product.thumb && Array.isArray(product.thumb)) {
        console.log(`Всего элементов в thumb: ${product.thumb.length}`);
        product.thumb.forEach((thumb: any, index: number) => {
          if (thumb.url) {
            let thumbItemBaseName = '';
            try {
              const thumbUrlObj = new URL(thumb.url);
              const thumbBasePath = thumbUrlObj.pathname.split('/').pop()?.split('?')[0];
              thumbItemBaseName = thumbBasePath?.split('.')[0] || '';
            } catch {
              const thumbBasePath = thumb.url.split('/').pop()?.split('?')[0]?.split('&')[0];
              thumbItemBaseName = thumbBasePath?.split('.')[0] || '';
            }
            
            const matches = thumbBaseName === thumbItemBaseName;
            console.log(`  thumb[${index}]: ${thumb.url.substring(0, 100)}...`);
            console.log(`    Размер: ${thumb.width}x${thumb.height}`);
            console.log(`    Базовое имя: ${thumbItemBaseName}`);
            console.log(`    Совпадает с thumb_photo: ${matches ? 'ДА (ДУБЛИКАТ!)' : 'НЕТ'}\n`);
          }
        });
      } else {
        console.log('Массив thumb отсутствует или пуст\n');
      }
      
      console.log('=== 3. Проверка массива photos ===');
      if (product.photos && Array.isArray(product.photos)) {
        console.log(`Всего фото в photos: ${product.photos.length}`);
        product.photos.forEach((photo: any, index: number) => {
          if (typeof photo === 'object' && photo !== null) {
            let photoUrl = '';
            if (photo.orig_photo && photo.orig_photo.url) {
              photoUrl = photo.orig_photo.url;
            } else if (photo.sizes && Array.isArray(photo.sizes) && photo.sizes.length > 0) {
              const largest = photo.sizes.reduce((prev: any, curr: any) => {
                const prevSize = (prev.width || 0) * (prev.height || 0);
                const currSize = (curr.width || 0) * (curr.height || 0);
                return currSize > prevSize ? curr : prev;
              });
              photoUrl = largest.url || '';
            }
            
            if (photoUrl) {
              let photoBaseName = '';
              try {
                const photoUrlObj = new URL(photoUrl);
                const photoBasePath = photoUrlObj.pathname.split('/').pop()?.split('?')[0];
                photoBaseName = photoBasePath?.split('.')[0] || '';
              } catch {
                const photoBasePath = photoUrl.split('/').pop()?.split('?')[0]?.split('&')[0];
                photoBaseName = photoBasePath?.split('.')[0] || '';
              }
              
              const matches = thumbBaseName === photoBaseName;
              console.log(`  photos[${index}] (ID: ${photo.id}): ${photoUrl.substring(0, 100)}...`);
              console.log(`    Базовое имя: ${photoBaseName}`);
              console.log(`    Совпадает с thumb_photo: ${matches ? 'ДА (ДУБЛИКАТ!)' : 'НЕТ'}\n`);
            }
          }
        });
      } else {
        console.log('Массив photos отсутствует или пуст\n');
      }
    } else {
      console.log('thumb_photo отсутствует\n');
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


