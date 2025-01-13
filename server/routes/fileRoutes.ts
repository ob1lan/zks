import { Router } from 'express';
import { uploadFile, getFile, decryptFile } from '../controllers/fileController';

const router = Router();

// POST /api/upload
router.post('/upload', uploadFile);

// GET /api/file/:fileId
router.get('/file/:fileId', getFile);

// POST /api/decrypt
router.post('/decrypt', decryptFile);

export default router;
