import mongoose from "mongoose";

// Function to connect to the mongodb database
export const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri || uri.includes("xxxxx")) {
    const err = new Error(
      "MONGO_URI is missing or still has placeholder (xxxxx). Set a valid MongoDB connection string in .env"
    );
    console.error(err.message);
    throw err;
  }

  try {
    mongoose.connection.on("connected", () =>
      console.log("Database Connected")
    );

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });
  } catch (error) {
    console.error("Database connection failed:", error.message);
    throw error;
  }
};
