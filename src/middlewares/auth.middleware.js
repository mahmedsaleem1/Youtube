import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/apiError.js"
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js"

export const verifyJWT = asyncHandler( async (req, _, next) => {  // res (unused so _)
    try {
    
        const Token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
    
        if (!Token) {
            throw new ApiError(400, "Invalid Access Token")
        }
    
        const decodedToken = jwt.verify(Token, process.env.ACCESS_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
    
        if (!user) {
            throw new ApiError(400, "Unauthorized User")
        }
    
        req.user = user
    
        next()

    } catch (error) {
        throw new ApiError(500, "Error Logging out the user")
    }
    
})