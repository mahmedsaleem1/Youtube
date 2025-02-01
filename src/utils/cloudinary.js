// Considering we have took files from frontend into 
// our local enviroment than we are taking the files
// from local to cloudinary instead of frontend to cloudinary

import { v2 as cloudinary } from 'cloudinary'
import fs from 'fs'

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET 
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null
        // uploading
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type : "auto"
        })
        // file uploaded
        //console.log(`File has been uploaded on Cloudinary ${response.url}`);
        //console.log(response);
        
        fs.unlinkSync(localFilePath)
        return response
    } catch (error) { 
        fs.unlinkSync(localFilePath) // remove the locally saved
                                    //  temporary file if upload is failed
        return null
    }
}
export { uploadOnCloudinary }