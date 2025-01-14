import express from 'express';
import { uploadFile, decryptFile } from '../controllers/fileController';
import multer from 'multer';

const upload = multer({
  limits: { fileSize: 100 * 1024 * 1024 },
}); 
const router = express.Router();

const requireFileId = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!req.body.fileId) {
    console.error('Missing fileId in request body');
    res.status(400).json({ error: 'File ID is required.' });
    return;
  }
  next();
};

// Routes
router.post('/upload', upload.single('file'), (req, res, next) => {
  console.log('File uploaded:', req.file);
  console.log('Request body:', req.body);
  next();
}, uploadFile);

router.post('/decrypt', requireFileId, decryptFile);

export default router;
