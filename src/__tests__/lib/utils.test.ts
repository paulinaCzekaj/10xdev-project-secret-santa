import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn utility function", () => {
  it("merges class names correctly", () => {
    const result = cn("px-4", "py-2", "bg-blue-500");
    expect(result).toBe("px-4 py-2 bg-blue-500");
  });

  it("handles conditional classes", () => {
    const isActive = true;
    const result = cn("base-class", isActive && "active-class");
    expect(result).toBe("base-class active-class");
  });

  it("filters out falsy values", () => {
    const result = cn("px-4", false, null, undefined, "py-2");
    expect(result).toBe("px-4 py-2");
  });

  it("handles empty input", () => {
    const result = cn();
    expect(result).toBe("");
  });

  it("handles array of classes", () => {
    const result = cn(["px-4", "py-2"]);
    expect(result).toBe("px-4 py-2");
  });

  it("merges conflicting Tailwind classes correctly", () => {
    // cn uses tailwind-merge, so later classes should override earlier ones
    const result = cn("px-4 px-2");
    expect(result).toBe("px-2");
  });
});
