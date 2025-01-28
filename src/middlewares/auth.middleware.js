import { asyncHandler } from "../utils/asyncHandler.js"

export const verifyJWT = asyncHandler( async (req, res, next) => {
    req.cookies?.accessToken || req.header("Authorization")
})