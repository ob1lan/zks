// routes/fileRoutes.ts
import { Router } from 'express';
import multer from 'multer';
import { uploadFile, getFile } from '../controllers/fileController';

const router = Router();
const upload = multer(); // Memory storage for uploaded files

// POST /api/upload
router.post('/upload', upload.single('file'), uploadFile);

// GET /api/file/:fileId
router.get('/file/:fileId', getFile);

export default router;
