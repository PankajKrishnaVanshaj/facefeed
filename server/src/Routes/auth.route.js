import express from "express";
import "../config/google-strategy.js";
import passport from "passport";
import { me } from "../controllers/user.controller.js";
import authMiddleware from "../middleware/authMiddleware.js";

const authRoute = express.Router();

authRoute.get("/me", authMiddleware, me);

// Route for initiating Google OAuth
authRoute.get(
  "/google",
  passport.authenticate("google", {
    session: false,
    scope: ["profile", "email"],
  })
);

// Route for handling Google OAuth callback
authRoute.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${process.env.CLIENT_HOST}`,
  }),
  (req, res) => {
    if (req.user && req.user.token) {
      const { token } = req.user;

      // Log token for debugging
      // console.log("Generated token:", token);

      // Redirect to client with token in URL
      res.redirect(`${process.env.CLIENT_HOST}?token=${token}`);
    } else {
      // Handle case where no token is available
      res.redirect(`${process.env.CLIENT_HOST}`);
    }
  }
);

export default authRoute;
