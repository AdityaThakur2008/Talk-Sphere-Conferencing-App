import React, { useEffect, useRef, useState, useCallback } from "react";
import "../styles/videoMeet.css";
import io from "socket.io-client";
import { useNavigate } from "react-router-dom";
import { IconButton, Badge } from "@mui/material";
import {
  Mic,
  Videocam,
  VideocamOff,
  CallEnd,
  Chat,
  SpeakerNotesOff,
  Send,
  ScreenShareOutlined,
  StopScreenShareOutlined,
  MicOffOutlined,
  Person,
} from "@mui/icons-material";
import { buildMediaConstraints } from "./videoMeetUtils";

const server_url = "https://talk-sphere-backend-oqiz.onrender.com";

const connections = {};

const peerConfigConnections = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export default function VideoMeetComponent() {
  const navigate = useNavigate();
  const socketRef = useRef();
  const socketIdRef = useRef();
  const localVideoRef = useRef();
  const videoRef = useRef([]);
  const messagesEndRef = useRef(null);

  const [videoAvailable, setVideoAvailable] = useState(true);
  const [audioAvailable, setAudioAvailable] = useState(true);
  const [video, setVideo] = useState(true);
  const [audio, setAudio] = useState(true);
  const [screen, setScreen] = useState(false);
  const [showModel, setModel] = useState(false);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [newMessages, setNewMessages] = useState(0);
  const [askForUsername, setAskForUserName] = useState(true);
  const [username, setUsername] = useState("");
  const [videos, setVideos] = useState([]);

  const getPermissions = useCallback(async () => {
    try {
      const videoPermission = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      videoPermission.getTracks().forEach((track) => track.stop());
      setVideoAvailable(true);
    } catch (error) {
      setVideoAvailable(false);
    }

    try {
      const audioPermission = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      audioPermission.getTracks().forEach((track) => track.stop());
      setAudioAvailable(true);
    } catch (error) {
      setAudioAvailable(false);
    }
  }, []);

  useEffect(() => {
    getPermissions();
  }, [getPermissions]);

  const getUserMediaSuccess = useCallback((stream) => {
    if (window.localStream) {
      window.localStream.getTracks().forEach((track) => track.stop());
    }

    window.localStream = stream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    Object.entries(connections).forEach(([id, connection]) => {
      if (id === socketIdRef.current) return;
      connection.addStream(window.localStream);
      connection
        .createOffer()
        .then((description) => {
          connection
            .setLocalDescription(description)
            .then(() => {
              socketRef.current?.emit(
                "signal",
                id,
                JSON.stringify({ sdp: connection.localDescription }),
              );
            })
            .catch((e) => console.log(e));
        })
        .catch((e) => console.log(e));
    });

    stream.getTracks().forEach((track) => {
      track.onended = () => {
        setVideo(false);
        setAudio(false);
      };
    });
  }, []);

  const getUserMedia = useCallback(() => {
    const constraints = buildMediaConstraints({
      videoEnabled: video,
      audioEnabled: audio,
      videoAvailable,
      audioAvailable,
    });

    if (constraints.video || constraints.audio) {
      navigator.mediaDevices
        .getUserMedia(constraints)
        .then(getUserMediaSuccess)
        .catch((e) => console.log(e));
      return;
    }

    try {
      const stream = localVideoRef.current?.srcObject;
      stream?.getTracks().forEach((track) => track.stop());
    } catch (e) {
      console.log(e);
    }
  }, [audio, audioAvailable, getUserMediaSuccess, video, videoAvailable]);

  useEffect(() => {
    getUserMedia();
  }, [getUserMedia]);

  const gotMessageFromServer = useCallback((fromID, message) => {
    const signal = JSON.parse(message);
    if (fromID === socketIdRef.current || !connections[fromID]) {
      return;
    }

    if (signal.sdp) {
      connections[fromID]
        .setRemoteDescription(new RTCSessionDescription(signal.sdp))
        .then(() => {
          if (signal.sdp.type === "offer") {
            connections[fromID]
              .createAnswer()
              .then((description) => {
                connections[fromID]
                  .setLocalDescription(description)
                  .then(() => {
                    socketRef.current?.emit(
                      "signal",
                      fromID,
                      JSON.stringify({
                        sdp: connections[fromID].localDescription,
                      }),
                    );
                  })
                  .catch((e) => console.log(e));
              })
              .catch((e) => console.log(e));
          }
        })
        .catch((e) => console.log(e));
    }

    if (signal.ice) {
      connections[fromID]
        .addIceCandidate(new RTCIceCandidate(signal.ice))
        .catch((e) => console.log(e));
    }
  }, []);

  const addMessage = useCallback((data, sender, socketIdSender) => {
    setMessages((prevMessages) => [...prevMessages, { sender, data }]);
    if (socketIdSender !== socketIdRef.current) {
      setNewMessages((prevNewMessages) => prevNewMessages + 1);
    }
  }, []);

  const connectToSocketServer = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    socketRef.current = io.connect(server_url, { secure: false });
    socketRef.current.on("signal", gotMessageFromServer);

    socketRef.current.on("connect", () => {
      socketRef.current.emit("join_call", window.location.href);
      socketIdRef.current = socketRef.current.id;
      socketRef.current.on("chat-message", addMessage);

      socketRef.current.on("user-left", (id) => {
        setVideos((prevVideos) =>
          prevVideos.filter((video) => video.socketId !== id),
        );
      });

      socketRef.current.on("user-joined", (id, clients) => {
        clients.forEach((socketListId) => {
          if (connections[socketListId]) {
            return;
          }

          connections[socketListId] = new RTCPeerConnection(
            peerConfigConnections,
          );
          connections[socketListId].onicecandidate = (event) => {
            if (event.candidate !== null) {
              socketRef.current?.emit(
                "signal",
                socketListId,
                JSON.stringify({ ice: event.candidate }),
              );
            }
          };

          connections[socketListId].onaddstream = (event) => {
            setVideos((prevVideos) => {
              const existingVideo = prevVideos.find(
                (video) => video.socketId === socketListId,
              );
              if (existingVideo) {
                return prevVideos.map((video) =>
                  video.socketId === socketListId
                    ? { ...video, stream: event.stream }
                    : video,
                );
              }

              return [
                ...prevVideos,
                { socketId: socketListId, stream: event.stream },
              ];
            });
          };

          if (window.localStream) {
            connections[socketListId].addStream(window.localStream);
          }
        });

        if (id === socketIdRef.current) {
          Object.entries(connections).forEach(([id2, connection]) => {
            if (id2 === socketIdRef.current) {
              return;
            }

            if (window.localStream) {
              connection.addStream(window.localStream);
            }

            connection.createOffer().then((description) => {
              connection.setLocalDescription(description).then(() => {
                socketRef.current?.emit(
                  "signal",
                  id2,
                  JSON.stringify({ sdp: connection.localDescription }),
                );
              });
            });
          });
        }
      });
    });
  }, [addMessage, gotMessageFromServer]);

  const getMedia = useCallback(() => {
    setVideo(videoAvailable);
    setAudio(audioAvailable);
    connectToSocketServer();
  }, [audioAvailable, connectToSocketServer, videoAvailable]);

  const connect = () => {
    setAskForUserName(false);
    getMedia();
  };

  const getDisplayMediaSuccess = useCallback(
    (stream) => {
      if (window.localStream) {
        window.localStream.getTracks().forEach((track) => track.stop());
      }

      window.localStream = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      Object.entries(connections).forEach(([id, connection]) => {
        if (id === socketIdRef.current) return;
        connection.addStream(window.localStream);
        connection.createOffer().then((description) => {
          connection.setLocalDescription(description).then(() => {
            socketRef.current?.emit(
              "signal",
              id,
              JSON.stringify({ sdp: connection.localDescription }),
            );
          });
        });
      });

      stream.getTracks().forEach((track) => {
        track.onended = () => {
          setScreen(false);
          getUserMedia();
        };
      });
    },
    [getUserMedia],
  );

  const getDisplayMedia = useCallback(() => {
    if (!screen) return;

    if (navigator.mediaDevices.getDisplayMedia) {
      navigator.mediaDevices
        .getDisplayMedia({ video: true, audio: true })
        .then(getDisplayMediaSuccess)
        .catch((e) => console.log(e));
    }
  }, [getDisplayMediaSuccess, screen]);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = () => {
    if (!socketRef.current || !message.trim()) return;
    socketRef.current.emit("chat-message", message.trim(), username || "Guest");
    setMessage("");
  };

  useEffect(() => {
    getDisplayMedia();
  }, [getDisplayMedia]);

  const handleCallEnd = () => {
    try {
      const stream = localVideoRef.current?.srcObject;
      stream?.getTracks().forEach((track) => track.stop());
    } catch (e) {
      console.log(e);
    }

    socketRef.current?.disconnect();
    navigate("/home");
  };

  const handleChatModel = () => {
    setModel((value) => !value);
    setNewMessages(0);
  };

  useEffect(() => {
    setMessages([]);
  }, []);

  return (
    <div className="VideoMeet ">
      {askForUsername === true ? (
        <div className="Container ">
          <div className="JoinOptions ">
            <h2>Ready to Join?</h2>

            <div className="AskUsername">
              <input
                className="UsernameInput"
                id="outlined-basic"
                label="Username"
                placeholder="Enter Username"
                color="White"
                value={username}
                variant="outlined"
                onChange={(e) => setUsername(e.target.value)}
              />
              <button onClick={connect}>Connect</button>
            </div>
          </div>
          <div className="VideoPreview ">
            <video ref={localVideoRef} autoPlay muted></video>
          </div>
        </div>
      ) : (
        <div className="Main ">
          <div className="video-container ">
            {/* <div className="main-video ">
              <video ref={localVideoRef} autoPlay muted></video>
            </div> */}
            <div className="User-Video">
              <video ref={localVideoRef} autoPlay muted></video>
            </div>
            <div className="video-cards">
              {videos.map((video) => {
                return (
                  <div key={video.socketId}>
                    <video
                      data-socket={video.socketId}
                      ref={(ref) => {
                        if (
                          ref &&
                          video.stream &&
                          ref.srcObject !== video.stream
                        ) {
                          ref.srcObject = video.stream;
                        }
                      }}
                      autoPlay
                      playsInline
                    />
                  </div>
                );
              })}
            </div>
            <div className="video-options-container">
              <div className="video-options  ">
                <IconButton
                  onClick={() => {
                    setAudio((value) => !value);
                  }}>
                  {audio === true ? <Mic /> : <MicOffOutlined />}
                </IconButton>
                <IconButton onClick={() => setVideo((value) => !value)}>
                  {video === true ? <Videocam /> : <VideocamOff />}
                </IconButton>
                <IconButton onClick={handleCallEnd}>
                  <CallEnd />
                </IconButton>
                <IconButton
                  onClick={() => {
                    setScreen((value) => !value);
                  }}>
                  {screen === true ? (
                    <ScreenShareOutlined />
                  ) : (
                    <StopScreenShareOutlined />
                  )}
                </IconButton>
                <IconButton onClick={handleChatModel}>
                  <Badge badgeContent={newMessages} color="error">
                    {showModel === true ? <Chat /> : <SpeakerNotesOff />}
                  </Badge>
                </IconButton>
              </div>
            </div>
          </div>

          <div
            className="chat-container"
            style={{ display: showModel ? "flex" : "none" }}>
            <h2>Chat Area</h2>

            <div className="SendMessageContainer">
              {messages.length !== 0 ? (
                messages.map((item, index) => (
                  <div className="Messages" key={index}>
                    <Person className="Person" />
                    <p className="Username">{item.sender}</p>
                    <p className="message">{item.data}</p>
                  </div>
                ))
              ) : (
                <div className="Messages">
                  <p>No Messages Yet</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="ChatInput">
              <input
                className="MessageInput"
                placeholder="Type a message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <button className="SendButton" onClick={sendMessage}>
                <Send />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
