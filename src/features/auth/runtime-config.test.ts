import { describe, expect, it } from "vitest";
import { authRuntimeConfigurationError } from "@/features/auth/runtime-config";

const validProduction = {
  nodeEnv: "production",
  secret: "x".repeat(48),
  authUrl: "https://learn.example.test",
  publicUrl: "https://learn.example.test/",
};

describe("authentication runtime configuration", () => {
  it("accepts a strong secret and one canonical public HTTPS origin", () => {
    expect(authRuntimeConfigurationError(validProduction)).toBeUndefined();
  });

  it.each([
    { ...validProduction, secret: "too-short" },
    { ...validProduction, authUrl: "http://learn.example.test" },
    { ...validProduction, authUrl: "https://127.0.0.1:3000", publicUrl: "https://127.0.0.1:3000" },
    { ...validProduction, authUrl: "https://learn.example.test/auth" },
    { ...validProduction, authUrl: "https://other.example.test" },
    { ...validProduction, publicUrl: undefined },
  ])("rejects unsafe or inconsistent production origins", (environment) => {
    expect(authRuntimeConfigurationError(environment)).toBeDefined();
  });

  it("allows an HTTP loopback origin for local development", () => {
    expect(authRuntimeConfigurationError({
      nodeEnv: "development",
      secret: "x".repeat(48),
      authUrl: "http://127.0.0.1:3000",
    })).toBeUndefined();
  });
});
