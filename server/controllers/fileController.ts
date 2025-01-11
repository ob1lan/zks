// controllers/fileController.ts
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, BUCKET_NAME } from '../config/s3Config';
import { Readable } from 'stream';
import CryptoJS from 'crypto-js';

// In-memory store: fileId -> { iv, salt, filename }
interface EncryptedMetadata {
  iv: string;
  salt: string;
  filename: string;
}
const metadataStore: Record<string, EncryptedMetadata> = {};

// controllers/fileController.ts
export const uploadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { iv, salt, filename } = req.body;
    const ciphertext = req.file?.buffer;

    if (!iv || !salt || !filename || !ciphertext) {
      res.status(400).json({
        error: 'Missing required fields',
        details: { iv, salt, filename, ciphertext },
      });
      return;
    }

    const fileId = uuidv4();
    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: `uploads/${fileId}`,
      Body: ciphertext,
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

    metadataStore[fileId] = { iv, salt, filename };

    // Generate a frontend link
    const frontendLink = `http://localhost:3000/decrypt?fileId=${fileId}`;

    res.json({ fileId, frontendLink });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get file metadata and encrypted content
export const getFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileId } = req.params;
    const fileMetadata = metadataStore[fileId];

    if (!fileMetadata) {
      res.status(404).json({ error: 'File not found in metadata store' });
      return;
    }

    res.json(fileMetadata);
  } catch (error) {
    console.error('File retrieval error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Decrypt the file content
export const decryptFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileId, passphrase } = req.body;

    if (!fileId || !passphrase) {
      res.status(400).json({ error: 'Missing fileId or passphrase' });
      return;
    }

    const fileMetadata = metadataStore[fileId];
    if (!fileMetadata) {
      res.status(404).json({ error: 'File metadata not found' });
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
    const encryptedContent = Buffer.concat(chunks).toString();

    // Decrypt the content
    const decryptedWordArray = CryptoJS.AES.decrypt(encryptedContent, passphrase);
    const decryptedBytes = new Uint8Array(CryptoJS.enc.Base64.parse(decryptedWordArray.toString(CryptoJS.enc.Base64)).words);
    const decryptedBuffer = Buffer.from(decryptedBytes.buffer);

    res.json({
      filename: fileMetadata.filename,
      content: decryptedBuffer.toString('base64'), // Send Base64-encoded content
    });
  } catch (error) {
    console.error('Decryption error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
