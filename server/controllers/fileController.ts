/**
 * controllers/fileController.ts
 */

import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { s3Client, BUCKET_NAME } from '../config/s3Config';

/**
 * In-memory store: fileId -> { iv, salt, filename }
 *  - The ciphertext itself is stored in S3
 */
interface EncryptedMetadata {
  iv: number[];
  salt: number[];
  filename: string;
}
const metadataStore: Record<string, EncryptedMetadata> = {};

/**
 * Uploads encrypted data to S3, then saves IV/salt/filename in metadataStore.
 */
export const uploadFile = async (req: Request, res: Response) => {
  try {
    const { iv, salt, ciphertext, filename } = req.body;

    if (!iv || !salt || !ciphertext || !filename) {
      return res.status(400).json({ error: 'Missing required fields (iv, salt, ciphertext, filename)' });
    }

    // Generate unique fileId
    const fileId = uuidv4();

    // 1) Save ciphertext to S3
    const buffer = Buffer.from(ciphertext); // ciphertext is an array of numbers
    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: `uploads/${fileId}`, // Use fileId as the object key
      Body: buffer,
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

    // 2) Store IV, salt, and filename in memory
    metadataStore[fileId] = {
      iv,
      salt,
      filename
    };

    // Return fileId to client
    return res.json({ fileId });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Retrieves metadata from memory, fetches the ciphertext from S3, and returns them to the client.
 */
export const getFile = async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    const fileMetadata = metadataStore[fileId];

    if (!fileMetadata) {
      return res.status(404).json({ error: 'File not found in metadata store' });
    }

    // 1) Fetch ciphertext from S3
    const downloadParams = {
      Bucket: BUCKET_NAME,
      Key: `uploads/${fileId}`
    };

    const data = await s3Client.send(new GetObjectCommand(downloadParams));

    if (!data.Body) {
      return res.status(404).json({ error: 'File not found in S3' });
    }

    // data.Body is a stream; convert to Buffer
    const stream = data.Body as Readable;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const ciphertextBuffer = Buffer.concat(chunks);

    // 2) Return combined JSON
    return res.json({
      iv: fileMetadata.iv,
      salt: fileMetadata.salt,
      filename: fileMetadata.filename,
      ciphertext: Array.from(ciphertextBuffer) // Convert Buffer back to array
    });
  } catch (error) {
    console.error('File retrieval error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};
