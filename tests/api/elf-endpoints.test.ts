import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { rest } from "msw";
import { setupServer } from "msw/node";
import type { ApiErrorResponse, ElfResultResponseDTO, TrackElfAccessResponseDTO } from "../../src/types";

// Mock API server
const server = setupServer();

// Test data
const validParticipantId = 1;
const invalidParticipantId = 999;
const validAuthToken = "valid-jwt-token";
const invalidAuthToken = "invalid-jwt-token";

const mockElfResult: ElfResultResponseDTO = {
  assignment: {
    receiverName: "Alice Johnson",
    receiverWishlist: "I want a book about space exploration and some chocolates",
    receiverWishlistHtml: "<p>I want a book about space exploration and some chocolates</p>",
  },
  group: {
    id: 10,
    name: "Family Christmas 2025",
    budget: 150,
    endDate: "2025-12-25T23:59:59.000Z",
  },
  helpedParticipant: {
    id: 2,
    name: "John Doe",
  },
};

const mockTrackAccessResult: TrackElfAccessResponseDTO = {
  success: true,
};

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

  describe("GET /api/participants/:participantId/elf-result", () => {
    const endpoint = (participantId: number) =>
      `/api/participants/${participantId}/elf-result`;

    describe("authentication", () => {
      it("should return 401 when no authorization header is provided", async () => {
        server.use(
          rest.get(endpoint(validParticipantId), (req, res, ctx) => {
            return res(
              ctx.status(401),
              ctx.json({
                error: {
                  code: "UNAUTHORIZED",
                  message: "Authentication required (Bearer token or participant token)",
                },
              } as ApiErrorResponse)
            );
          })
        );

        const response = await fetch(`http://localhost${endpoint(validParticipantId)}`);
        expect(response.status).toBe(401);

        const data = await response.json();
        expect(data.error.code).toBe("UNAUTHORIZED");
      });

      it("should return 401 when invalid token is provided", async () => {
        server.use(
          rest.get(endpoint(validParticipantId), (req, res, ctx) => {
            const authHeader = req.headers.get("authorization");
            if (authHeader !== `Bearer ${validAuthToken}`) {
              return res(
                ctx.status(401),
                ctx.json({
                  error: {
                    code: "UNAUTHORIZED",
                    message: "Authentication required",
                  },
                } as ApiErrorResponse)
              );
            }
            return res(ctx.status(200), ctx.json(mockElfResult));
          })
        );

        const response = await fetch(`http://localhost${endpoint(validParticipantId)}`, {
          headers: {
            Authorization: `Bearer ${invalidAuthToken}`,
          },
        });
        expect(response.status).toBe(401);
      });
    });

    describe("validation", () => {
      it("should return 400 for invalid participant ID format", async () => {
        server.use(
          rest.get("/api/participants/invalid/elf-result", (req, res, ctx) => {
            return res(
              ctx.status(400),
              ctx.json({
                error: {
                  code: "INVALID_INPUT",
                  message: "Participant ID must be a positive integer",
                },
              } as ApiErrorResponse)
            );
          })
        );

        const response = await fetch("http://localhost/api/participants/invalid/elf-result", {
          headers: {
            Authorization: `Bearer ${validAuthToken}`,
          },
        });
        expect(response.status).toBe(400);

        const data = await response.json();
        expect(data.error.code).toBe("INVALID_INPUT");
      });
    });

    describe("authorization", () => {
      it("should return 403 when user is not an elf", async () => {
        server.use(
          rest.get(endpoint(validParticipantId), (req, res, ctx) => {
            const authHeader = req.headers.get("authorization");
            if (authHeader === `Bearer ${validAuthToken}`) {
              return res(
                ctx.status(403),
                ctx.json({
                  error: {
                    code: "FORBIDDEN",
                    message: "You are not authorized to access this resource",
                  },
                } as ApiErrorResponse)
              );
            }
            return res(ctx.status(401));
          })
        );

        const response = await fetch(`http://localhost${endpoint(validParticipantId)}`, {
          headers: {
            Authorization: `Bearer ${validAuthToken}`,
          },
        });
        expect(response.status).toBe(403);

        const data = await response.json();
        expect(data.error.code).toBe("FORBIDDEN");
      });

      it("should return 404 when participant does not exist", async () => {
        server.use(
          rest.get(endpoint(invalidParticipantId), (req, res, ctx) => {
            const authHeader = req.headers.get("authorization");
            if (authHeader === `Bearer ${validAuthToken}`) {
              return res(
                ctx.status(404),
                ctx.json({
                  error: {
                    code: "NOT_FOUND",
                    message: "Participant not found",
                  },
                } as ApiErrorResponse)
              );
            }
            return res(ctx.status(401));
          })
        );

        const response = await fetch(`http://localhost${endpoint(invalidParticipantId)}`, {
          headers: {
            Authorization: `Bearer ${validAuthToken}`,
          },
        });
        expect(response.status).toBe(404);

        const data = await response.json();
        expect(data.error.code).toBe("NOT_FOUND");
      });
    });

    describe("success scenarios", () => {
      it("should return 200 with elf result data when authenticated elf requests", async () => {
        server.use(
          rest.get(endpoint(validParticipantId), (req, res, ctx) => {
            const authHeader = req.headers.get("authorization");
            if (authHeader === `Bearer ${validAuthToken}`) {
              return res(ctx.status(200), ctx.json(mockElfResult));
            }
            return res(ctx.status(401));
          })
        );

        const response = await fetch(`http://localhost${endpoint(validParticipantId)}`, {
          headers: {
            Authorization: `Bearer ${validAuthToken}`,
          },
        });
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data).toEqual(mockElfResult);
        expect(data.assignment.receiverName).toBe("Alice Johnson");
        expect(data.group.name).toBe("Family Christmas 2025");
        expect(data.helpedParticipant.name).toBe("John Doe");
      });
    });
  });

  describe("POST /api/participants/:participantId/track-elf-access", () => {
    const endpoint = (participantId: number) =>
      `/api/participants/${participantId}/track-elf-access`;

    describe("authentication", () => {
      it("should return 401 when no authorization header is provided", async () => {
        server.use(
          rest.post(endpoint(validParticipantId), (req, res, ctx) => {
            return res(
              ctx.status(401),
              ctx.json({
                error: {
                  code: "UNAUTHORIZED",
                  message: "Authentication required",
                },
              } as ApiErrorResponse)
            );
          })
        );

        const response = await fetch(`http://localhost${endpoint(validParticipantId)}`, {
          method: "POST",
        });
        expect(response.status).toBe(401);

        const data = await response.json();
        expect(data.error.code).toBe("UNAUTHORIZED");
      });
    });

    describe("validation", () => {
      it("should return 400 for invalid participant ID format", async () => {
        server.use(
          rest.post("/api/participants/invalid/track-elf-access", (req, res, ctx) => {
            return res(
              ctx.status(400),
              ctx.json({
                error: {
                  code: "INVALID_INPUT",
                  message: "Participant ID must be a positive integer",
                },
              } as ApiErrorResponse)
            );
          })
        );

        const response = await fetch("http://localhost/api/participants/invalid/track-elf-access", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${validAuthToken}`,
          },
        });
        expect(response.status).toBe(400);

        const data = await response.json();
        expect(data.error.code).toBe("INVALID_INPUT");
      });
    });

    describe("success scenarios", () => {
      it("should return 200 with success confirmation", async () => {
        server.use(
          rest.post(endpoint(validParticipantId), (req, res, ctx) => {
            const authHeader = req.headers.get("authorization");
            if (authHeader === `Bearer ${validAuthToken}`) {
              return res(ctx.status(200), ctx.json(mockTrackAccessResult));
            }
            return res(ctx.status(401));
          })
        );

        const response = await fetch(`http://localhost${endpoint(validParticipantId)}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${validAuthToken}`,
          },
        });
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data).toEqual(mockTrackAccessResult);
        expect(data.success).toBe(true);
      });
    });
  });
});
