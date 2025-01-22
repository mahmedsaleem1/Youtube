import mongoose from "mongoose";
import { DB_NAME } from "../constants.js"

const connectDb =  async () => {
    try {
        const connection = await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`)

        console.log(`MongoDb Connection Successfull : ${connection.connection.host}`); 
    } catch (error) {
        console.error("MongoDB Connection Error: ", error)
        process.exit(1)
    }
}

export default connectDb