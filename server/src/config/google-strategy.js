// Config/google-strategy.js
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import passport from "passport";
import dotenv from "dotenv";
import {
  createJWT,
  generateUniqueUsername,
  hashString,
} from "../utils/index.js";
import { User } from "../models/user.model.js"; // Correctly import the User model

dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/v1/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value || null;
        const name = profile.displayName;
        const avatar = profile.photos?.[0]?.value || "";

        if (!email) {
          return done(new Error("No email found in profile"));
        }

        let user = await User.findOne({ email });
        if (!user) {
          const lastSixDigitsID = profile.id.slice(-6);
          const lastTwoDigitsName = name.slice(-2);
          const newPass = lastTwoDigitsName + lastSixDigitsID;
          const hashedPassword = await hashString(newPass);
          const defaultUsername = email.split("@")[0];
          const uniqueUsername = await generateUniqueUsername(defaultUsername);

          user = await User.create({
            name,
            email,
            username: uniqueUsername,
            password: hashedPassword,
            avatar,
          });
        }

        user.password = undefined;
        const token = createJWT(user._id); // Ensure this function returns a token
        // console.log("Generated token in strategy:", token); // Debugging

        return done(null, { user, token });
      } catch (error) {
        return done(error);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  done(null, obj);
});
