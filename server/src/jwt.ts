import { expressjwt } from "express-jwt";

export const jwt = expressjwt({
    secret: "abc",
    algorithms: ["HS512"]
});
