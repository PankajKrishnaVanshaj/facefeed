import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js"; // Correctly import the User model

// Hash a string (password)
export const hashString = async (userValue) => {
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userValue, salt);
    return hashedPassword;
  } catch (error) {
    // console.error("Error hashing string:", error);
    throw new Error("Hashing failed");
  }
};

// Compare a string (password) with a hashed value
export const compareString = async (userPassword, hashedPassword) => {
  try {
    const isMatch = await bcrypt.compare(userPassword, hashedPassword);
    return isMatch;
  } catch (error) {
    // console.error("Error comparing strings:", error);
    throw new Error("Comparison failed");
  }
};

// Create a JSON Web Token (JWT)
export function createJWT(id) {
  try {
    return jwt.sign({ userId: id }, process.env.JWT_SECRET_KEY, {
      expiresIn: "7d",
    });
  } catch (error) {
    // console.error("Error creating JWT:", error);
    throw new Error("JWT creation failed");
  }
}

// Generate a unique username
export const generateUniqueUsername = async (baseUsername) => {
  try {
    let username = baseUsername;
    let exists = await User.findOne({ username });

    while (exists) {
      // Generate a random number between 10000 and 99999
      const randomNumber = Math.floor(Math.random() * 90000) + 10000;
      username = `${baseUsername}${randomNumber}`;
      exists = await User.findOne({ username });
    }

    return username;
  } catch (error) {
    // console.error("Error generating unique username:", error);
    throw new Error("Username generation failed");
  }
};
