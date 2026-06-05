import mongoose from "mongoose"

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    minlength: 2,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  // SÄKERHET [Krav 2]: Lösenordet lagras alltid som bcrypt-hash, aldrig i klartext
  // Styrkevalidering sker i server.js innan hashning – schemat lagrar bara resultatet
  // Skyddar mot Information Disclosure om databasen skulle läcka (STRIDE: Information Disclosure)
  password: {
    type: String,
    required: true,
  },
})

export const User = mongoose.model("User", userSchema)
