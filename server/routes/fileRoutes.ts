// routes/fileRoutes.ts
import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import { uploadFile, getFile, decryptFile } from '../controllers/fileController';

const router = Router();
const upload = multer({
    limits: { fileSize: 100 * 1024 * 1024 }, // Limit file size to 100MB
});

// Middleware to check for fileId
interface RequestWithFileId extends Express.Request {
    body: {
        fileId?: string;
    };
}

const requireFileId = async (req: RequestWithFileId, res: Response, next: NextFunction): Promise<void> => {
    const { fileId } = req.body;
    if (!fileId) {
        res.status(403).json({ error: 'fileId is required' });
        return;
    }
    next();
};

// POST /api/upload
router.post('/upload', upload.single('file'), uploadFile);

// GET /api/file/:fileId
router.get('/file/:fileId', getFile);

// POST /api/decrypt
router.post('/decrypt', requireFileId, decryptFile);

export default router;
