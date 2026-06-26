import { generateToken } from "../lib/utils.js";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";

// Signup a new user
export const signup = async (req, res) => {
  const { fullName, email, password, bio } = req.body;

  try {
    if (!fullName || !email || !password || !bio) {
      return res.json({ success: false, message: "Missing Details" });
    }

    const user = await User.findOne({ email });

    if (user) {
      return res.json({ success: false, message: "Account already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPasswod = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      fullName,
      email,
      password: hashedPasswod,
      bio,
    });

    const token = generateToken(newUser._id);

    return res.json({
      success: true,
      userData: newUser,
      token,
      message: "Account created successfully",
    });
  } catch (error) {
    console.log(error.message);

    res.json({ success: false, message: error.message });
  }
};

// Controller to login a user
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const userData = await User.findOne({ email });

    const isPasswordCorrect = await bcrypt.compare(password, userData.password);

    if (!isPasswordCorrect) {
      return res.json({ success: false, message: "Invalid credentials" });
    }

    const token = generateToken(userData._id);

    return res.json({
      success: true,
      userData,
      token,
      message: "Login successful",
    });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// Controller to check if user is authenticated
export const checkAuth = async (req, res) => {
  res.json({ success: true, user: req.user });
};

// Controller to update user profile details
export const updateProfile = async (req, res) => {
  try {
    const { profilePic, bio, fullName } = req.body;

    const userId = req.user._id;
    let updatedUser;

    if (!profilePic) {
      updatedUser = await User.findByIdAndUpdate(
        userId,
        { bio, fullName },
        { new: true }
      );
    } else {
      const upload = await cloudinary.uploader.upload(profilePic);

      updatedUser = await User.findByIdAndUpdate(
        userId,
        { profilePic: upload.secure_url, bio, fullName },
        { new: true }
      );
    }

    return res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// Controller to get friends + friend requests for the logged in user
export const getContacts = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select(
      "friends incomingRequests outgoingRequests"
    );

    const [friends, incomingRequests, outgoingRequests] = await Promise.all([
      User.find({ _id: { $in: user.friends } }).select("-password"),
      User.find({ _id: { $in: user.incomingRequests } }).select("-password"),
      User.find({ _id: { $in: user.outgoingRequests } }).select("-password"),
    ]);

    return res.json({
      success: true,
      friends,
      incomingRequests,
      outgoingRequests,
    });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// Controller to search for users (excluding self and existing friends/requests)
export const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    const userId = req.user._id;

    if (!q || q.trim() === "") {
      return res.json({ success: true, users: [] });
    }

    const user = await User.findById(userId).select(
      "friends incomingRequests outgoingRequests"
    );

    const excludeIds = [
      userId,
      ...user.friends,
      ...user.incomingRequests,
      ...user.outgoingRequests,
    ];

    const regex = new RegExp(q, "i");
    const users = await User.find({
      _id: { $nin: excludeIds },
      $or: [{ fullName: regex }, { email: regex }],
    }).select("-password");

    return res.json({ success: true, users });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// Controller to send a friend request
export const sendFriendRequest = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id: targetId } = req.params;

    if (userId.toString() === targetId) {
      return res.json({ success: false, message: "Cannot send request to yourself" });
    }

    const [me, target] = await Promise.all([
      User.findById(userId).select("friends incomingRequests outgoingRequests"),
      User.findById(targetId).select("friends incomingRequests outgoingRequests"),
    ]);

    if (!target) {
      return res.json({ success: false, message: "User not found" });
    }

    if (me.friends.some((id) => id.toString() === targetId)) {
      return res.json({ success: false, message: "Already friends" });
    }

    if (me.outgoingRequests.some((id) => id.toString() === targetId)) {
      return res.json({ success: false, message: "Request already sent" });
    }

    if (me.incomingRequests.some((id) => id.toString() === targetId)) {
      return res.json({
        success: false,
        message: "User already sent you a request - accept it instead",
      });
    }

    await Promise.all([
      User.findByIdAndUpdate(userId, {
        $addToSet: { outgoingRequests: targetId },
      }),
      User.findByIdAndUpdate(targetId, {
        $addToSet: { incomingRequests: userId },
      }),
    ]);

    return res.json({ success: true, message: "Friend request sent" });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// Controller to accept a friend request
export const acceptFriendRequest = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id: requesterId } = req.params;

    const user = await User.findById(userId).select(
      "friends incomingRequests outgoingRequests"
    );

    if (!user.incomingRequests.some((id) => id.toString() === requesterId)) {
      return res.json({ success: false, message: "No incoming request from this user" });
    }

    await Promise.all([
      User.findByIdAndUpdate(userId, {
        $pull: { incomingRequests: requesterId },
        $addToSet: { friends: requesterId },
      }),
      User.findByIdAndUpdate(requesterId, {
        $pull: { outgoingRequests: userId },
        $addToSet: { friends: userId },
      }),
    ]);

    return res.json({ success: true, message: "Friend request accepted" });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// Controller to decline a friend request
export const declineFriendRequest = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id: requesterId } = req.params;

    const user = await User.findById(userId).select("incomingRequests outgoingRequests");

    if (!user.incomingRequests.some((id) => id.toString() === requesterId)) {
      return res.json({ success: false, message: "No incoming request from this user" });
    }

    await Promise.all([
      User.findByIdAndUpdate(userId, {
        $pull: { incomingRequests: requesterId },
      }),
      User.findByIdAndUpdate(requesterId, {
        $pull: { outgoingRequests: userId },
      }),
    ]);

    return res.json({ success: true, message: "Friend request declined" });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

