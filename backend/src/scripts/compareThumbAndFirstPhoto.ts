import 'dotenv/config';
import axios from 'axios';

const API_VERSION = '5.199';
const BASE_URL = 'https://api.vk.com/method';

const token = process.env.VK_API_TOKEN;
const groupId = process.env.VK_GROUP_ID;
const productId = process.argv[2] ? Number(process.argv[2]) : 12111338;

async function main() {
  try {
    console.log(`\n=== Сравнение thumb_photo и первого фото из photos для товара ${productId} ===\n`);
    
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
    
    console.log('=== thumb_photo ===');
    if (product.thumb_photo) {
      console.log(`URL: ${product.thumb_photo}`);
      
      // Извлекаем базовое имя файла
      try {
        const thumbUrlObj = new URL(product.thumb_photo);
        const thumbBasePath = thumbUrlObj.pathname.split('/').pop()?.split('?')[0];
        const thumbFileName = thumbBasePath?.split('.')[0];
        console.log(`Базовое имя файла: ${thumbFileName}`);
      } catch {
        const thumbBasePath = product.thumb_photo.split('/').pop()?.split('?')[0]?.split('&')[0];
        const thumbFileName = thumbBasePath?.split('.')[0];
        console.log(`Базовое имя файла: ${thumbFileName}`);
      }
    } else {
      console.log('thumb_photo отсутствует');
    }
    
    console.log('\n=== Первое фото из массива photos ===');
    if (product.photos && Array.isArray(product.photos) && product.photos.length > 0) {
      const firstPhoto = product.photos[0];
      
      if (typeof firstPhoto === 'object' && firstPhoto !== null) {
        console.log(`ID фото: ${firstPhoto.id}`);
        
        let photoUrl = '';
        if (firstPhoto.orig_photo && firstPhoto.orig_photo.url) {
          photoUrl = firstPhoto.orig_photo.url;
          console.log(`URL (orig_photo): ${photoUrl}`);
        } else if (firstPhoto.sizes && Array.isArray(firstPhoto.sizes) && firstPhoto.sizes.length > 0) {
          const largest = firstPhoto.sizes.reduce((prev: any, curr: any) => {
            const prevSize = (prev.width || 0) * (prev.height || 0);
            const currSize = (curr.width || 0) * (curr.height || 0);
            return currSize > prevSize ? curr : prev;
          });
          photoUrl = largest.url || '';
          console.log(`URL (самый большой размер): ${photoUrl}`);
        }
        
        // Извлекаем базовое имя файла
        if (photoUrl) {
          try {
            const photoUrlObj = new URL(photoUrl);
            const photoBasePath = photoUrlObj.pathname.split('/').pop()?.split('?')[0];
            const photoFileName = photoBasePath?.split('.')[0];
            console.log(`Базовое имя файла: ${photoFileName}`);
          } catch {
            const photoBasePath = photoUrl.split('/').pop()?.split('?')[0]?.split('&')[0];
            const photoFileName = photoBasePath?.split('.')[0];
            console.log(`Базовое имя файла: ${photoFileName}`);
          }
        }
        
        console.log(`\nВсего фото в массиве photos: ${product.photos.length}`);
      } else {
        console.log('Первое фото не является объектом');
      }
    } else {
      console.log('Массив photos пуст или отсутствует');
    }
    
    // Сравнение
    console.log('\n=== Сравнение ===');
    if (product.thumb_photo && product.photos && Array.isArray(product.photos) && product.photos.length > 0) {
      const firstPhoto = product.photos[0];
      let photoUrl = '';
      
      if (firstPhoto.orig_photo && firstPhoto.orig_photo.url) {
        photoUrl = firstPhoto.orig_photo.url;
      } else if (firstPhoto.sizes && Array.isArray(firstPhoto.sizes) && firstPhoto.sizes.length > 0) {
        const largest = firstPhoto.sizes.reduce((prev: any, curr: any) => {
          const prevSize = (prev.width || 0) * (prev.height || 0);
          const currSize = (curr.width || 0) * (curr.height || 0);
          return currSize > prevSize ? curr : prev;
        });
        photoUrl = largest.url || '';
      }
      
      if (photoUrl) {
        // Извлекаем базовые имена файлов
        let thumbFileName = '';
        let photoFileName = '';
        
        try {
          const thumbUrlObj = new URL(product.thumb_photo);
          const thumbBasePath = thumbUrlObj.pathname.split('/').pop()?.split('?')[0];
          thumbFileName = thumbBasePath?.split('.')[0] || '';
        } catch {
          const thumbBasePath = product.thumb_photo.split('/').pop()?.split('?')[0]?.split('&')[0];
          thumbFileName = thumbBasePath?.split('.')[0] || '';
        }
        
        try {
          const photoUrlObj = new URL(photoUrl);
          const photoBasePath = photoUrlObj.pathname.split('/').pop()?.split('?')[0];
          photoFileName = photoBasePath?.split('.')[0] || '';
        } catch {
          const photoBasePath = photoUrl.split('/').pop()?.split('?')[0]?.split('&')[0];
          photoFileName = photoBasePath?.split('.')[0] || '';
        }
        
        console.log(`Базовое имя thumb_photo: ${thumbFileName}`);
        console.log(`Базовое имя первого фото: ${photoFileName}`);
        console.log(`Совпадают: ${thumbFileName === photoFileName ? 'ДА (это дубликат!)' : 'НЕТ (разные фото)'}`);
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

















