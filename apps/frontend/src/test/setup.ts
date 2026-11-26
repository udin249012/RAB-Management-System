import "@testing-library/jest-dom";
import { vi } from "vitest";

Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
  value: vi.fn(() => null),
});
