import dotenv from 'dotenv';
dotenv.config();

export default {
  BACKEND_PORT: parseInt(process.env.BACKEND_PORT),
  FILE_EXPIRY: parseInt(process.env.FILE_EXPIRY),
  FILE_SIZE: parseInt(process.env.FILE_SIZE),
  FS_FOLDER: process.env.FS_FOLDER,
  JWT_KEY: process.env.JWT_KEY,
  JWT_EXPIRY: parseInt(process.env.JWT_EXPIRY),
  TOTP_SECRET: process.env.TOTP_SECRET,
};
