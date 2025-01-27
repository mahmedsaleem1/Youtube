import { asyncHandler } from "../utils/asyncHandler.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/apiError.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"

const registerUser = asyncHandler ( async (req, res) => {
    const {username, email, fullname, password} = req.body

    if ([username, email, fullname, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All Fields are Required")
    }

    const existedUser = await User.findOne({
        $or : [{ username } , { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User Already Exists")
    }

    const avatarLocalPath = req.files?.avatar[0].path
    if (!avatarLocalPath) {
        throw new ApiError(409, "Avatar is Required")
    }

    const avatarUrl = await uploadOnCloudinary(avatarLocalPath)
    if (!avatarUrl) {
        throw new ApiError(501, "Avatar Upload Failed please Try again")
    }
    
    let coverImageUrl = "";
    
    if ("coverImage" in req.files) {
        const coverImageLocalPath = req.files.coverImage[0].path
        coverImageUrl = await uploadOnCloudinary(coverImageLocalPath)
        coverImageUrl = coverImageUrl.url
    }

    const createdUser = await User.create({
        username : username.toLowerCase(),
        email,
        fullname,
        password,
        avatar : avatarUrl.url,
        coverImage : coverImageUrl
    })
    
    const userExists = await User.findById(createdUser._id).select("-password -refreshToken")

    if (!userExists) {
        throw new ApiError(500, "User cannot be registered at this time")
    }

    return res.status(201).json(
        new ApiResponse(200, userExists, "User Registered Succesfully")
    )
})



export {registerUser}