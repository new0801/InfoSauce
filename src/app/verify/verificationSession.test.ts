import { describe, expect, it } from "vitest";
import { createClearedVerificationSession } from "./verificationSession";

describe("createClearedVerificationSession", () => {
  it("removes every value from a completed verification", () => {
    const cleared = createClearedVerificationSession();

    expect(cleared).toEqual({
      text: "",
      link: "",
      image: null,
      result: null,
      error: "",
      loading: false,
    });
  });
});
