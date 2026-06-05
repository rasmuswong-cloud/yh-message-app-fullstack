import "dotenv/config"
import helmet from "helmet"
import cors from "cors"
import express from "express"
import mongoose from "mongoose"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import rateLimit from "express-rate-limit" // SÄKERHET [Krav 3]: Importerar rate limiting-paketet
import { Message } from "./models/Message.js"
import { User } from "./models/User.js"
import { authenticateUser } from "./middleware/auth.js"
import "./config/db.js"
import listEndpoints from "express-list-endpoints"

// SÄKERHET: Servern startar inte utan JWT_SECRET – förhindrar att tokensignering sker med undefined-nyckel
if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not set in .env")

const PORT = process.env.PORT || "3000"
const app = express()

// SÄKERHET: Helmet sätter säkra HTTP-headers (t.ex. X-Frame-Options, Content-Security-Policy)
// Skyddar mot vanliga webbattacker som clickjacking och XSS via headers
app.use(helmet())

// SÄKERHET [Krav 4 – risk]: CORS tillåter alla origins med "*"
// I produktion bör detta begränsas till bara frontenddomänen, t.ex. origin: "https://din-app.se"
app.use(cors({
  origin: "*",
}))
app.use(express.json())

// SÄKERHET [Krav 3]: Rate limiting på inloggning – max 10 försök per 15 minuter per IP
// Skyddar mot brute force-attacker (STRIDE: Spoofing, DoS) vid övergången Zon 0 → Zon 1
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuter
  max: 10,
  message: { success: false, message: "Too many login attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
})

app.get("/", (req, res) => {
  res.send(listEndpoints(app))
})

app.post("/register", async (req, res) => {
  try {
    const { email, password, username } = req.body

    if (!username || username.trim().length < 2) {
      return res.status(400).json({ success: false, message: "Username must be at least 2 characters" })
    }

    // SÄKERHET [Krav 2]: Lösenordsvalidering – kontrollerar styrka innan hashning
    // Krav: minst 8 tecken, minst en siffra, minst ett specialtecken
    // Skyddar mot svaga lösenord som är enkla att gissa (STRIDE: Spoofing)
    const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])[A-Za-z0-9!@#$%^&*]{8,}$/
    if (!password || !passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters and contain at least one number and one special character (!@#$%^&*)",
      })
    }

    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username.trim() }]
    })

    if (existingUser) {
      const field = existingUser.email === email.toLowerCase() ? "email" : "username"
      return res.status(400).json({
        success: false,
        message: `A user with this ${field} already exists`
      })
    }

    // SÄKERHET [Krav 2]: bcrypt med kostnadsfaktor 10 – lösenordet lagras aldrig i klartext
    // Även om databasen läcker kan lösenorden inte läsas direkt (STRIDE: Information Disclosure)
    const hashedPassword = await bcrypt.hash(password, 10)
    const user = new User({ username: username.trim(), email, password: hashedPassword })
    await user.save()

    // SÄKERHET [Krav 1]: Token giltig i 30 minuter – användaren loggas ut automatiskt efter det
    // Minskar risken om någon lämnar datorn obevakad (STRIDE: Spoofing, Elevation of Privilege)
    const accessToken = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "30m" }
    )

    res.status(201).json({
      success: true,
      message: "User created successfully",
      response: {
        username: user.username,
        id: user._id,
        accessToken,
      },
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Could not create user",
      error: error,
    })
  }
})

// SÄKERHET [Krav 3]: loginLimiter appliceras här – begränsar inloggningsförsök per IP
app.post("/login", loginLimiter, async (req, res) => {
  try {
    const { login, password } = req.body
    const user = await User.findOne({
      $or: [{ username: login }, { email: login }]
    })

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "No account found with that username or email",
        response: null,
      })
    }

    const passwordMatch = await bcrypt.compare(password, user.password)
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Password is incorrect",
        response: null,
      })
    }

    // SÄKERHET [Krav 1]: Token giltig i 30 minuter – uppfyller kravet om automatisk utloggning
    const accessToken = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "30m" }
    )

    res.json({
      success: true,
      message: "Logged in successfully",
      response: {
        username: user.username,
        id: user._id,
        accessToken,
      },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error,
    })
  }
})

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id)

// SÄKERHET [Krav 4 – notering]: GET /messages kräver ingen inloggning
// Alla kan läsa meddelanden – om appen ska vara privat bör authenticateUser läggas till här
app.get("/messages", async (req, res) => {
  try {
    // 🔐 SÄKERHETSKRAV 4:
    // Denna route saknar authenticateUser → alla kan läsa alla meddelanden.
    // Kravet säger att användaren måste vara inloggad för att göra något.
    // I fas 3 bör authenticateUser läggas här.
    const messages = await Message.find()
      .sort({ createdAt: "desc" })
      .limit(20)
      .populate("user", "username")
      .exec()
    res.json(messages)
  } catch (error) {
    res.status(500).json({ message: "Could not fetch messages" })
  }
})

// SÄKERHET [Krav 4]: authenticateUser krävs – bara inloggade användare kan skapa meddelanden
// Skyddar Zon 1 → Zon 2 (STRIDE: Tampering, Elevation of Privilege)
app.post("/messages", authenticateUser, async (req, res) => {
  const message = new Message({ message: req.body.message, user: req.user._id })
  try {
    const saved = await message.save()
    res.status(201).json(saved)
  } catch (err) {
    res.status(400).json({ message: "Could not save message", errors: err.errors })
  }
})

// SÄKERHET [Krav 4]: authenticateUser + ägarskontroll – användaren kan bara redigera sina egna meddelanden
// message.user.toString() jämförs med req.user._id för att verifiera ägarskap (STRIDE: Tampering)
app.patch("/messages/:id", authenticateUser, async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ error: "Invalid message ID" })
  try {
    const message = await Message.findById(req.params.id)
    if (!message) return res.status(404).json({ error: "Message not found" })

    if (message.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "You can only edit your own messages" })
    }

    message.message = req.body.editedMessage
    await message.save()
    const updated = await message.populate("user", "username")
    res.json(updated)
  } catch (error) {
    res.status(400).json({ error: "Could not update message" })
  }
})

// SÄKERHET [Krav 4 – fix]: authenticateUser och ägarskontroll tillagda
// Originalfilen saknade helt auth här – vem som helst kunde radera vilket meddelande som helst
// utan att ens vara inloggad. Det är ett kritiskt säkerhetshål (STRIDE: Tampering,
// Elevation of Privilege, Zon 1 → Zon 2).
//
// Två separata säkerhetslager:
// 1. Autentisering (authenticateUser): Är du inloggad? – uppfyller Krav 4
// 2. Auktorisering (ägarskontroll): Har du rätt att radera just det här meddelandet?
//    Konsekvent med hur PATCH redan fungerade i originalfilen.
app.delete("/messages/:id", authenticateUser, async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ error: "Invalid message ID" })
  try {
    const message = await Message.findById(req.params.id)
    if (!message) return res.status(404).json({ error: "Message not found" })

    // SÄKERHET [Krav 4]: Ägarskontroll – användaren kan bara radera sina egna meddelanden
    if (message.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "You can only delete your own messages" })
    }

    await message.deleteOne()
    res.status(204).send()
  } catch (error) {
    res.status(400).json({ error: "Could not delete message" })
  }
})

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`)
})
