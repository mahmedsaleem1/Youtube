import mongoose, {Schema} from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt"

const userSchema = new Schema({
    username : {
        type : String,
        required : true,
        unique : true,
        lowercase : true,
        trim : true,  // " Ahmed  " = "Ahmed"
        index : true // to optimize search time
    },
    email : {
        type : String,
        required : true,
        unique : true,
        lowercase : true,
        trim : true,  
    },
    fullname : {
        type : String,
        required : true,
        trim : true,  
    },
    avatar : {
        type : String,  // cloudinary url
        required : true,
    },
    coverImage : {
        type : String,  // cloudinary url
    },
    watchHistory : [
        { type : Schema.Types.ObjectId,
            ref : "Video" 
        }
    ],
    password : {
        type : String,
        required : [true, 'Password is Required'],  //Custom error messag
    },
    refreshToken : {
        type : String
    }
}, { timestamps : true })

userSchema.pre("save", async function (next) { // When ever data is being 'saved' do this (middleware)
    if (!this.isModified("password")) return next()

    this.password = await bcrypt.hash(this.password, 10) // used func insted of () => {} to have 'this' reference
    next()
}) 

userSchema.methods.isPasswordCorrect = async function (password) {  // To have custom methods
    return await bcrypt.compare(password, this.password)
}

userSchema.methods.GenerateAccessToken = function () {
    return jwt.sign(
        {
            _id : this._id,
            email : this.email,
            username : this.username,
            fullname : this.fullname
        },
        process.env.ACCESS_TOKEN_SECRET, 
        {
            expiresIn : process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

userSchema.methods.GenerateRefreshToken = function () {
    return jwt.sign(
        {
            _id : this._id
        },
        process.env.REFRESH_TOKEN_SECRET, 
        {
            expiresIn : process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}   

export const User = mongoose.model("User", userSchema)