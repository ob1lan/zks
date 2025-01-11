// controllers/fileController.ts

import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { s3Client, BUCKET_NAME } from '../config/s3Config';

// In-memory store: fileId -> { iv, salt, filename }
interface EncryptedMetadata {
  iv: number[];
  salt: number[];
  filename: string;
}
const metadataStore: Record<string, EncryptedMetadata> = {};

// Uploads encrypted data to S3
export const uploadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { iv, salt, ciphertext, filename } = req.body;

    if (!iv || !salt || !ciphertext || !filename) {
      res.status(400).json({ error: 'Missing required fields (iv, salt, ciphertext, filename)' });
      return;
    }

    const fileId = uuidv4();
    const buffer = Buffer.from(ciphertext);
    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: `uploads/${fileId}`,
      Body: buffer,
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

    metadataStore[fileId] = { iv, salt, filename };
    res.json({ fileId });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileId } = req.params;
    const fileMetadata = metadataStore[fileId];

    if (!fileMetadata) {
      res.status(404).json({ error: 'File not found in metadata store' });
      return;
    }

    const downloadParams = {
      Bucket: BUCKET_NAME,
      Key: `uploads/${fileId}`,
    };

    const data = await s3Client.send(new GetObjectCommand(downloadParams));

    if (!data.Body) {
      res.status(404).json({ error: 'File not found in S3' });
      return;
    }

    const stream = data.Body as Readable;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const ciphertextBuffer = Buffer.concat(chunks);

    res.json({
      iv: fileMetadata.iv,
      salt: fileMetadata.salt,
      filename: fileMetadata.filename,
      ciphertext: Array.from(ciphertextBuffer),
    });
  } catch (error) {
    console.error('File retrieval error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
