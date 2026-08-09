import { Router } from "express";
import {
  login,
  register,
  getUserHistory,
  addToHistory,
} from "../controllers/user.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.route("/login").post(login);
router.route("/register").post(register);
router.route("/add_to_activity").post(authenticate, addToHistory);
router.route("/get_all_activity").get(authenticate, getUserHistory);

export default router;
