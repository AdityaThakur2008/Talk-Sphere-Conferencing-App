import { buildMediaConstraints } from "./videoMeetUtils";

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
});
