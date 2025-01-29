import { asyncHandler } from "../utils/asyncHandler.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/apiError.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"

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
        throw new ApiError(409, "Avatar is Required")
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
    
    if (!username || !email) {
        throw new ApiError(401, "Email and Username is required")
    }

    const userToBeLoggedIn = await User.findOne({
        $or : {username, email}
    })

    if (!userToBeLoggedIn) {
        throw new ApiError(404, "User doesnot Exists")
    }

    const isPassValid = await userToBeLoggedIn.isPasswordCorrect(password)

    if (!isPassValid) {
        throw new ApiError(402, "Password is Incorrect")
    }

    const {genAccessToken, genRefreshToken} = await generateAccessAndRefreshToken(userToBeLoggedIn._id)

    const loggedInUser = User.findById(userId._id).select("-password -refreshToken") // Dont wanna send pass and refToken

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
                }, "User Logged in Successfully")                                                       // that user may have them by his own 
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

export {registerUser, loginUser, logOutUser}