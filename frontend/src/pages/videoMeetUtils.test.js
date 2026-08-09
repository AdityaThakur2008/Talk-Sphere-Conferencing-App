import { buildMediaConstraints, getMediaTracks } from "./videoMeetUtils";

describe("buildMediaConstraints", () => {
  it("disables media tracks that are not available", () => {
    expect(
      buildMediaConstraints({
        videoEnabled: true,
        audioEnabled: true,
        videoAvailable: false,
        audioAvailable: true,
      }),
    ).toEqual({ video: false, audio: true });
  });

  it("returns disabled constraints when both toggles are off", () => {
    expect(
      buildMediaConstraints({
        videoEnabled: false,
        audioEnabled: false,
        videoAvailable: true,
        audioAvailable: true,
      }),
    ).toEqual({ video: false, audio: false });
  });

  it("returns audio-only constraints when video is unavailable", () => {
    expect(
      buildMediaConstraints({
        videoEnabled: true,
        audioEnabled: true,
        videoAvailable: false,
        audioAvailable: true,
      }),
    ).toEqual({ video: false, audio: true });
  });
});

describe("getMediaTracks", () => {
  it("returns audio and video tracks from a media stream", () => {
    const audioTrack = { kind: "audio" };
    const videoTrack = { kind: "video" };
    const stream = {
      getAudioTracks: () => [audioTrack],
      getVideoTracks: () => [videoTrack],
    };

    expect(getMediaTracks(stream)).toEqual({
      audioTracks: [audioTrack],
      videoTracks: [videoTrack],
    });
  });
});
