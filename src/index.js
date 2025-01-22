import dotenv from "dotenv"
import connectDb from "./db/db.js"

dotenv.config({ 
    path : './env'
})

connectDb()
.then(() => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server is Listening on Port ${process.env.PORT}`);
    })
})