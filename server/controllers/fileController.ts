// controllers/fileController.ts
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, BUCKET_NAME } from '../config/s3Config';

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

    // Validate inputs
    if (!iv || !salt || !filename || !ciphertext) {
      res.status(400).json({
        error: 'Missing required fields',
        details: {
          iv: iv ? 'Present' : 'Missing',
          salt: salt ? 'Present' : 'Missing',
          filename: filename ? 'Present' : 'Missing',
          ciphertext: ciphertext ? 'Present' : 'Missing',
        },
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
    res.json({ fileId });
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
