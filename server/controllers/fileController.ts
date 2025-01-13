// controllers/fileController.ts
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, BUCKET_NAME } from '../config/s3Config';
import { Readable } from 'stream';
import CryptoJS from 'crypto-js';

// In-memory store: fileId -> { iv, salt, filename, password }
interface EncryptedMetadata {
  iv: string;
  salt: string;
  filename: string;
  password: string;
}

const metadataStore: Record<string, EncryptedMetadata> = {};

// Upload File
export const uploadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { iv, salt, filename, password } = req.body;
    const ciphertext = req.file?.buffer;

    if (!iv || !salt || !filename || !ciphertext || !password) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const fileId = uuidv4();
    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: `uploads/${fileId}`,
      Body: ciphertext,
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

    metadataStore[fileId] = { iv, salt, filename, password };

    res.json({ fileId });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Decrypt File
export const decryptFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileId, passphrase, password } = req.body;

    if (!fileId || !passphrase || !password) {
      res.status(400).json({ error: 'Missing fileId, passphrase, or password' });
      return;
    }

    const fileMetadata = metadataStore[fileId];
    if (!fileMetadata) {
      res.status(404).json({ error: 'File metadata not found' });
      return;
    }

    if (fileMetadata.password !== password) {
      res.status(403).json({ error: 'Invalid password' });
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
    const encryptedContent = Buffer.concat(chunks).toString('utf8');

    const decryptedWordArray = CryptoJS.AES.decrypt(encryptedContent, passphrase, {
      iv: CryptoJS.enc.Base64.parse(fileMetadata.iv),
    });

    const decryptedBytes = CryptoJS.enc.Base64.stringify(decryptedWordArray);
    const decryptedBuffer = Buffer.from(decryptedBytes, 'base64');

    res.json({
      filename: fileMetadata.filename,
      content: decryptedBuffer.toString('base64'),
    });
  } catch (error) {
    console.error('Decryption error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileId } = req.params;
    const { password } = req.body; // Expect password in the request body

    const fileMetadata = metadataStore[fileId];

    if (!fileMetadata) {
      res.status(404).json({ error: 'File not found in metadata store' });
      return;
    }

    if (!password || fileMetadata.password !== password) {
      res.status(403).json({ error: 'Invalid or missing password' }); // Validate password
      return;
    }

    res.json(fileMetadata);
  } catch (error) {
    console.error('File retrieval error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
