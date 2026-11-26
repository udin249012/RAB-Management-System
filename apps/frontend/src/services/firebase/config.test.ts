import { describe, expect, it } from "vitest";
import { isFirebaseClientConfigured } from "./config";

describe("Firebase client config", () => {
  it("returns boolean configuration status without throwing", () => {
    expect(typeof isFirebaseClientConfigured()).toBe("boolean");
  });
});
