// routes/fileRoutes.ts
import { Router } from 'express';
import multer from 'multer';
import { uploadFile, getFile, decryptFile } from '../controllers/fileController';

const router = Router();
const upload = multer({
    limits: { fileSize: 100 * 1024 * 1024 }, // Limit file size to 100MB
});

// POST /api/upload
router.post('/upload', upload.single('file'), uploadFile);

// GET /api/file/:fileId
router.get('/file/:fileId', getFile);

// POST /api/decrypt
router.post('/decrypt', decryptFile);

export default router;
