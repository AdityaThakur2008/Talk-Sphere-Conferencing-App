import { User } from "../models/users.model.js";
import httpStatus from "http-status";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { Meeting } from "../models/meeting.model.js";
import jwt from "jsonwebtoken";

const login = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({
      message: "Please provide",
    });
  }

  try {
    const user = await User.findOne({ username });

    if (!user) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json({ message: `User NOT FOUND` });
    }

    let isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (isPasswordCorrect) {
      const token = jwt.sign(
        {
          id: user._id.toString(),
          username: user.username,
        },
        process.env.JWT_SECRET,
        {
          expiresIn: process.env.JWT_EXPIRES_IN || "7d",
        },
      );

      return res.status(httpStatus.OK).json({ token });
    } else {
      return res
        .status(httpStatus.UNAUTHORIZED)
        .json({ message: "Invalid password" });
    }
  } catch (error) {
    return res.status(500).json({ message: `something went wrong ${error}` });
  }
};

const register = async (req, res) => {
  const { name, username, password } = req.body;

  try {
    const existingUser = await User.findOne({ username });

    if (existingUser) {
      return res
        .status(httpStatus.FOUND)
        .json({ message: "User already exist" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name: name,
      username: username,
      password: hashedPassword,
    });

    newUser.save();

    return res
      .status(httpStatus.OK)
      .json({ message: "User register Succecefully" });
  } catch (error) {
    return res.status(500).json({ message: `something went wrong ${error}` });
  }
};

const getUserHistory = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }
    const meetings = await Meeting.find({ user_id: user.username });
    res.json(meetings);
  } catch (error) {
    res.json({ message: `something went wrong ${error}` });
  }
};

const addToHistory = async (req, res) => {
  const { token, meeting_Code } = req.body;

  try {
    const user = await User.findOne({ token: token });
    if (!user) {
      return res
        .status(httpStatus.NOT_FOUND)
        .json({ message: "User not found" });
    } else {
      const newMeeting = new Meeting({
        user_id: user.username,
        meetingCode: meeting_Code,
      });
      await newMeeting.save();
      return res
        .status(httpStatus.CREATED)
        .json({ message: "Meeting added to history" });
    }
  } catch (error) {
    res.json({ message: `something went wrong ${error}` });
  }
};

export { login, register, getUserHistory, addToHistory };
