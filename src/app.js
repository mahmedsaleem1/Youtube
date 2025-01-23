import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()

app.use(cors({
    origin : process.env.CORS_ORIGIN,
    credentials : true
}))

app.use(express.json({ limit : "16kb" })) // Server may not crash so set a limit
app.use(express.urlencoded({ extended : true, limit : "16kb" }))
app.use(express.static("public"))
app.use(cookieParser())

// Routes import
import userRouter from "./routes/user.route.js"



// Route declare
app.use("/api/v1/users", userRouter)  // https://localhost:8000/api/v1/users/:register


export { app }