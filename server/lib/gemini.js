import { GoogleGenerativeAI } from "@google/generative-ai";

let genAI = null;

// Initialize the Gemini API client lazily
export const getGeminiClient = () => {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
};

// Check if Gemini is configured in the environment variables
export const isGeminiConfigured = () => {
  return !!process.env.GEMINI_API_KEY;
};
