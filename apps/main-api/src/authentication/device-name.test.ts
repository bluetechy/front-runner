import { describe, expect, it } from "@jest/globals";
import { deviceName, loginDescription } from "./device-name.js";

/*
 * What to call the thing somebody logged in from.
 *
 * Deliberately coarse. This feeds one sentence on the security page, and the
 * only question it has to answer is whether the person reading it recognizes
 * themselves; a browser version and a build number would not help them and
 * would make the log a better description of their hardware than it needs to
 * be.
 */

describe("reading a device off a User-Agent", () => {
  it.each([
    [
      "Mac OS",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36",
    ],
    [
      "Windows",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36",
    ],
    [
      "iPhone",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
    ],
    [
      "iPad",
      "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Safari/604.1",
    ],
    [
      "Android",
      "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Mobile Safari/537.36",
    ],
    [
      "ChromeOS",
      "Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 Chrome/140.0 Safari/537.36",
    ],
    [
      "Linux",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36",
    ],
  ])("calls it %s", (expected, userAgent) => {
    expect(deviceName(userAgent)).toBe(expected);
  });

  /* The order in the table is the whole of this: a phone's agent also names
   * the system it is built on, and both an iPhone and an Android say so. */
  it("names the phone rather than what the phone is built on", () => {
    expect(
      deviceName(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari/604.1",
      ),
    ).toBe("iPhone");
    expect(
      deviceName(
        "Mozilla/5.0 (Linux; Android 15; Pixel 9) Mobile Safari/537.36",
      ),
    ).toBe("Android");
  });

  /* Guessing is worse than saying nothing: a name somebody does not recognize
   * is what makes them report a login that was theirs. */
  it.each([
    ["nothing at all", undefined],
    ["an empty string", ""],
    ["something it has never seen", "curl/8.7.1"],
  ])("answers nothing for %s", (_case, userAgent) => {
    expect(deviceName(userAgent)).toBeNull();
  });
});

describe("the sentence that goes in the log", () => {
  it("names the device when there is one", () => {
    expect(loginDescription("Mac OS")).toBe("New login on Mac OS.");
  });

  /* "New login on null" is the failure this exists to avoid. */
  it("says only that there was a login when there is not", () => {
    expect(loginDescription(null)).toBe("New login.");
  });
});
