/**
 * routes/fileRoutes.ts
 */
import { Router } from 'express';
import { uploadFile, getFile } from '../controllers/fileController';

const router = Router();

// POST /api/upload
router.post('/upload', uploadFile);

// GET /api/file/:fileId
router.get('/file/:fileId', getFile);

export default router;
