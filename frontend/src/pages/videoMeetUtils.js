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
