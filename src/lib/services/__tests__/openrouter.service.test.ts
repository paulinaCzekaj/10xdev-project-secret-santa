import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OpenRouterService } from "../openrouter.service";
import { OpenRouterError } from "../openrouter.error";

// Mock fetch globally
const fetchMock = vi.fn();
global.fetch = fetchMock;

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(),
  rpc: vi.fn(),
};

describe("OpenRouterService", () => {
  let service: OpenRouterService;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default Supabase mock chain
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn(),
        }),
      }),
    });

    mockSupabase.rpc.mockReturnValue({
      error: null,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = new OpenRouterService(mockSupabase as any, {
      apiKey: "test-key",
      timeout: 5000,
      maxRetries: 1,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with custom config", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const customService = new OpenRouterService(mockSupabase as any, {
        apiKey: "custom-key",
        model: "custom-model",
        maxTokens: 500,
        temperature: 0.5,
      });

      expect(customService).toBeDefined();
    });

    it("should throw error if API key is missing", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => new OpenRouterService(mockSupabase as any, { apiKey: "" })).toThrow();
    });

    it("should use default values for optional config", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const defaultService = new OpenRouterService(mockSupabase as any, { apiKey: "test-key" });
      expect(defaultService).toBeDefined();
    });
  });

  describe("generateSantaLetter", () => {
    it("should generate letter successfully", async () => {
      const mockApiResponse = {
        model: "claude-3.5-sonnet",
        choices: [
          {
            message: {
              content: JSON.stringify({
                letter_content: "Test letter content",
                suggested_gifts: ["gift1", "gift2", "gift3"],
              }),
            },
          },
        ],
        usage: { total_tokens: 150 },
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      const result = await service.generateSantaLetter("I love fantasy books and coffee");

      expect(result.letterContent).toBe("Test letter content");
      expect(result.suggestedGifts).toEqual(["gift1", "gift2", "gift3"]);
      expect(result.metadata.model).toBe("claude-3.5-sonnet");
      expect(result.metadata.tokensUsed).toBe(150);
      expect(result.metadata.generationTime).toBeGreaterThan(0);
    });

    it("should use custom options", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const customService = new OpenRouterService(mockSupabase as any, {
        apiKey: "test-key",
        temperature: 0.8,
        maxTokens: 500,
      });

      const mockApiResponse = {
        model: "claude-3.5-sonnet",
        choices: [
          {
            message: {
              content: JSON.stringify({
                letter_content: "English letter",
                suggested_gifts: ["book", "coffee"],
              }),
            },
          },
        ],
        usage: { total_tokens: 100 },
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      const result = await customService.generateSantaLetter("I love books", {
        language: "en",
      });

      expect(result.letterContent).toBe("English letter");
      expect(fetchMock).toHaveBeenCalledWith(
        "https://openrouter.ai/api/v1/chat/completions",
        expect.objectContaining({
          body: expect.stringContaining('"temperature":0.8'),
        })
      );
    });

    it("should throw error for short preferences", async () => {
      await expect(service.generateSantaLetter("short")).rejects.toThrow(OpenRouterError);
    });

    it("should sanitize long preferences", async () => {
      const longText = "a".repeat(2000);

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          model: "test",
          choices: [
            {
              message: {
                content: JSON.stringify({
                  letter_content: "Test",
                  suggested_gifts: [],
                }),
              },
            },
          ],
        }),
      });

      await service.generateSantaLetter(longText);

      const fetchCall = fetchMock.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      const userMessage = requestBody.messages.find((m: { role: string; content: string }) => m.role === "user");

      expect(userMessage?.content.length).toBeLessThanOrEqual(2000);
    });

    it("should handle API errors", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: "Unauthorized" } }),
      });

      await expect(service.generateSantaLetter("test preferences")).rejects.toThrow(OpenRouterError);
    });

    it("should retry on server errors", async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ error: { message: "Server error" } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            model: "test",
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    letter_content: "Retry success",
                    suggested_gifts: [],
                  }),
                },
              },
            ],
          }),
        });

      const result = await service.generateSantaLetter("test preferences");

      expect(result.letterContent).toBe("Retry success");
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("should not retry on client errors", async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: "Bad request" } }),
      });

      await expect(service.generateSantaLetter("test preferences")).rejects.toThrow(OpenRouterError);

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("should handle network errors", async () => {
      fetchMock.mockRejectedValueOnce(new Error("Network error"));

      await expect(service.generateSantaLetter("test preferences")).rejects.toThrow();
    });
  });

  describe("validateRateLimit", () => {
    it("should return true for new participant", async () => {
      mockSupabase.from.mockClear();
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: "PGRST116" }, // No rows returned
            }),
          }),
        }),
      });

      const result = await service.validateRateLimit("123", true);

      expect(result.canGenerate).toBe(true);
      expect(result.generationsUsed).toBe(0);
      expect(result.generationsRemaining).toBe(5);
      expect(result.maxGenerations).toBe(5);
    });

    it("should check existing participant with remaining generations", async () => {
      mockSupabase.from.mockClear();
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                ai_generation_count_per_group: 2,
                ai_last_generated_at: new Date(),
              },
              error: null,
            }),
          }),
        }),
      });

      const result = await service.validateRateLimit("123", true);

      expect(result.canGenerate).toBe(true);
      expect(result.generationsUsed).toBe(2);
      expect(result.generationsRemaining).toBe(3);
      expect(result.maxGenerations).toBe(5);
    });

    it("should return false when limit exceeded", async () => {
      mockSupabase.from.mockClear();
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                ai_generation_count_per_group: 5,
                ai_last_generated_at: new Date(),
              },
              error: null,
            }),
          }),
        }),
      });

      const result = await service.validateRateLimit("123", true);

      expect(result.canGenerate).toBe(false);
      expect(result.generationsUsed).toBe(5);
      expect(result.generationsRemaining).toBe(0);
    });

    it("should handle unregistered users limit", async () => {
      mockSupabase.from.mockClear();
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                ai_generation_count_per_group: 2,
                ai_last_generated_at: new Date(),
              },
              error: null,
            }),
          }),
        }),
      });

      const result = await service.validateRateLimit("123", false);

      expect(result.canGenerate).toBe(true);
      expect(result.generationsUsed).toBe(2);
      expect(result.generationsRemaining).toBe(1);
      expect(result.maxGenerations).toBe(3);
    });

    it("should handle database errors", async () => {
      mockSupabase.from.mockClear();
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: "DB_ERROR" },
            }),
          }),
        }),
      });

      await expect(service.validateRateLimit("123", true)).rejects.toThrow(OpenRouterError);
    });
  });

  describe("incrementGenerationCount", () => {
    it("should call database function successfully", async () => {
      mockSupabase.rpc.mockResolvedValue({
        error: null,
      });

      await expect(service.incrementGenerationCount("123")).resolves.not.toThrow();

      expect(mockSupabase.rpc).toHaveBeenCalledWith("increment_ai_generation_count", {
        p_participant_id: 123,
      });
    });

    it("should handle database errors", async () => {
      mockSupabase.rpc.mockResolvedValue({
        error: { message: "DB error" },
      });

      await expect(service.incrementGenerationCount("123")).rejects.toThrow(OpenRouterError);
    });
  });

  describe("testConnection", () => {
    it("should return true on successful connection", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          model: "test",
          choices: [
            {
              message: {
                content: JSON.stringify({
                  letter_content: "test",
                  suggested_gifts: [],
                }),
              },
            },
          ],
        }),
      });

      const result = await service.testConnection();

      expect(result).toBe(true);
    });

    it("should return false on connection failure", async () => {
      fetchMock.mockRejectedValueOnce(new Error("Network error"));

      const result = await service.testConnection();

      expect(result).toBe(false);
    });
  });

  describe("error handling", () => {
    it("should handle malformed JSON response", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          model: "test",
          choices: [
            {
              message: {
                content: "invalid json",
              },
            },
          ],
        }),
      });

      await expect(service.generateSantaLetter("test preferences")).rejects.toThrow(OpenRouterError);
    });

    it("should handle missing content in response", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          model: "test",
          choices: [
            {
              message: {},
            },
          ],
        }),
      });

      await expect(service.generateSantaLetter("test preferences")).rejects.toThrow(OpenRouterError);
    });

    it("should handle invalid response schema", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          model: "test",
          choices: [
            {
              message: {
                content: JSON.stringify({
                  invalid_field: "value",
                }),
              },
            },
          ],
        }),
      });

      await expect(service.generateSantaLetter("test preferences")).rejects.toThrow(OpenRouterError);
    });

    it("should sanitize script tags from input", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          model: "test",
          choices: [
            {
              message: {
                content: JSON.stringify({
                  letter_content: "Test",
                  suggested_gifts: [],
                }),
              },
            },
          ],
        }),
      });

      await service.generateSantaLetter('test <script>alert("xss")</script> preferences');

      const fetchCall = fetchMock.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      const userMessage = requestBody.messages.find((m: { role: string; content: string }) => m.role === "user");

      // striptags removes HTML tags but keeps the text content
      expect(userMessage?.content).not.toContain("<script>");
      expect(userMessage?.content).not.toContain("</script>");
      expect(userMessage?.content).toContain('alert("xss")'); // Text content is preserved
    });

    it("should sanitize various XSS attack vectors", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          model: "test",
          choices: [
            {
              message: {
                content: JSON.stringify({
                  letter_content: "Test",
                  suggested_gifts: [],
                }),
              },
            },
          ],
        }),
      });

      // Test various XSS bypass techniques
      const xssPayloads = [
        '<script src="http://evil.com/xss.js"></script>', // External script without closing tag
        '<iframe src="javascript:alert(1)"></iframe>', // Iframe with JS URL
        "<img src=x onerror=alert(1)>", // Event handler
        '<a href="javascript:alert(1)">click me</a>', // JS in href
        '<div onmouseover="alert(1)">hover me</div>', // Event handler
        "&lt;script&gt;alert(1)&lt;/script&gt;", // HTML entities
        "<SCRIPT>alert(1)</SCRIPT>", // Case variation
        "<script\n>alert(1)</script>", // Script split across lines
      ];

      for (const payload of xssPayloads) {
        fetchMock.mockClear();
        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            model: "test",
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    letter_content: "Test",
                    suggested_gifts: [],
                  }),
                },
              },
            ],
          }),
        });

        await service.generateSantaLetter(`test ${payload} preferences`);

        const fetchCall = fetchMock.mock.calls[0];
        const requestBody = JSON.parse(fetchCall[1].body);
        const userMessage = requestBody.messages.find((m: { role: string; content: string }) => m.role === "user");

        // All HTML should be stripped, leaving only plain text
        expect(userMessage?.content).not.toContain("<");
        expect(userMessage?.content).not.toContain(">");
        expect(userMessage?.content).toContain("test");
        expect(userMessage?.content).toContain("preferences");
      }
    });

    it("should limit response letter length", async () => {
      const longLetter = "a".repeat(2000);

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          model: "test",
          choices: [
            {
              message: {
                content: JSON.stringify({
                  letter_content: longLetter,
                  suggested_gifts: [],
                }),
              },
            },
          ],
        }),
      });

      const result = await service.generateSantaLetter("test preferences");

      expect(result.letterContent.length).toBe(2000);
    });

    it("should not limit suggested gifts", async () => {
      const manyGifts = Array.from({ length: 10 }, (_, i) => `gift${i}`);

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          model: "test",
          choices: [
            {
              message: {
                content: JSON.stringify({
                  letter_content: "Test letter",
                  suggested_gifts: manyGifts,
                }),
              },
            },
          ],
        }),
      });

      const result = await service.generateSantaLetter("test preferences");

      expect(result.suggestedGifts.length).toBe(10);
    });
  });
});
