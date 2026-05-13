import mongoose from "mongoose"

const mongoUrl = process.env.MONGO_URL || "mongodb://localhost/messages"

mongoose.connect(mongoUrl)

mongoose.connection.once("open", () => {
  console.log("Connected to MongoDB")
})

mongoose.connection.on("error", err => {
  console.error("connection error:", err)
})
