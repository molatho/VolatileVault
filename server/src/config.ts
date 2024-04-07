import dotenv from 'dotenv';
dotenv.config();

export default {
  BACKEND_PORT: parseInt(process.env.BACKEND_PORT),
  FILE_EXPIRY: parseInt(process.env.FILE_EXPIRY),
  FILE_SIZE: parseInt(process.env.FILE_SIZE),
  FS_FOLDER: process.env.FS_FOLDER,
  JWT_EXPIRY: parseInt(process.env.JWT_EXPIRY),
  TOTP_SECRET: process.env.TOTP_SECRET,
  AWS_ACCESS: process.env.AWS_ACCESS,
  AWS_SECRET: process.env.AWS_SECRET,
  AWS_REGION: process.env.AWS_REGION,
  ORIGIN_DOMAIN: process.env.ORIGIN_DOMAIN,
};
