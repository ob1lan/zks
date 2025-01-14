/**
 * app.ts
 */
import express from 'express';
import cors from 'cors';
import fileRouter from './routes/fileRoutes';

const createApp = () => {
  const app = express();

  // Middleware
  app.use(cors({ 
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000', 
    exposedHeaders: ['Content-Disposition'], 
}));

  // Increase JSON body limit to handle larger ciphertext
  app.use(express.json({ limit: '100mb' }));

  // Mount routes
  app.use('/api', fileRouter);

  return app;
};

export default createApp;
