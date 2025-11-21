import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { PHOTOS_DIR } from '../database/schema.js';

/**
 * Загружает фото по URL и сохраняет на сервере
 * @param photoUrl - URL фото
 * @param productId - ID товара
 * @param index - Индекс фото (для множественных фото) или 'thumb' для обложки
 * @returns Путь к сохраненному файлу относительно public директории
 */
export const downloadAndSavePhoto = async (
  photoUrl: string,
  productId: number,
  index: number | 'thumb' = 'thumb'
): Promise<string> => {
  try {
    // Создаем директорию для товара если её нет
    const productDir = path.join(PHOTOS_DIR, productId.toString());
    if (!fs.existsSync(productDir)) {
      fs.mkdirSync(productDir, { recursive: true });
    }

    // Определяем имя файла
    const filename = index === 'thumb' ? 'thumb.jpg' : `photo_${index}.jpg`;
    const filePath = path.join(productDir, filename);

    // Если файл уже существует, пропускаем загрузку
    if (fs.existsSync(filePath)) {
      return `/photos/${productId}/${filename}`;
    }

    // Загружаем фото
    const response = await axios.get(photoUrl, {
      responseType: 'arraybuffer',
      timeout: 10000,
    });

    // Сохраняем файл
    fs.writeFileSync(filePath, response.data);

    // Возвращаем путь относительно public директории
    return `/photos/${productId}/${filename}`;
  } catch (error) {
    console.error(`Ошибка при загрузке фото ${photoUrl}:`, error);
    throw error;
  }
};

/**
 * Получает путь к фото товара
 * @param productId - ID товара
 * @param index - Индекс фото или 'thumb' для обложки
 * @returns Путь к файлу или null если файл не существует
 */
export const getPhotoPath = (
  productId: number,
  index: number | 'thumb' = 'thumb'
): string | null => {
  const filename = index === 'thumb' ? 'thumb.jpg' : `photo_${index}.jpg`;
  const filePath = path.join(PHOTOS_DIR, productId.toString(), filename);

  if (fs.existsSync(filePath)) {
    return `/photos/${productId}/${filename}`;
  }

  return null;
};

/**
 * Получает все фото товара
 * @param productId - ID товара
 * @returns Массив путей к фото
 */
export const getAllProductPhotos = (productId: number): string[] => {
  const productDir = path.join(PHOTOS_DIR, productId.toString());
  
  if (!fs.existsSync(productDir)) {
    return [];
  }

  const files = fs.readdirSync(productDir);
  const photos: string[] = [];

  // Сортируем фото: сначала thumb, потом по индексу
  const sortedFiles = files.sort((a, b) => {
    if (a === 'thumb.jpg') return -1;
    if (b === 'thumb.jpg') return 1;
    return a.localeCompare(b);
  });

  for (const file of sortedFiles) {
    // Исключаем thumb.jpg из галереи, так как он используется только как обложка
    if (file === 'thumb.jpg') {
      continue;
    }
    if (file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png')) {
      photos.push(`/photos/${productId}/${file}`);
    }
  }

  return photos;
};


