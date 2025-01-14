import express from 'express';
import { uploadFile, decryptFile } from '../controllers/fileController';
import multer from 'multer';

const upload = multer(); // Set up multer for file uploads
const router = express.Router();

// Ensure the file ID exists in the request (sample middleware)
const requireFileId = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!req.body.fileId) {
    res.status(400).json({ error: 'File ID is required.' });
  } else {
    next();
  }
};

// Routes
router.post('/upload', upload.single('file'), uploadFile); // Upload route
router.post('/decrypt', requireFileId, decryptFile); // Decrypt route

export default router;
