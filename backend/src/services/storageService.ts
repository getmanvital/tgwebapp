import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import pino from 'pino';
import { getImageMetadata } from './imageProcessingService.js';

const logger = pino({ name: 'storageService' });

const PROJECT_ROOT = process.cwd();
const CHAT_UPLOADS_DIR = path.join(PROJECT_ROOT, 'data', 'uploads', 'chat');
const CHAT_PREFIX = 'chat';

if (!fs.existsSync(CHAT_UPLOADS_DIR)) {
  fs.mkdirSync(CHAT_UPLOADS_DIR, { recursive: true });
  logger.info({ CHAT_UPLOADS_DIR }, 'Chat uploads directory created');
}

type StorageProvider = 's3' | 'local';

export type StoredFile = {
  key: string;
  provider: StorageProvider;
  url: string;
  relativePath: string;
  size: number;
  mimeType: string;
  metadata: Awaited<ReturnType<typeof getImageMetadata>>;
};

const storageConfig = {
  endpoint: process.env.TIMEWEB_S3_ENDPOINT,
  region: process.env.TIMEWEB_S3_REGION,
  bucket: process.env.TIMEWEB_S3_BUCKET,
  accessKeyId: process.env.TIMEWEB_S3_ACCESS_KEY,
  secretAccessKey: process.env.TIMEWEB_S3_SECRET_KEY,
  cdnUrl: process.env.TIMEWEB_S3_CDN_URL,
};

const isS3Configured =
  Boolean(storageConfig.endpoint) &&
  Boolean(storageConfig.region) &&
  Boolean(storageConfig.bucket) &&
  Boolean(storageConfig.accessKeyId) &&
  Boolean(storageConfig.secretAccessKey);

let s3Client: S3Client | null = null;

if (isS3Configured) {
  s3Client = new S3Client({
    region: storageConfig.region,
    endpoint: storageConfig.endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: storageConfig.accessKeyId!,
      secretAccessKey: storageConfig.secretAccessKey!,
    },
  });
  logger.info(
    {
      endpoint: storageConfig.endpoint,
      bucket: storageConfig.bucket,
      region: storageConfig.region,
      cdn: storageConfig.cdnUrl ?? null,
    },
    'S3 storage configured',
  );
} else {
  logger.warn('S3 storage is not fully configured. Falling back to local storage.');
}

const ensureDir = async (dirPath: string): Promise<void> => {
  await fs.promises.mkdir(dirPath, { recursive: true });
};

const sanitizeSegment = (segment: string): string => {
  return segment.replace(/[^a-zA-Z0-9-_]/g, '');
};

export const getRelativePathFromKey = (key: string): string => {
  if (key.startsWith(`${CHAT_PREFIX}/`)) {
    return key.slice(CHAT_PREFIX.length + 1);
  }
  return key;
};

const getExtension = (mimeType: string, originalName?: string): string => {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };

  if (map[mimeType]) {
    return map[mimeType];
  }

  if (originalName && originalName.includes('.')) {
    return originalName.split('.').pop() || 'bin';
  }

  return 'bin';
};

const buildKey = (userId: string | number, extension: string): { key: string; relativePath: string } => {
  const sanitizedUserId = sanitizeSegment(String(userId));
  const timestamp = Date.now();
  const randomSeed = crypto.randomUUID();
  const relativePath = `${sanitizedUserId}/${timestamp}-${randomSeed}.${extension}`;
  const key = `${CHAT_PREFIX}/${relativePath}`;
  return { key, relativePath };
};

const buildPublicUrl = (key: string, relativePath: string): string => {
  if (isS3Configured) {
    if (storageConfig.cdnUrl) {
      const cdnBase = storageConfig.cdnUrl.replace(/\/$/, '');
      return `${cdnBase}/${key}`;
    }

    const endpoint = storageConfig.endpoint!.replace(/\/$/, '');
    return `${endpoint}/${storageConfig.bucket}/${key}`;
  }

  // Local path is served via Express static middleware
  return `/uploads/chat/${relativePath}`.replace(/\\/g, '/');
};

export type UploadParams = {
  buffer: Buffer;
  mimeType: string;
  originalName?: string;
  userId: number | string;
};

export const uploadChatImage = async ({ buffer, mimeType, originalName, userId }: UploadParams): Promise<StoredFile> => {
  const extension = getExtension(mimeType, originalName);
  const { key, relativePath } = buildKey(userId, extension);
  const metadata = await getImageMetadata(buffer);

  if (isS3Configured && s3Client) {
    try {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: storageConfig.bucket!,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
          ACL: 'public-read',
        }),
      );

      return {
        key,
        provider: 's3',
        url: buildPublicUrl(key, relativePath),
        relativePath,
        size: buffer.length,
        mimeType,
        metadata,
      };
    } catch (error: any) {
      logger.error(
        {
          error: error?.message,
          bucket: storageConfig.bucket,
          key,
        },
        'Failed to upload file to S3',
      );
      throw error;
    }
  }

  const localPath = path.join(CHAT_UPLOADS_DIR, relativePath);
  try {
    await ensureDir(path.dirname(localPath));
    await fs.promises.writeFile(localPath, buffer);
  } catch (error: any) {
    logger.error(
      {
        error: error?.message,
        path: localPath,
      },
      'Failed to save file locally',
    );
    throw error;
  }

  return {
    key,
    provider: 'local',
    url: buildPublicUrl(key, relativePath),
    relativePath,
    size: buffer.length,
    mimeType,
    metadata,
  };
};

export const deleteChatImage = async (key: string, relativePath?: string): Promise<void> => {
  const resolvedRelativePath = relativePath ?? getRelativePathFromKey(key);

  if (isS3Configured && s3Client) {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: storageConfig.bucket!,
        Key: key,
      }),
    );
    return;
  }

  const localPath = path.join(CHAT_UPLOADS_DIR, resolvedRelativePath);
  await fs.promises.unlink(localPath).catch(() => null);
};

export const getChatUploadsDir = (): string => CHAT_UPLOADS_DIR;
export const isS3Enabled = (): boolean => isS3Configured;


