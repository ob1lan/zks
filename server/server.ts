/**
 * server.ts
 */
import createApp from './app';
import dotenv from 'dotenv';
dotenv.config();

const app = createApp();
const PORT = process.env.PORT ?? 4000;

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
