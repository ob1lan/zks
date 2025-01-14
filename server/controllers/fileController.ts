import { Request, Response } from 'express';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, BUCKET_NAME } from '../config/s3Config';
import CryptoJS from 'crypto-js';

const metadataStore: Record<string, { iv: string; password: string; filename: string }> = {};

export const uploadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { iv, password, filename } = req.body;
    if (!iv || !password || !filename || !req.file?.buffer) {
      res.status(400).json({ error: 'Invalid upload request.' });
      return;
    }

    const fileId = `file_${Date.now()}`;
    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: `uploads/${fileId}`,
      Body: req.file.buffer,
    };

    await s3Client.send(new PutObjectCommand(uploadParams));
    metadataStore[fileId] = { iv, password, filename };

    res.json({ fileId });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed.' });
  }
};

export const decryptFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileId, passphrase } = req.body;
    const metadata = metadataStore[fileId];
    if (!metadata) {
      res.status(404).json({ error: 'File metadata not found.' });
      return;
    }

    const downloadParams = { Bucket: BUCKET_NAME, Key: `uploads/${fileId}` };
    const { Body } = await s3Client.send(new GetObjectCommand(downloadParams));

    const chunks: Buffer[] = [];
    for await (const chunk of Body as AsyncIterable<Buffer>) {
      chunks.push(chunk);
    }

    const decryptedChunks = chunks.map(chunk =>
      CryptoJS.AES.decrypt(chunk.toString('utf8'), passphrase, {
        iv: CryptoJS.enc.Hex.parse(metadata.iv),
      }).toString(CryptoJS.enc.Utf8)
    );

    res.json({ content: decryptedChunks.join(''), filename: metadata.filename });
  } catch (err) {
    console.error('Decryption error:', err);
    res.status(500).json({ error: 'Decryption failed.' });
  }
};

