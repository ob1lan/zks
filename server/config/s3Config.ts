/**
 * config/s3Config.ts
 */
import { S3Client } from '@aws-sdk/client-s3';
import 'dotenv/config'; // So we can use process.env

// Load environment variables
const {
  AWS_REGION,
  S3_BUCKET_NAME
} = process.env;

if (!AWS_REGION || !S3_BUCKET_NAME) {
  throw new Error('Missing AWS_REGION or S3_BUCKET_NAME in environment variables');
}

export const s3Client = new S3Client({ region: AWS_REGION });
export const BUCKET_NAME = S3_BUCKET_NAME;
