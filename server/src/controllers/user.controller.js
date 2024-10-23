import { User } from "../models/user.model.js";

// Create a new user
export const createUser = async (req, res) => {
  try {
    const { name, username, email, password, avatar } = req.body;
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a user by ID
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update a user
export const updateUser = async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete a user
export const deleteUser = async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// logged-in user
export const me = async (req, res) => {
  try {
    // Assuming req.user contains user data
    const userData = req.user;

    // Check if userData exists
    if (!userData) {
      return res.status(404).json({ error: "User not found" });
    }

    // Create a copy of the user data without sensitive fields
    const { password, ...userPublicData } = userData.toObject(); // Convert mongoose document to plain object

    // Return the user data without password and email
    return res.status(200).json({ user: userPublicData });
  } catch (error) {
    // Log detailed error message for debugging
    console.error("Error fetching user data:", error.message, error.stack);

    // Return a generic error message to the client
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
