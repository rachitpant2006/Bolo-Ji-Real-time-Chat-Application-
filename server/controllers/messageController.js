import Message from "../models/Messages.js";
import User from "../models/User.js";
import cloudinary from "../lib/cloudinary.js";
import { io, userSocketMap } from "../server.js";
import { handleGeminiCopilot } from "./geminiController.js";

// Get users that the logged in user has chatted with
export const getUsersForSidebar = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find all messages involving the logged in user
    const messages = await Message.find({
      $or: [{ senderId: userId }, { receiverId: userId }],
    }).select("senderId receiverId");

    // Build a set of other user IDs the logged in user has messaged with
    const userIds = new Set();
    messages.forEach((msg) => {
      const senderId = msg.senderId?.toString();
      const receiverId = msg.receiverId?.toString();

      if (senderId && senderId !== userId.toString()) {
        userIds.add(senderId);
      }
      if (receiverId && receiverId !== userId.toString()) {
        userIds.add(receiverId);
      }
    });

    // If no chat partners exist yet, return empty list
    if (userIds.size === 0) {
      return res.json({ success: true, users: [], unseenMessages: {} });
    }

    const filteredUsers = await User.find({
      _id: { $in: Array.from(userIds) },
    }).select("-password");

    // Count number of messages not seen
    const unseenMessages = {};
    const promises = filteredUsers.map(async (user) => {
      const messages = await Message.find({
        senderId: user._id,
        receiverId: userId,
        seen: false,
      });
      if (messages.length > 0) {
        unseenMessages[user._id] = messages.length;
      }
    });

    await Promise.all(promises);

    res.json({ success: true, users: filteredUsers, unseenMessages });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// Get all messages for selected user
export const getMessages = async (req, res) => {
  try {
    const { id: selectedUserId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: selectedUserId },
        { senderId: selectedUserId, receiverId: myId },
      ],
    });

    await Message.updateMany(
      { senderId: selectedUserId, receiverId: myId },
      { seen: true }
    );

    res.json({ success: true, messages });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// API to mark messages as seen using message id
export const markMessageAsSeen = async (req, res) => {
  try {
    const { id } = req.params;

    await Message.findByIdAndUpdate(id, { seen: true });

    res.json({ success: true });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// Check if Cloudinary is configured for image uploads
const isCloudinaryConfigured = () => {
  return (
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET &&
    !process.env.CLOUDINARY_CLOUD_NAME.startsWith("your_")
  );
};

// Send message to selected user
export const sendMessage = async (req, res) => {
  try {
    const { text, image, video } = req.body;
    const receiverId = req.params.id;
    const senderId = req.user._id;

    let imageUrl;
    let videoUrl;

    if (image) {
      if (!isCloudinaryConfigured()) {
        return res.status(503).json({
          success: false,
          message:
            "Image upload is not configured. Add Cloudinary credentials (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) to server .env. Get a free account at cloudinary.com",
        });
      }
      try {
        const uploadResponse = await cloudinary.uploader.upload(image);
        imageUrl = uploadResponse.secure_url;
      } catch (uploadError) {
        console.error("Cloudinary upload error:", uploadError.message);
        return res.status(400).json({
          success: false,
          message: "Image upload failed. Check your Cloudinary settings in .env",
        });
      }
    }

    if (video) {
      if (!isCloudinaryConfigured()) {
        return res.status(503).json({
          success: false,
          message:
            "Cloudinary is not configured. Add Cloudinary credentials to server .env to support video uploads.",
        });
      }
      try {
        const uploadResponse = await cloudinary.uploader.upload(video, {
          resource_type: "video",
        });
        videoUrl = uploadResponse.secure_url;
      } catch (uploadError) {
        console.error("Cloudinary video upload error:", uploadError.message);
        return res.status(400).json({
          success: false,
          message: "Video upload failed. Check your Cloudinary settings in .env",
        });
      }
    }

    const newMessage = await Message.create({
      senderId,
      receiverId,
      text,
      image: imageUrl,
      video: videoUrl,
    });

    // Emit the new message to the receiver's socket
    const receiverSocketId = userSocketMap[receiverId];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    // AI Copilot Trigger: Check if message starts with '@gemini' or is a direct chatbot session
    if (receiverId === "660000000000000000000000" || (text && text.trim().toLowerCase().startsWith("@gemini"))) {
      handleGeminiCopilot(text, senderId, receiverId);
    }

    res.json({ success: true, newMessage });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};


