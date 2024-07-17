import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import OTPAuth from 'otpauth';
import bodyParser from 'body-parser';
import { Keys } from '../jwt';
import { ConfigInstance } from '../config/instance';

export const getAuthRoute = () => {
  const authRoute = express.Router();

  interface TotpRequestData {
    totp?: string;
  }

  const totp = new OTPAuth.TOTP({
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: ConfigInstance.Inst.general.totp_secret,
  });

  authRoute.use(bodyParser.json());

  authRoute.get('/api/auth', (req: Request, res: Response) => {
    // This route gets caught by the JWT middleware so if we get here the user got a valid JWT.
    return res.status(200).json({ message: 'Authentication success' });
  });

  authRoute.post('/api/auth', (req: Request, res: Response) => {
    var _totp = req.body as TotpRequestData;

    if (
      !_totp?.totp ||
      totp.validate({ token: _totp.totp.replace(/\s/g, ''), window: 3 }) == null
    )
      return res.status(401).json({ message: 'Invalid TOTP' });

    var _jwt = jwt.sign({}, Keys.getInstance().privateKey, {
      algorithm: 'RS512',
      expiresIn: `${ConfigInstance.Inst.general.jwt_expiry}m`,
      subject: 'volatile.vault.dweller',
    });
    res.status(200).json({ message: 'Authentication success', token: _jwt });
  });
  return authRoute;
};
