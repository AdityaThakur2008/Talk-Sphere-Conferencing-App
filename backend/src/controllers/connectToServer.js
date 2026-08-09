import { Server } from "socket.io";
import jwt from "jsonwebtoken";

const connections = {};
const messages = {};

export const connectToServer = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        socket.user = { username: "Guest", isGuest: true };
        return next();
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      socket.user = { ...decoded, isGuest: false };

      next();
    } catch (error) {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    console.log("Authenticated socket:", socket.user.username);

    socket.on("join_call", (path) => {
      if (!path || typeof path !== "string") {
        return;
      }

      if (socket.talkSphereRoom) {
        const oldRoom = socket.talkSphereRoom;

        if (connections[oldRoom]) {
          connections[oldRoom] = connections[oldRoom].filter(
            (id) => id !== socket.id,
          );

          connections[oldRoom].forEach((id) => {
            io.to(id).emit("user-left", socket.id);
          });

          if (connections[oldRoom].length === 0) {
            delete connections[oldRoom];
            delete messages[oldRoom];
          }
        }
      }

      if (!connections[path]) {
        connections[path] = [];
      }

      if (!connections[path].includes(socket.id)) {
        connections[path].push(socket.id);
      }

      socket.talkSphereRoom = path;

      console.log(`Socket ${socket.id} joined room: ${path}`);

      connections[path].forEach((id) => {
        io.to(id).emit("user-joined", socket.id, connections[path]);
      });

      if (messages[path]) {
        messages[path].forEach((message) => {
          io.to(socket.id).emit(
            "chat-message",
            message.data,
            message.sender,
            message["socket-id-sender"],
          );
        });
      }
    });

    socket.on("signal", (toId, message) => {
      const room = socket.talkSphereRoom;

      if (!room) {
        return;
      }

      if (!toId || !connections[room]) {
        return;
      }

      if (!connections[room].includes(toId)) {
        console.warn(`Blocked signal from ${socket.id} to ${toId}`);
        return;
      }

      io.to(toId).emit("signal", socket.id, message);
    });

    socket.on("chat-message", (data, sender) => {
      const room = socket.talkSphereRoom;

      if (!room || !connections[room]) {
        return;
      }

      if (typeof data !== "string" || !data.trim()) {
        return;
      }

      const cleanMessage = data.trim();

      const cleanSender =
        typeof sender === "string" && sender.trim()
          ? sender.trim().slice(0, 50)
          : "Guest";

      const message = {
        sender: cleanSender,
        data: cleanMessage,
        "socket-id-sender": socket.id,
      };

      if (!messages[room]) {
        messages[room] = [];
      }

      messages[room].push(message);

      console.log(`Message in ${room}:`, cleanSender, cleanMessage);

      connections[room].forEach((id) => {
        io.to(id).emit("chat-message", cleanMessage, cleanSender, socket.id);
      });
    });

    socket.on("disconnect", () => {
      const room = socket.talkSphereRoom;

      if (!room || !connections[room]) {
        console.log(`Socket disconnected: ${socket.id}`);
        return;
      }

      connections[room] = connections[room].filter((id) => id !== socket.id);

      connections[room].forEach((id) => {
        io.to(id).emit("user-left", socket.id);
      });

      if (connections[room].length === 0) {
        delete connections[room];

        delete messages[room];
      }

      delete socket.talkSphereRoom;

      console.log(`Socket ${socket.id} disconnected from room: ${room}`);
    });
  });

  return io;
};
