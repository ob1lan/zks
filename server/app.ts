/**
 * app.ts
 */
import express from 'express';
import cors from 'cors';
import fileRouter from './routes/fileRoutes';

const createApp = () => {
  const app = express();

  // Middleware
  app.use(cors());
  // Increase JSON body limit to handle larger ciphertext
  app.use(express.json({ limit: '100mb' }));

  // Mount routes
  app.use('/api', fileRouter);

  return app;
};

export default createApp;
