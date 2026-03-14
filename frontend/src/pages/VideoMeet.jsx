import React, { useEffect, useRef, useState } from "react";
import "../styles/videoMeet.css";
import io from "socket.io-client";
import { useNavigate } from "react-router-dom";
import {
  Avatar,
  IconButton,
  Badge,
  TextField,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  Box,
  Typography,
  Button,
} from "@mui/material";
import {
  Mic,
  Videocam,
  VideocamOff,
  CallEnd,
  Chat,
  People,
  SpeakerNotesOff,
  Send,
  ScreenShareOutlined,
  StopScreenShareOutlined,
  MicOffOutlined,
  Person,
} from "@mui/icons-material";

const server_url = "https://talk-sphere-backend-oqiz.onrender.com";

let connections = {};

const peerConfigConnections = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export default function VideoMeetComponent() {
  const navigate = useNavigate();
  let socketRef = useRef();
  let socketIdRef = useRef();

  let localVideoRef = useRef();

  let [videoAvailable, setVideoAvailable] = useState(true);

  let [audioAvailable, setAudioAvailable] = useState(true);

  let [video, setVideo] = useState([]);

  let [audio, setAudio] = useState();

  let [screen, setScreen] = useState(false);

  let [showModel, setModel] = useState(false);

  let [screenAvailable, setScreenAvailable] = useState();

  let [messages, setMessages] = useState([]);

  let [message, setMessage] = useState("");

  let [newMessages, setNewMessages] = useState(0);

  let [askForUsername, setAskForUserName] = useState(true);

  let [username, setUsername] = useState("");

  const videoRef = useRef([]);

  let [videos, setVideos] = useState([]);

  const messagesEndRef = useRef(null);

  // if(isChrome() == false){

  // }
  useEffect(() => {
    getPermissions();
  }, []);

  const getPermissions = async () => {
    try {
      const videoPermission = await navigator.mediaDevices.getUserMedia({
        video: true,
      });

      if (videoPermission) {
        setVideoAvailable(true);
      } else {
        setVideoAvailable(false);
      }

      const audioPermission = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      if (audioPermission) {
        setAudioAvailable(true);
      } else {
        setAudioAvailable(false);
      }

      if (navigator.mediaDevices.getDisplayMedia) {
        setScreenAvailable(true);
      } else {
        setScreenAvailable(false);
      }

      if (videoAvailable || audioAvailable) {
        const userMediaStream = await navigator.mediaDevices.getUserMedia({
          video: videoAvailable,
          audio: audioAvailable,
        });

        if (userMediaStream) {
          window.localStream = userMediaStream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = userMediaStream;
          }
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  let getUserMediaSuccess = (stream) => {
    try {
      window.localStream.getTracks().forEach((track) => {
        track.stop();
      });
    } catch (error) {
      console.log(error);
    }
    window.localStream = stream;
    localVideoRef.current.srcObject = stream;

    for (let id in connections) {
      if (id === socketIdRef.current) continue;
      connections[id].addStream(window.localStream);

      connections[id]
        .createOffer()
        .then((description) => {
          connections[id]
            .setLocalDescription(description)
            .then(() => {
              socketRef.current.emit(
                "signal",
                id,
                JSON.stringify({ sdp: connections[id].localDescription })
              );
            })
            .catch((e) => console.log(e));
        })
        .catch((e) => console.log(e));
    }
    stream.getTracks().forEach(
      (track) =>
        (track.onended = () => {
          setVideo(false);
          setAudio(false);
          try {
            let tracks = localVideoRef.current.srcObject.getTracks();
            tracks.forEach((track) => track.stop());
          } catch (error) {
            console.log(error);
          }
          let blackSilence = (...args) =>
            new MediaStream([black(...args), silence()]);

          window.localStream = blackSilence();
          localVideoRef.current.srcObject = window.localStream;
          for (let id in connections) {
            connections[id].addStream(window.localStream);

            connections[id].createOffer().then((description) => {
              connections[id]
                .setLocalDescription(description)
                .then(() => {
                  socketRef.current.emit(
                    "signal",
                    id,
                    JSON.stringify({ sdp: connections[id].localDescription })
                  );
                })
                .catch((e) => console.log(e));
            });
          }
        })
    );
  };

  let silence = () => {
    let ctx = new AudioContext();
    let oscillator = ctx.createOscillator();

    let dst = oscillator.connect(ctx.createMediaStreamDestination());

    oscillator.start();

    ctx.resume();
    return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false });
  };

  let black = ({ width = 640, height = 480 } = {}) => {
    let canvas = Object.assign(document.createElement("canvas"), {
      width,
      height,
    });

    canvas.getContext("2d").fillRect(0, 0, width, height);
    let stream = canvas.captureStream();
    return Object.assign(stream.getVideoTracks()[0], { enabled: false });
  };

  let getUserMedia = () => {
    if ((video && videoAvailable) || (audio && audioAvailable)) {
      navigator.mediaDevices
        .getUserMedia({ video: video, audio: audio })
        .then(getUserMediaSuccess)
        .then((stream) => {})
        .catch((e) => console.log(e));
    } else {
      try {
        let tracks = localVideoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      } catch (e) {}
    }
  };

  useEffect(() => {
    if (video !== undefined && audio !== undefined) {
      getUserMedia();
    }
  }, [video, audio]);

  let gotMessageFromServer = (fromID, message) => {
    let signal = JSON.parse(message);
    if (fromID !== socketIdRef.current) {
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
                      socketRef.current.emit(
                        "signal",
                        fromID,
                        JSON.stringify({
                          sdp: connections[fromID].localDescription,
                        })
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
    }
  };

  let addMessage = (data, sender, socketIdSender) => {
    setMessages((prevMessages) => [
      ...prevMessages,
      { sender: sender, data: data },
    ]);
    if (socketIdSender !== socketIdRef.current) {
      setNewMessages((prevNewMessages) => prevNewMessages + 1);
    }
  };

  let connectToSocketServer = () => {
    socketRef.current = io.connect(server_url, { secure: false });
    socketRef.current.on("signal", gotMessageFromServer);

    socketRef.current.on("connect", () => {
      socketRef.current.emit("join_call", window.location.href);

      socketIdRef.current = socketRef.current.id;

      socketRef.current.on("chat-message", addMessage);

      socketRef.current.on("user-left", (id) => {
        setVideos((videos) => videos.filter((video) => video.socketId !== id));
      });
      socketRef.current.on("user-joined", (id, clients) => {
        clients.forEach((socketListId) => {
          connections[socketListId] = new RTCPeerConnection(
            peerConfigConnections
          );

          connections[socketListId].onicecandidate = (event) => {
            if (event.candidate != null) {
              socketRef.current.emit(
                "signal",
                socketListId,
                JSON.stringify({ ice: event.candidate })
              );
            }
          };

          connections[socketListId].onaddstream = (event) => {
            let videoExists = videoRef.current.find(
              (video) => video.socketId === socketListId
            );

            if (videoExists) {
              setVideos((videos) => {
                const updatedVideos = videos.map((video) =>
                  video.socketId === socketListId
                    ? { ...video, stream: event.stream }
                    : video
                );
                videoRef.current = updatedVideos;
                return updatedVideos;
              });
            } else {
              let newVideo = {
                socketId: socketListId,
                stream: event.stream,
                autoPlay: true,
                playsinline: true,
              };

              setVideos((videos) => {
                const updatedVideos = [...videos, newVideo];
                videoRef.current = updatedVideos;
                return updatedVideos;
              });
            }
          };
          if (window.localStream !== undefined && window.localStream !== null) {
            connections[socketListId].addStream(window.localStream);
          } else {
            let blackSilence = (...args) =>
              new MediaStream([black(...args), silence()]);

            window.localStream = blackSilence();
            connections[socketListId].addStream(window.localStream);
          }
        });

        if (id === socketIdRef.current) {
          for (let id2 in connections) {
            if (id2 === socketIdRef.current) {
              continue;
            }
            try {
              connections[id2].addStream(window.localStream);
            } catch (error) {}
            connections[id2].createOffer().then((description) => {
              connections[id2]
                .setLocalDescription(description)
                .then(() => {
                  socketRef.current.emit(
                    "signal",
                    id2,
                    JSON.stringify({ sdp: connections[id2].localDescription })
                  );
                })
                .catch((e) => console.log(e));
            });
          }
        }
      });
    });
  };

  let getMedia = () => {
    setVideo(videoAvailable);
    setAudio(audioAvailable);
    connectToSocketServer();
  };

  let connect = () => {
    setAskForUserName(false);
    getMedia();
  };
  let getDisplayMediaSuccess = (stream) => {
    try {
      window.localStream.getTracks().forEach((track) => track.stop());
    } catch (error) {
      console.log(error);
    }

    window.localStream = stream;
    localVideoRef.current.srcObject = stream;

    for (let id in connections) {
      if (id == socketIdRef.current) {
        continue;
      }
      connections[id].addStream(window.localStream);

      connections[id].createOffer().then((description) => {
        connections[id]
          .setLocalDescription(description)
          .then(() => {
            socketRef.current.emit(
              "signal",
              id,
              JSON.stringify({ sdp: connections[id].localDescription })
            );
          })
          .catch((e) => console.log(e));
      });
    }

    stream.getTracks().forEach(
      (track) =>
        (track.onended = () => {
          setScreen(false);

          try {
            let tracks = localVideoRef.current.srcObject.getTracks();
            tracks.forEach((track) => track.stop());
          } catch (e) {
            console.log(e);
          }

          let blackSilence = (...args) =>
            new MediaStream([black(...args), silence()]);
          window.localStream = blackSilence();
          localVideoRef.current.srcObject = window.localStream;

          getUserMedia();
        })
    );
  };
  let getDisplayMedia = () => {
    if (screen) {
      if (navigator.mediaDevices.getDisplayMedia) {
        navigator.mediaDevices
          .getDisplayMedia({ video: true, audio: true })
          .then(getDisplayMediaSuccess)
          .then((stream) => {})
          .catch((e) => console.log(e));
      }
    }
  };
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  let sendMessage = () => {
    socketRef.current.emit("chat-message", message, username);
    setMessage("");
  };

  useEffect(() => {
    if (screen !== undefined) {
      getDisplayMedia();
    }
  }, [screen]);

  let handleCallEnd = () => {
    try {
      let tracks = localVideoRef.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
      socketRef.current.disconnect();
      navigate("/home");
    } catch (e) {
      navigate("/home");
    }
  };
  let handleCHatModel = () => {
    setModel(!showModel);
    if (showModel === false) {
      setNewMessages(0);
    }
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
                    setAudio(!audio);
                  }}>
                  {audio == true ? <Mic /> : <MicOffOutlined />}
                </IconButton>
                <IconButton onClick={() => setVideo(!video)}>
                  {video == true ? <Videocam /> : <VideocamOff />}
                </IconButton>
                <IconButton onClick={handleCallEnd}>
                  <CallEnd />
                </IconButton>
                <IconButton
                  onClick={() => {
                    setScreen(!screen);
                    setVideo(!video);
                  }}>
                  {screen == true ? (
                    <ScreenShareOutlined />
                  ) : (
                    <StopScreenShareOutlined />
                  )}
                </IconButton>
                <IconButton onClick={handleCHatModel}>
                  <Badge badgeContent={newMessages} color="error">
                    {showModel == true ? <Chat /> : <SpeakerNotesOff />}
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
