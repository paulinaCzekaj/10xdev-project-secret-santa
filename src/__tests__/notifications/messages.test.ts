import { describe, it, expect } from "vitest";
import { NOTIFICATION_MESSAGES, isValidMessageKey, getMessage } from "@/lib/notifications";

describe("Notification Messages", () => {
  describe("NOTIFICATION_MESSAGES", () => {
    it("should contain AUTH messages", () => {
      expect(NOTIFICATION_MESSAGES["AUTH.LOGIN_SUCCESS"]).toBeDefined();
      expect(NOTIFICATION_MESSAGES["AUTH.LOGIN_ERROR"]).toBeDefined();
    });

    it("should contain GROUP messages", () => {
      expect(NOTIFICATION_MESSAGES["GROUP.CREATE_SUCCESS"]).toBeDefined();
      expect(NOTIFICATION_MESSAGES["GROUP.DELETE_ERROR"]).toBeDefined();
    });

    it("should have consistent structure", () => {
      Object.values(NOTIFICATION_MESSAGES).forEach((message) => {
        expect(message).toHaveProperty("title");
        expect(message).toHaveProperty("type");
        expect(typeof message.title).toBe("string");
        expect(["success", "error", "info", "warning"]).toContain(message.type);
      });
    });
  });

  describe("isValidMessageKey()", () => {
    it("should return true for valid keys", () => {
      expect(isValidMessageKey("AUTH.LOGIN_SUCCESS")).toBe(true);
      expect(isValidMessageKey("GROUP.CREATE_SUCCESS")).toBe(true);
    });

    it("should return false for invalid keys", () => {
      expect(isValidMessageKey("INVALID.KEY")).toBe(false);
      expect(isValidMessageKey("AUTH.NONEXISTENT")).toBe(false);
    });
  });

  describe("getMessage()", () => {
    it("should return message for valid key", () => {
      const message = getMessage("AUTH.LOGIN_SUCCESS");

      expect(message).toEqual({
        title: "Zalogowano pomyślnie!",
        description: undefined,
        type: "success",
      });
    });

    it("should return correct message with description", () => {
      const message = getMessage("AUTH.LOGIN_ERROR");

      expect(message.description).toBe("Nieprawidłowy email lub hasło");
    });
  });
});
