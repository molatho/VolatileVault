import { expressjwt } from 'express-jwt';
import dotenv from 'dotenv';

dotenv.config();

export const jwt = expressjwt({
  secret: process.env.JTW_KEY,
  algorithms: ['HS512'],
});
