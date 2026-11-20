import { describe, expect, it } from "vitest";
import { accountRole, isConfiguredOwner } from "@/features/auth/owner-role";

describe("configured owner role", () => {
  it("grants the owner role only to the configured, verified email", () => {
    expect(accountRole(" OWNER@example.test ", true, "owner@example.test")).toBe("admin");
    expect(isConfiguredOwner("owner@example.test", true, "owner@example.test")).toBe(true);
  });

  it("keeps unverified, different, and unconfigured accounts as learners", () => {
    expect(accountRole("owner@example.test", false, "owner@example.test")).toBe("user");
    expect(accountRole("other@example.test", true, "owner@example.test")).toBe("user");
    expect(accountRole("owner@example.test", true, undefined)).toBe("user");
  });
});
