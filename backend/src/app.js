import dotenv from "dotenv";
dotenv.config();
import express from "express";
import { createServer } from "node:http";

import { Server } from "socket.io";

import mongoose from "mongoose";

import cors from "cors";
import { connectToServer } from "./controllers/connectToServer.js";

import userRoutes from "./routes/users.router.js";

const app = express();
const server = createServer(app);
const io = connectToServer(server);

app.set("port", process.env.PORT || 8000);
app.use(
  cors({
    allowedHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE"],
    origin: [
      "http://localhost:3000",
      "https://talk-sphere-conferencing-app.onrender.com",
    ],
  }),
);
app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }));
app.use("/user", userRoutes);

const start = async () => {
  app.set("mongo_user");
  const connectToDb = await mongoose.connect(process.env.MONGO_URL);

  console.log(`MONGO is connect on HOST : ${connectToDb.connection.host}`);
  server.listen(app.get("port"), () => {
    console.log("Listing on port 8000");
  });
};

start();
