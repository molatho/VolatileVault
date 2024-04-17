import dotenv from 'dotenv';
dotenv.config();

export default {
  BACKEND_PORT: 1234,
  FILE_EXPIRY: 60, //seconds
  FILE_SIZE: 104857600,
  FS_FOLDER: "./files",
  JWT_EXPIRY: 12,
  TOTP_SECRET: process.env.TOTP_SECRET,
  AWS_ACCESS: process.env.AWS_ACCESS,
  AWS_SECRET: process.env.AWS_SECRET,
  AWS_REGION: process.env.AWS_REGION,
  ORIGIN_DOMAIN: process.env.ORIGIN_DOMAIN,
  USE_CLOUDSTORAGE: process.env.USE_CLOUDSTORAGE === 'true' ? true : false,
  DEBUG: false,
};
