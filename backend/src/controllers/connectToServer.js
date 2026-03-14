import { Server, Socket } from "socket.io";

let connections = {};
let messages = {};
let timeOnLine = {};

export const connectToServer = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      allowedHeaders: ["*"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("Somthing is connected");
    socket.on("join_call", (path) => {
      if (connections[path] == undefined) {
        connections[path] = [];
      }
      connections[path].push(socket.id);

      timeOnLine[socket.id] = new Date();

      connections[path].forEach((element) => {
        io.to(element).emit("user-joined", socket.id, connections[path]);
      });

      if (messages[path] !== undefined) {
        messages[path].forEach((element) => {
          io.to(socket.id).emit(
            "chat-message",
            element["data"],
            element["sender"],
            element["socket-id-sender"]
          );
        });
      }
    });

    socket.on("signal", (toId, message) => {
      io.to(toId).emit("signal", socket.id, message);
    });

    socket.on("chat-message", (data, sender) => {
      let matchingRoom = "";
      let found = false;

      for (const [roomKey, roomValue] of Object.entries(connections)) {
        if (roomValue.includes(socket.id)) {
          matchingRoom = roomKey;
          found = true;
          break;
        }
      }

      if (found == true) {
        if (messages[matchingRoom] == undefined) {
          messages[matchingRoom] = [];
        }
        messages[matchingRoom].push({
          sender: sender,
          data: data,
          "socket-id-sender": socket.id,
        });
        console.log("message", matchingRoom, ":", sender, data);

        connections[matchingRoom].forEach((element) => {
          io.to(element).emit("chat-message", data, sender, socket.id);
        });
      }
    });

    socket.on("disconnect", () => {
      let diffTime = Math.abs(timeOnLine[socket.id] - new Date());

      let key;

      for (const [k, v] of JSON.parse(
        JSON.stringify(Object.entries(connections))
      )) {
        for (let a = 0; a < v.length; a++) {
          if (v[a] == socket.id) {
            key = k;

            const index = connections[key].indexOf(socket.id);

            if (index !== -1) {
              connections[key].forEach((element) => {
                io.to(element).emit("user-left", socket.id);
              });
              connections[key].splice(index, 1);
              if (connections[key].length == 0) {
                delete connections[key];
              }
            }
          }
        }
      }
    });
  });
  return io;
};
