// routes/fileRoutes.ts
import { Router } from 'express';
import multer from 'multer';
import { uploadFile, getFile, decryptFile } from '../controllers/fileController';

const router = Router();
const upload = multer(); // Memory storage for uploaded files

// POST /api/upload
router.post('/upload', upload.single('file'), uploadFile);

// GET /api/file/:fileId
router.get('/file/:fileId', getFile);

// POST /api/decrypt
router.post('/decrypt', decryptFile);

export default router;
