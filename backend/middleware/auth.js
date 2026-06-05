import jwt from "jsonwebtoken"
import { User } from "../models/User.js"

// SÄKERHET [Krav 4]: Middleware som skyddar alla privata routes
// Verifierar att en giltig JWT-token skickats med i Authorization-headern
// Används som grindvakt vid övergången Zon 1 → Zon 2 (frontend → server)
export const authenticateUser = async (req, res, next) => {
  const token = req.headers.authorization?.replace("Bearer ", "")

  // SÄKERHET: Om ingen token finns nekas åtkomst direkt med 401
  if (!token) {
    return res.status(401).json({ success: false, message: "No token provided" })
  }

  try {
    // SÄKERHET: jwt.verify kontrollerar både signatur och utgångstid (expiresIn)
    // Om token manipulerats eller gått ut kastas ett fel och användaren nekas åtkomst
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    const user = await User.findById(decoded.userId)

    // SÄKERHET: Kontrollerar att användaren fortfarande finns i databasen
    // Skyddar mot fall där ett konto raderats men en gammal token fortfarande används
    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" })
    }

    // Lägger användaren på req.user så att routes kan kontrollera ägarskap
    req.user = user
    next()
  } catch (err) {
    // SÄKERHET: Alla JWT-fel (utgången token, ogiltig signatur) returnerar 401
    res.status(401).json({ success: false, message: "Invalid token" })
  }
}
