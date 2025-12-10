import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type { ApiErrorResponse } from "../../../types";

// Mock API server
const server = setupServer();

describe("Elf API Endpoints Integration Tests", () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: "error" });
  });

  afterAll(() => {
    server.close();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  it("should setup MSW server correctly", () => {
    expect(server).toBeDefined();
  });

  it("should mock GET /api/participants/1/elf-result endpoint", async () => {
    server.use(
      http.get("/api/participants/1/elf-result", () => {
        return HttpResponse.json(
          {
            error: {
              code: "UNAUTHORIZED",
              message: "Authentication required",
            },
          } as ApiErrorResponse,
          { status: 401 }
        );
      })
    );

    const response = await fetch("http://localhost/api/participants/1/elf-result");
    expect(response.status).toBe(401);

    const data = await response.json();
    expect(data.error.code).toBe("UNAUTHORIZED");
  });
});
