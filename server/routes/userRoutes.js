import express from "express";
import {
  checkAuth,
  login,
  signup,
  updateProfile,
  getContacts,
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
} from "../controllers/userController.js";
import { protectRoute } from "../middleware/auth.js";

const userRouter = express.Router();

userRouter.post("/signup", signup);
userRouter.post("/login", login);
userRouter.put("/update-profile", protectRoute, updateProfile);
userRouter.get("/check", protectRoute, checkAuth);

// Friend/contact endpoints
userRouter.get("/friends", protectRoute, getContacts);
userRouter.get("/search", protectRoute, searchUsers);
userRouter.post("/friends/request/:id", protectRoute, sendFriendRequest);
userRouter.post("/friends/accept/:id", protectRoute, acceptFriendRequest);
userRouter.post("/friends/decline/:id", protectRoute, declineFriendRequest);

export default userRouter;
