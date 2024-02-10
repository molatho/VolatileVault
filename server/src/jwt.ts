import { expressjwt } from 'express-jwt';
import config from './config';

export const jwt = expressjwt({
  secret: config.JWT_KEY,
  algorithms: ['HS512'],
});
