// controllers/fileController.ts
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, BUCKET_NAME } from '../config/s3Config';
import { Readable } from 'stream';
import CryptoJS from 'crypto-js';
import bcrypt from 'bcrypt';

// In-memory store: fileId -> { iv, salt, filename, password }
interface EncryptedMetadata {
  iv: string;
  salt: string;
  filename: string;
  password: string;
}

const metadataStore: Record<string, EncryptedMetadata> = {};

// controllers/fileController.ts
export const uploadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { iv, salt, filename } = req.body;
    const ciphertext = req.file?.buffer;

    // Validate required fields
    if (!iv || !salt || !filename || !ciphertext) {
      res.status(400).json({
        error: "Missing required fields",
        details: {
          iv: iv ? "Present" : "Missing",
          salt: salt ? "Present" : "Missing",
          filename: filename ? "Present" : "Missing",
          file: ciphertext ? "Present" : "Missing",
        },
      });
      return;
    }

    const fileId = uuidv4();
    const password = uuidv4(); // Generate a strong random password
    const hashedPassword = await bcrypt.hash(password, 10);

    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: `uploads/${fileId}`,
      Body: ciphertext,
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

    metadataStore[fileId] = { iv, salt, filename, password: hashedPassword };

    res.json({ fileId, password }); // Return the password to the user
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Server error" });
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
    const { fileId, passphrase, password } = req.body;

    if (!fileId || !passphrase || !password) {
      res.status(400).json({ error: "Missing fileId, passphrase, or password" });
      return;
    }

    const fileMetadata = metadataStore[fileId];
    if (!fileMetadata) {
      res.status(404).json({ error: "File metadata not found" });
      return;
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, fileMetadata.password);
    if (!isPasswordValid) {
      res.status(403).json({ error: "Invalid password" });
      return;
    }

    const downloadParams = {
      Bucket: BUCKET_NAME,
      Key: `uploads/${fileId}`,
    };

    const data = await s3Client.send(new GetObjectCommand(downloadParams));
    if (!data.Body) {
      res.status(404).json({ error: "File not found in S3" });
      return;
    }

    const stream = data.Body as Readable;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const encryptedContent = Buffer.concat(chunks).toString("utf8");

    // Decrypt binary content
    const decryptedWordArray = CryptoJS.AES.decrypt(encryptedContent, passphrase, {
      iv: CryptoJS.enc.Base64.parse(fileMetadata.iv),
    });

    const decryptedBytes = CryptoJS.enc.Base64.stringify(decryptedWordArray);
    const decryptedBuffer = Buffer.from(decryptedBytes, "base64");

    res.json({
      filename: fileMetadata.filename,
      content: decryptedBuffer.toString("base64"), // Send Base64-encoded binary content
    });
  } catch (error) {
    console.error("Decryption error:", error);
    res.status(500).json({ error: "Server error" });
  }
};
