import sharp from 'sharp';
import pino from 'pino';

const logger = pino({ name: 'imageProcessingService' });

export type ImageMetadata = {
  width?: number;
  height?: number;
  format?: string;
  size?: number;
};

export type PreviewOptions = {
  maxSize?: number;
  quality?: number;
};

export const getImageMetadata = async (buffer: Buffer): Promise<ImageMetadata | null> => {
  try {
    const metadata = await sharp(buffer).metadata();
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: buffer.length,
    };
  } catch (error: any) {
    logger.error(
      {
        error: error?.message,
      },
      'Failed to extract image metadata',
    );
    return null;
  }
};

export const generatePreview = async (
  buffer: Buffer,
  options: PreviewOptions = {},
): Promise<Buffer | null> => {
  const { maxSize = 512, quality = 80 } = options;

  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      return null;
    }

    const shouldResize = metadata.width > maxSize || metadata.height > maxSize;

    if (!shouldResize) {
      return buffer;
    }

    return image
      .resize({
        width: metadata.width > metadata.height ? maxSize : undefined,
        height: metadata.height >= metadata.width ? maxSize : undefined,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality })
      .toBuffer();
  } catch (error: any) {
    logger.error(
      {
        error: error?.message,
      },
      'Failed to generate image preview',
    );
    return null;
  }
};


