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

    // Retrieve metadata
    const metadata = metadataStore[fileId];
    console.log('Metadata:', metadata);
    
    if (!metadata) {
      res.status(404).json({ error: 'File metadata not found.' });
      return;
    }

    // Download the encrypted file from S3
    const downloadParams = { Bucket: BUCKET_NAME, Key: `uploads/${fileId}` };
    const { Body } = await s3Client.send(new GetObjectCommand(downloadParams));

    if (!Body) {
      res.status(404).json({ error: 'File not found.' });
      return;
    }

    // Accumulate the encrypted content from the stream
    const chunks: Uint8Array[] = [];
    for await (const chunk of Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    const encryptedContent = Buffer.concat(chunks).toString();

    // Decrypt the content
    const decrypted = CryptoJS.AES.decrypt(encryptedContent, passphrase, {
      iv: CryptoJS.enc.Hex.parse(metadata.iv),
    });

    const decryptedContent = Buffer.from(decrypted.toString(CryptoJS.enc.Base64), 'base64');

    // Set headers for file download
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(metadata.filename)}"`);
    res.setHeader('Content-Type', 'application/octet-stream');

    // Send the decrypted file
    res.end(decryptedContent);
  } catch (error) {
    console.error('Decryption error:', error);
    res.status(500).json({ error: 'Decryption failed.' });
  }
};
