import { describe, expect, it } from "vitest";
import { loginFormSchema, paginationQuerySchema, percentageSchema } from "./common.js";

describe("shared-validation common schemas", () => {
  it("applies default pagination values", () => {
    const parsed = paginationQuerySchema.parse({});
    expect(parsed).toEqual({ page: 1, limit: 20 });
  });

  it("validates percentage bounds", () => {
    expect(percentageSchema.safeParse(10).success).toBe(true);
    expect(percentageSchema.safeParse(-1).success).toBe(false);
    expect(percentageSchema.safeParse(101).success).toBe(false);
  });

  it("validates admin login input", () => {
    expect(
      loginFormSchema.safeParse({ email: "admin@company.com", password: "secret123" }).success,
    ).toBe(true);
    expect(loginFormSchema.safeParse({ email: "invalid", password: "123" }).success).toBe(false);
  });
});
