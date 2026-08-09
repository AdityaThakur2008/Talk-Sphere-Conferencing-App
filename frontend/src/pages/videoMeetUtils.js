export function buildMediaConstraints({
  videoEnabled,
  audioEnabled,
  videoAvailable,
  audioAvailable,
}) {
  return {
    video: Boolean(videoEnabled && videoAvailable),
    audio: Boolean(audioEnabled && audioAvailable),
  };
}

export function getMediaTracks(stream) {
  if (!stream) {
    return { audioTracks: [], videoTracks: [] };
  }

  return {
    audioTracks: typeof stream.getAudioTracks === "function" ? stream.getAudioTracks() : [],
    videoTracks: typeof stream.getVideoTracks === "function" ? stream.getVideoTracks() : [],
  };
}
