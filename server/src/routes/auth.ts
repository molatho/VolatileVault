import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import OTPAuth from 'otpauth';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';

dotenv.config();

export const authRoute = express.Router();

interface TotpRequestData {
    totp?: string;
}

const totp = new OTPAuth.TOTP({
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: process.env.TOTP_SECRET
})

authRoute.use(bodyParser.json());

authRoute.post('/api/auth', (req: Request, res: Response) => {
    var _totp = req.body as TotpRequestData;

    if (!(_totp?.totp) || totp.validate({token: _totp.totp.replace(/\s/g, ""), window: 3}) == null)
        return res.status(401).send();

    var _jwt = jwt.sign({}, process.env.JTW_KEY, {
        algorithm: "HS512",
        expiresIn: "1h",
        subject: "volatile.vault.dweller"
    })
    res.status(200).send(_jwt);
});