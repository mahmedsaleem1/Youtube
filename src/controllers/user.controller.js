import { asyncHandler } from "../utils/asyncHandler.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/apiError.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import { trusted } from "mongoose"

 const generateAccessAndRefreshToken = async (userId) => {
    try {
        const userToBeAuthorized = await User.findById (userId)
    
        const genAccessToken = await userToBeAuthorized.GenerateAccessToken()
        const genRefreshToken = await userToBeAuthorized.GenerateRefreshToken()
    
        userToBeAuthorized.refreshToken = genAccessToken
        await userToBeAuthorized.save({ validateBeforeSave : false })

        return {genAccessToken, genRefreshToken}

    } catch (error) {
        throw new ApiError(500, "Unable to generate Tokens at the moment")
    }
 }

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
    
    let avatarLocalPath;

    if (!req.files.avatar) {
        throw new ApiError(408, "Avatar is Required")
    }
    
    avatarLocalPath = req.files.avatar[0].path

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

const loginUser = asyncHandler( async (req, res) => {
    
    const {username, email, password} = req.body
    
    if (!username && !email) {
        throw new ApiError(401, "Email and Username is required")
    }

    const userToBeLoggedIn = await User.findOne({
        username
    })

    if (!userToBeLoggedIn) {
        throw new ApiError(404, "User doesnot Exists")
    }

    const isPassValid = await userToBeLoggedIn.isPasswordCorrect(password)

    if (!isPassValid) {
        throw new ApiError(402, "Password is Incorrect")
    }

    const {genAccessToken, genRefreshToken} = await generateAccessAndRefreshToken(userToBeLoggedIn._id)

    const loggedInUser = await User.findById(userToBeLoggedIn._id).select("-password -refreshToken") // Dont wanna send pass and refToken

    const options = { // Cookie Not modifiable from frontend but from server only
        httpOnly : true,
        secure : true
    }

    return res
            .status(200)
            .cookie("accessToken", genAccessToken, options)
            .cookie("refreshToken", genRefreshToken, options)
            .json(
                new ApiResponse(200, {
                    user : loggedInUser, genAccessToken, genRefreshToken // sending ref and aceess again so 
                }, "User Logged in Successfully")                            // that user may have them by his own 
            )
})

const logOutUser = asyncHandler( async (req, res) => {
    await User.findByIdAndUpdate(req.user._id,
        {
            $set : {
                refreshToken : undefined
            }
        }, {
            new : true
        }
    )
    const options = { // Cookie Not modifiable from frontend but from server only
        httpOnly : true,
        secure : true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out"))
})

const refreshAccessToken = asyncHandler ( async (req, res) => {
    try {
        const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    
        if (!incomingRefreshToken) {
            throw new ApiError(401, "Unauthorized Request")
        }
    
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
        if (!decodedToken) {
            throw new ApiError(402, "Invalid Token")
        }
    
        const bearerUser = await User.findById(decodedToken._id)
    
        if (!bearerUser) {
            throw new ApiError(404, "User with the corresponding Refresh Token is not Found")
        }
    
        if (incomingRefreshToken != bearerUser.refreshToken) {
            throw new ApiError(400, "Refresh Token is expired or Used")
        }
    
        const options = {
            httpsOnly : true,
            secure : true
        }
    
        const {generatedAccessToken, generatedRefreshToken} = generateAccessAndRefreshToken(bearerUser._id)
    
        res
        .status(200)
        .cookie("Access Token", generatedAccessToken, options)
        .cookie("Access Token", generatedRefreshToken, options)
        .json(
            new ApiResponse(
                200,
                {generatedAccessToken, generatedRefreshToken},
                "Access Token Refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(403, "Access Token failed to be Refreshed", error)
    }
})

const updateCurrentPassword = asyncHandler(async(req, res) => {
    const {oldPassword, newPassword} = req.body

    const user = await User.findById(req.user?._id)  // from the auth middle ware | logged In
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"))
})

const getCurrentUser = asyncHandler( async (req, res) => {
    try {
        return res
        .status(200)
        .json(new ApiResponse(
            200, req?.user, "User Fetched Successfully"
        ))
    } catch (error) {
        throw new ApiError(401, "User is unable to be fetched now")
    }
})

const updateUserInfo = asyncHandler( async (req, res) => {
    const {newFullname} = req.body

    const userFound = User.findByIdAndUpdate(req?.user._id, {
        $set : {
            newFullname
        }
    }, {new : true}).select("-password -refreshToken")

    return res
    .status(200)
    .json(new ApiResponse(200, userFound, "Account details updated successfully"))
})

const updateCoverImage = asyncHandler( async(req, res) => {
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath) {
        throw new ApiError(404, "Cover Image is Missing")
    }

    const coverImageUrl = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImageUrl.url) {
        throw new ApiError(400, "Cover Image cannot be updated now, Try again")
    }

    const updatedUser = await User.findByIdAndUpdate(req.user?._id,{
        $set : {coverImage : coverImageUrl.url}
    }, {new : true}).select("-password -refreshToken")

    return res
    .status(200)
    .json(new ApiResponse(
        200, updatedUser, "Cover Image successfully updated"
    ))
})

export {registerUser, loginUser, logOutUser, refreshAccessToken,
    updateCurrentPassword, getCurrentUser, updateUserInfo,
    updateCoverImage
}