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
import { buildMediaConstraints, getMediaTracks } from "./videoMeetUtils";
import Server_Dev from "../enviroment";

const peerConfigConnections = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export default function VideoMeetComponent() {
  const navigate = useNavigate();
  const socketRef = useRef();
  const connectionsRef = useRef({});
  const peerSendersRef = useRef({});
  const socketIdRef = useRef();
  const localVideoRef = useRef();
  const localStreamRef = useRef(null);
  const userMediaStreamRef = useRef(null);
  const displayStreamRef = useRef(null);
  const acquiringUserMediaRef = useRef(false);
  const remoteStreamsRef = useRef({});
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
    let nextVideoAvailable = false;
    let nextAudioAvailable = false;

    try {
      const videoPermission = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      videoPermission.getTracks().forEach((track) => track.stop());
      nextVideoAvailable = true;
    } catch (error) {
      console.error("Camera permission check failed:", error);
    }

    try {
      const audioPermission = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      audioPermission.getTracks().forEach((track) => track.stop());
      nextAudioAvailable = true;
    } catch (error) {
      console.error("Microphone permission check failed:", error);
    }

    setVideoAvailable(nextVideoAvailable);
    setAudioAvailable(nextAudioAvailable);
    setVideo(nextVideoAvailable);
    setAudio(nextAudioAvailable);
  }, []);

  useEffect(() => {
    getPermissions();
  }, [getPermissions]);

  const createAndSendOffer = useCallback(async (peerId, connection) => {
    if (!connection || connection.signalingState !== "stable") return;

    try {
      const description = await connection.createOffer();
      await connection.setLocalDescription(description);
      socketRef.current?.emit(
        "signal",
        peerId,
        JSON.stringify({ sdp: connection.localDescription }),
      );
    } catch (error) {
      console.error(`Failed to create an offer for ${peerId}:`, error);
    }
  }, []);

  const syncLocalStreamToPeer = useCallback(async (peerId, connection, stream) => {
    if (!peerId || !connection || !stream) return;

    const { audioTracks, videoTracks } = getMediaTracks(stream);
    const senderMap = peerSendersRef.current[peerId] || {};

    const syncSender = async (kind, track) => {
      if (senderMap[kind]) {
        await senderMap[kind].replaceTrack(track || null);
      } else if (track) {
        senderMap[kind] = connection.addTrack(track, stream);
      }
    };

    try {
      await Promise.all([
        syncSender("audio", audioTracks[0]),
        syncSender("video", videoTracks[0]),
      ]);
    } catch (error) {
      console.error(`Failed to synchronize local media with ${peerId}:`, error);
    }

    peerSendersRef.current[peerId] = senderMap;
  }, []);

  const setActiveLocalStream = useCallback(
    async (stream) => {
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      await Promise.all(
        Object.entries(connectionsRef.current).map(([id, connection]) =>
          id === socketIdRef.current
            ? Promise.resolve()
            : syncLocalStreamToPeer(id, connection, stream),
        ),
      );
    },
    [syncLocalStreamToPeer],
  );

  const buildScreenShareStream = useCallback((displayStream, userMediaStream) => {
    const nextStream = new MediaStream();
    const displayVideoTrack = displayStream?.getVideoTracks()[0];
    const microphoneTrack = userMediaStream?.getAudioTracks()[0];

    if (displayVideoTrack) nextStream.addTrack(displayVideoTrack);
    if (microphoneTrack) nextStream.addTrack(microphoneTrack);

    return nextStream;
  }, []);

  const attachRemoteMedia = useCallback((element, stream, peerId) => {
    if (!element || !stream || element.srcObject === stream) return;

    element.srcObject = stream;
    element.play().catch((error) => {
      console.warn(`Remote playback was blocked for ${peerId}:`, error);
    });
  }, []);

  const getUserMediaSuccess = useCallback(
    async (stream) => {
      const previousUserMediaStream = userMediaStreamRef.current;
      userMediaStreamRef.current = stream;

      const nextActiveStream = displayStreamRef.current
        ? buildScreenShareStream(displayStreamRef.current, stream)
        : stream;

      await setActiveLocalStream(nextActiveStream);

      await Promise.all(
        Object.entries(connectionsRef.current).map(([id, connection]) =>
          id === socketIdRef.current
            ? Promise.resolve()
            : createAndSendOffer(id, connection),
        ),
      );

      if (previousUserMediaStream && previousUserMediaStream !== stream) {
        previousUserMediaStream.getTracks().forEach((track) => track.stop());
      }
    },
    [buildScreenShareStream, createAndSendOffer, setActiveLocalStream],
  );

  const getUserMedia = useCallback(async () => {
    if (acquiringUserMediaRef.current) return;

    const constraints = buildMediaConstraints({
      videoEnabled: true,
      audioEnabled: true,
      videoAvailable,
      audioAvailable,
    });

    if (!constraints.video && !constraints.audio) return;

    acquiringUserMediaRef.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      await getUserMediaSuccess(stream);
    } catch (error) {
      console.error("Failed to acquire camera or microphone:", error);
    } finally {
      acquiringUserMediaRef.current = false;
    }
  }, [audioAvailable, getUserMediaSuccess, videoAvailable]);

  useEffect(() => {
    if (!userMediaStreamRef.current) {
      getUserMedia();
    }
  }, [getUserMedia]);

  const gotMessageFromServer = useCallback((fromID, message) => {
    let signal;
    try {
      signal = JSON.parse(message);
    } catch (error) {
      console.error("Received invalid signaling payload:", error);
      return;
    }

    const connection = connectionsRef.current[fromID];
    if (fromID === socketIdRef.current || !connection) return;

    if (signal.sdp) {
      connection
        .setRemoteDescription(new RTCSessionDescription(signal.sdp))
        .then(async () => {
          if (signal.sdp.type !== "offer") return;

          const description = await connection.createAnswer();
          await connection.setLocalDescription(description);
          socketRef.current?.emit(
            "signal",
            fromID,
            JSON.stringify({ sdp: connection.localDescription }),
          );
        })
        .catch((error) =>
          console.error(`Failed to process SDP from ${fromID}:`, error),
        );
    }

    if (signal.ice) {
      connection
        .addIceCandidate(new RTCIceCandidate(signal.ice))
        .catch((error) => console.error(`Failed to add ICE from ${fromID}:`, error));
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
      socketRef.current = null;
    }

    socketRef.current = io(Server_Dev, {
      auth: {
        token: localStorage.getItem("token"),
      },
    });
    socketRef.current.on("signal", gotMessageFromServer);

    socketRef.current.on("connect", () => {
      socketRef.current.emit("join_call", window.location.href);
      socketIdRef.current = socketRef.current.id;
      socketRef.current.on("chat-message", addMessage);

      socketRef.current.on("user-left", (id) => {
        const connection = connectionsRef.current[id];
        if (connection) {
          try {
            connection.close();
          } catch (error) {
            console.error(`Failed to close peer connection ${id}:`, error);
          }
          delete connectionsRef.current[id];
          delete peerSendersRef.current[id];
          delete remoteStreamsRef.current[id];
        }

        setVideos((prevVideos) =>
          prevVideos.filter((video) => video.socketId !== id),
        );
      });

      socketRef.current.on("user-joined", (id, clients) => {
        clients.forEach((socketListId) => {
          if (connectionsRef.current[socketListId]) {
            return;
          }

          const connection = new RTCPeerConnection(peerConfigConnections);
          connectionsRef.current[socketListId] = connection;

          connection.onicecandidate = (event) => {
            if (event.candidate !== null) {
              socketRef.current?.emit(
                "signal",
                socketListId,
                JSON.stringify({ ice: event.candidate }),
              );
            }
          };

          connection.ontrack = (event) => {
            let remoteStream = event.streams?.[0];
            if (!remoteStream) {
              remoteStream =
                remoteStreamsRef.current[socketListId] || new MediaStream();
              if (
                !remoteStream
                  .getTracks()
                  .some((track) => track.id === event.track.id)
              ) {
                remoteStream.addTrack(event.track);
              }
            }

            remoteStreamsRef.current[socketListId] = remoteStream;
            console.info("Remote WebRTC track received:", {
              peerId: socketListId,
              kind: event.track.kind,
              readyState: event.track.readyState,
              enabled: event.track.enabled,
              muted: event.track.muted,
              audioTracks: remoteStream.getAudioTracks().length,
              videoTracks: remoteStream.getVideoTracks().length,
            });
            setVideos((prevVideos) => {
              const existingVideo = prevVideos.find(
                (video) => video.socketId === socketListId,
              );
              if (existingVideo) {
                return prevVideos.map((video) =>
                  video.socketId === socketListId
                    ? { ...video, stream: remoteStream }
                    : video,
                );
              }

              return [
                ...prevVideos,
                { socketId: socketListId, stream: remoteStream },
              ];
            });
          };

          connection.onconnectionstatechange = () => {
            console.log(
              `Connection ${socketListId} state:`,
              connection.connectionState,
            );
          };

          connection.oniceconnectionstatechange = () => {
            console.log(
              `ICE state for ${socketListId}:`,
              connection.iceConnectionState,
            );
          };

          if (localStreamRef.current) {
            syncLocalStreamToPeer(
              socketListId,
              connection,
              localStreamRef.current,
            );
          }
        });

        if (id === socketIdRef.current) {
          Object.entries(connectionsRef.current).forEach(([peerId, connection]) => {
            if (peerId !== socketIdRef.current) {
              createAndSendOffer(peerId, connection);
            }
          });
        }
      });
    });
  }, [addMessage, createAndSendOffer, gotMessageFromServer, syncLocalStreamToPeer]);

  const getMedia = useCallback(() => {
    connectToSocketServer();
  }, [connectToSocketServer]);

  const connect = () => {
    setAskForUserName(false);
    getMedia();
  };

  const stopScreenSharing = useCallback(async () => {
    const displayStream = displayStreamRef.current;
    displayStreamRef.current = null;
    displayStream?.getTracks().forEach((track) => track.stop());

    if (userMediaStreamRef.current) {
      await setActiveLocalStream(userMediaStreamRef.current);
    }
    setScreen(false);
  }, [setActiveLocalStream]);

  const getDisplayMediaSuccess = useCallback(
    async (stream) => {
      displayStreamRef.current = stream;
      const nextStream = buildScreenShareStream(stream, userMediaStreamRef.current);
      await setActiveLocalStream(nextStream);

      const displayVideoTrack = stream.getVideoTracks()[0];
      if (displayVideoTrack) {
        displayVideoTrack.onended = () => {
          stopScreenSharing();
        };
      }
    },
    [buildScreenShareStream, setActiveLocalStream, stopScreenSharing],
  );

  const getDisplayMedia = useCallback(() => {
    if (!screen || displayStreamRef.current) return;

    if (navigator.mediaDevices.getDisplayMedia) {
      navigator.mediaDevices
        .getDisplayMedia({ video: true, audio: true })
        .then(getDisplayMediaSuccess)
        .catch((error) => {
          console.error("Failed to start screen sharing:", error);
          setScreen(false);
        });
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

  const cleanupCall = useCallback(() => {
    Object.entries(connectionsRef.current).forEach(([id, connection]) => {
      try {
        connection.onicecandidate = null;
        connection.ontrack = null;
        connection.onconnectionstatechange = null;
        connection.oniceconnectionstatechange = null;
        connection.close();
      } catch (error) {
        console.error(`Failed to close peer connection ${id}:`, error);
      }
    });

    connectionsRef.current = {};
    peerSendersRef.current = {};
    remoteStreamsRef.current = {};

    try {
      displayStreamRef.current?.getTracks().forEach((track) => track.stop());
      userMediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    } catch (error) {
      console.error("Failed to stop local media tracks:", error);
    }

    localStreamRef.current = null;
    userMediaStreamRef.current = null;
    displayStreamRef.current = null;

    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  useEffect(() => cleanupCall, [cleanupCall]);

  const handleCallEnd = () => {
    cleanupCall();
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
                      ref={(ref) =>
                        attachRemoteMedia(ref, video.stream, video.socketId)
                      }
                      autoPlay
                      playsInline
                      muted
                    />
                    <audio
                      ref={(ref) =>
                        attachRemoteMedia(ref, video.stream, video.socketId)
                      }
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
                    const nextAudio = !audio;
                    setAudio(nextAudio);
                    localStreamRef.current
                      ?.getAudioTracks()
                      .forEach((track) => {
                        track.enabled = nextAudio;
                      });
                  }}>
                  {audio === true ? <Mic /> : <MicOffOutlined />}
                </IconButton>
                <IconButton
                  onClick={() => {
                    const nextVideo = !video;
                    setVideo(nextVideo);
                    localStreamRef.current
                      ?.getVideoTracks()
                      .forEach((track) => {
                        track.enabled = nextVideo;
                      });
                  }}>
                  {video === true ? <Videocam /> : <VideocamOff />}
                </IconButton>
                <IconButton onClick={handleCallEnd}>
                  <CallEnd />
                </IconButton>
                <IconButton
                  onClick={() => {
                    if (screen) {
                      stopScreenSharing();
                    } else {
                      setScreen(true);
                    }
                  }}>
                  {screen === true ? (
                    <StopScreenShareOutlined />
                  ) : (
                    <ScreenShareOutlined />
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
