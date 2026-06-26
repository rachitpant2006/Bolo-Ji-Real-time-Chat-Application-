import jwt from "jsonwebtoken";

// Function to generate a token for a user
export const generateToken = (userId) => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 10) {
    throw new Error("JWT_SECRET is missing or too short. Set it in .env");
  }
  return jwt.sign({ userId }, secret);
};
