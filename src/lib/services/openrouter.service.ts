import { z } from "zod";
import type { SupabaseClient } from "@/db/supabase.client";
import { OpenRouterError } from "./openrouter.error";
import {
  AI_MAX_GENERATIONS_REGISTERED,
  AI_MAX_GENERATIONS_UNREGISTERED,
  AI_PROMPT_MIN_LENGTH,
  AI_PROMPT_MAX_LENGTH,
  AI_LETTER_MAX_LENGTH,
  AI_MAX_SUGGESTED_GIFTS,
  AI_PROMPT_COST_PER_1K,
  AI_COMPLETION_COST_PER_1K,
} from "@/lib/constants/ai.constants";
import type {
  OpenRouterConfig,
  Message,
  ResponseFormat,
  OpenRouterAPIResponse,
  SantaLetterResponse,
  GenerationOptions,
  RateLimitStatus,
  ErrorCode,
} from "./openrouter.types";

const ConfigSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
  model: z.string().default("openai/gpt-4o-mini"),
  maxTokens: z.number().int().min(1).max(4096).default(1000),
  temperature: z.number().min(0).max(2).default(0.7),
  topP: z.number().min(0).max(1).default(1.0),
  timeout: z.number().int().min(1000).max(60000).default(15000),
  maxRetries: z.number().int().min(0).max(5).default(2),
  baseDelay: z.number().int().min(500).max(5000).default(1000),
});

export class OpenRouterService {
  private readonly config: Required<OpenRouterConfig>;
  private readonly apiEndpoint = "https://openrouter.ai/api/v1/chat/completions";

  constructor(
    private supabase: SupabaseClient,
    config?: OpenRouterConfig
  ) {
    const mergedConfig = {
      apiKey: config?.apiKey || import.meta.env.OPENROUTER_API_KEY,
      model: config?.model || import.meta.env.AI_MODEL || "openai/gpt-4o-mini",
      maxTokens: config?.maxTokens || parseInt(import.meta.env.AI_MAX_TOKENS || "1000"),
      temperature: config?.temperature || parseFloat(import.meta.env.AI_TEMPERATURE || "0.7"),
      topP: config?.topP || 1.0,
      timeout: config?.timeout || 15000,
      maxRetries: config?.maxRetries || 2,
      baseDelay: config?.baseDelay || 1000,
    };

    this.config = ConfigSchema.parse(mergedConfig);
  }

  // === PUBLIC METHODS ===

  /**
   * FIX #23: Generates a personalized Santa letter using AI (OpenRouter/GPT-4o-mini)
   *
   * Creates a warm, narrative letter to Santa based on user's gift preferences.
   * The letter includes Christmas emoji, personalized tone, and gift suggestions
   * woven into a festive narrative (not a dry list).
   *
   * Rate limiting must be checked before calling this method.
   * Counter should be incremented BEFORE calling this to prevent race conditions.
   *
   * @param userPreferences - User's gift preferences and interests (10-2000 characters)
   * @param options - Optional generation options (language, etc.)
   * @returns Promise resolving to Santa letter with content, suggested gifts, and metadata
   * @throws {OpenRouterError} INVALID_INPUT - User preferences too short/long
   * @throws {OpenRouterError} GATEWAY_TIMEOUT - Generation took longer than 15 seconds
   * @throws {OpenRouterError} SERVER_ERROR - OpenRouter API error
   * @throws {OpenRouterError} INVALID_RESPONSE - Malformed AI response
   *
   * @example
   * const letter = await service.generateSantaLetter(
   *   "Lubię książki fantasy, dobrą kawę i ciepłe szaliki",
   *   { language: "pl" }
   * );
   * console.log(letter.letterContent); // "Cześć Mikołaju! 🎅\n..."
   * console.log(`Tokens used: ${letter.metadata.tokensUsed}`);
   */
  async generateSantaLetter(userPreferences: string, options?: GenerationOptions): Promise<SantaLetterResponse> {
    const startTime = Date.now();

    const systemPrompt = this.buildSystemPrompt(options?.language || "pl");

    const messages = this.buildMessages(systemPrompt, userPreferences);
    const responseFormat = this.buildResponseFormat();

    const apiResponse = await this.makeRequest(messages, responseFormat);
    const parsedResponse = this.parseResponse(apiResponse);

    parsedResponse.metadata.generationTime = Date.now() - startTime;

    // FIX #20: Log token usage and estimated costs for monitoring
    const estimatedCost = this.estimateCost(apiResponse.usage);
    console.log("[OpenRouterService.generateSantaLetter] AI Generation Complete", {
      model: apiResponse.model,
      tokensUsed: parsedResponse.metadata.tokensUsed,
      promptTokens: apiResponse.usage?.prompt_tokens || 0,
      completionTokens: apiResponse.usage?.completion_tokens || 0,
      estimatedCostUSD: estimatedCost.toFixed(6),
      generationTimeMs: parsedResponse.metadata.generationTime,
      timestamp: new Date().toISOString(),
    });

    return parsedResponse;
  }

  /**
   * FIX #23: Validates if participant can generate AI wishlist based on rate limits
   *
   * Checks the participant's AI generation quota:
   * - Unregistered users: 3 generations per group
   * - Registered users: 5 generations per group
   *
   * This method should only be called after authentication is verified in endpoint layer.
   *
   * @param participantId - The participant ID to check (as string, will be validated)
   * @param isRegistered - Whether the participant is a registered user
   * @returns Promise resolving to rate limit status with quota information
   * @throws {OpenRouterError} INVALID_INPUT - Invalid participant ID format
   * @throws {OpenRouterError} SERVER_ERROR - Database error occurred
   *
   * @example
   * const status = await service.validateRateLimit("123", true);
   * if (status.canGenerate) {
   *   console.log(`Can generate. Remaining: ${status.generationsRemaining}`);
   * }
   */
  async validateRateLimit(participantId: string, isRegistered: boolean): Promise<RateLimitStatus> {
    // FIX #9: Validate participantId before parseInt
    // FIX #15: This method should only be called after authentication is verified in endpoint layer
    const id = parseInt(participantId, 10);

    if (isNaN(id) || id <= 0) {
      console.error("[OpenRouterService.validateRateLimit] Invalid participant ID", { participantId });
      throw new OpenRouterError("INVALID_INPUT", "Invalid participant ID", false);
    }

    try {
      const { data, error } = await this.supabase
        .from("wishes")
        .select("ai_generation_count_per_group, ai_last_generated_at")
        .eq("participant_id", id)
        .single();

      if (error) {
        // If no wishlist exists yet, participant can generate
        if (error.code === "PGRST116") {
          const maxGenerations = isRegistered ? AI_MAX_GENERATIONS_REGISTERED : AI_MAX_GENERATIONS_UNREGISTERED;
          return {
            canGenerate: true,
            generationsUsed: 0,
            generationsRemaining: maxGenerations,
            maxGenerations,
            lastGeneratedAt: null,
          };
        }
        throw error;
      }

      const maxGenerations = isRegistered ? AI_MAX_GENERATIONS_REGISTERED : AI_MAX_GENERATIONS_UNREGISTERED;
      const currentCount = data.ai_generation_count_per_group || 0;

      return {
        canGenerate: currentCount < maxGenerations,
        generationsUsed: currentCount,
        generationsRemaining: Math.max(0, maxGenerations - currentCount),
        maxGenerations,
        lastGeneratedAt: data.ai_last_generated_at ? new Date(data.ai_last_generated_at) : null,
      };
    } catch (error) {
      console.error("[OpenRouterService.validateRateLimit] Database error:", error);
      throw new OpenRouterError("SERVER_ERROR", "Failed to check rate limit", true);
    }
  }

  /**
   * FIX #23: Atomically increments AI generation count for a participant
   *
   * Updates the participant's AI generation counter in the database using a SECURITY DEFINER
   * database function. Creates a wishlist record if it doesn't exist (UPSERT).
   *
   * This should be called BEFORE generating AI content to prevent race conditions.
   *
   * @param participantId - The participant ID (as string, will be validated)
   * @returns Promise that resolves when count is incremented
   * @throws {OpenRouterError} INVALID_INPUT - Invalid participant ID format
   * @throws {OpenRouterError} SERVER_ERROR - Database error occurred
   *
   * @example
   * // Increment counter before generation
   * await service.incrementGenerationCount("123");
   * // Counter is now incremented regardless of generation success
   */
  async incrementGenerationCount(participantId: string): Promise<void> {
    // FIX #9: Validate participantId before parseInt
    const id = parseInt(participantId, 10);

    if (isNaN(id) || id <= 0) {
      console.error("[OpenRouterService.incrementGenerationCount] Invalid participant ID", { participantId });
      throw new OpenRouterError("INVALID_INPUT", "Invalid participant ID", false);
    }

    try {
      const { error } = await this.supabase.rpc("increment_ai_generation_count", {
        p_participant_id: id,
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error("[OpenRouterService.incrementGenerationCount] Database error:", error);
      throw new OpenRouterError("SERVER_ERROR", "Failed to update generation count", true);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const messages = [{ role: "user" as const, content: "test" }];
      await this.makeRequest(messages, this.buildResponseFormat());
      return true;
    } catch {
      return false;
    }
  }

  // === PRIVATE METHODS ===

  private buildSystemPrompt(language = "pl"): string {
    const prompts = {
      pl: `Jesteś asystentem pomagającym tworzyć listy do świętego Mikołaja na Gwiazdkę (Secret Santa).

Zadanie:
Na podstawie preferencji użytkownika wygeneruj ciepły, narracyjny list do Mikołaja zawierający listę życzeń.

Wytyczne:
1. Użyj formy listu (np. "Drogi Mikołaju,..." lub "Hej Mikołaju!")
2. Ton ma być ciepły, personalny i świąteczny (nie oficjalny czy suchy)
3. WYPISZ TYLKO prezenty podane przez użytkownika - NIE wymyślaj własnych pomysłów
4. Zawrzyj pomysły na prezenty wysłane przez użytkownika w narracji listu (zachowaj linki jeśli zostały podane)
5. Dodaj emoji świąteczne (🎁, 🎄, ⭐, 🎅, ❄️, 🔔)
6. Maksymalnie 2000 znaków
7. Odpowiadaj TYLKO po polsku
8. Zakończ list w ciepły, świąteczny sposób

Przykład:
Cześć Mikołaju! 🎅

W tym roku byłam/em grzeczna/y i marzę o kilku rzeczach pod choinkę 🎄. Mega chciałabym/bym dostać "Wiedźmin: Ostatnie życzenie" Sapkowskiego 📚, bo fantasy to moja ulubiona bajka! Poza tym uwielbiam dobrą kawę ☕ - jakiś ciekawy zestaw z różnych zakątków świata byłby super. I jeszcze ciepły, kolorowy szalik 🧣, bo zima idzie!

Dzięki i wesołych Świąt! ⭐`,
      en: `You are an assistant helping to create Christmas wishlists for Secret Santa.

Task:
Based on user preferences, generate a warm, narrative letter to Santa with ideas from user's wishlist.

Guidelines:
1. Use letter format (e.g., "Dear Santa,..." or "Hey Santa!")
2. Tone should be warm, personal, and festive (not formal or dry)
3. LIST ONLY gifts mentioned by user - DO NOT invent your own gift ideas
4. Include ideas from user's wishlist woven into the narrative (preserve links if provided)
5. Add Christmas emoji (🎁, 🎄, ⭐, 🎅, ❄️, 🔔)
6. Maximum 2000 characters
7. Respond ONLY in English
8. End with warm, festive wishes`,
    };

    return prompts[language as keyof typeof prompts] || prompts.pl;
  }

  private buildMessages(systemPrompt: string, userPrompt: string): Message[] {
    return [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: this.sanitizeUserInput(userPrompt),
      },
    ];
  }

  private buildResponseFormat(): ResponseFormat {
    return {
      type: "json_schema",
      json_schema: {
        name: "santa_letter_response",
        strict: true,
        schema: {
          type: "object",
          properties: {
            letter_content: {
              type: "string",
              description: "Generated letter to Santa with ideas from user's wishlist in narrative form",
            },
            suggested_gifts: {
              type: "array",
              items: { type: "string" },
              description: "List of gift ideas mentioned by user - DO NOT add your own ideas",
            },
          },
          required: ["letter_content", "suggested_gifts"],
          additionalProperties: false,
        },
      },
    };
  }

  private async makeRequest(messages: Message[], responseFormat: ResponseFormat): Promise<OpenRouterAPIResponse> {
    const requestBody = {
      model: this.config.model,
      messages,
      response_format: responseFormat,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      top_p: this.config.topP,
    };

    const headers = {
      Authorization: `Bearer ${this.config.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": import.meta.env.PUBLIC_SITE_URL || "http://localhost:4321",
      "X-Title": "Secret Santa App",
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(this.apiEndpoint, {
          method: "POST",
          headers,
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw await this.handleAPIError(response);
        }

        const data = await response.json();
        return data as OpenRouterAPIResponse;
      } catch (error) {
        lastError = error as Error;

        // FIX #2: Handle AbortController timeout explicitly
        // When timeout occurs, AbortController throws an error with name 'AbortError'
        if (error instanceof Error && error.name === "AbortError") {
          console.log("[OpenRouterService.makeRequest] Request timeout (AbortError)", {
            attempt: attempt + 1,
            maxRetries: this.config.maxRetries + 1,
            timeout: this.config.timeout,
          });
          // Convert to GATEWAY_TIMEOUT error (504)
          lastError = new OpenRouterError(
            "GATEWAY_TIMEOUT",
            `Request timeout after ${this.config.timeout}ms`,
            true // Retryable
          );

          // Retry if attempts remain
          if (attempt < this.config.maxRetries) {
            const delay = this.config.baseDelay * Math.pow(2, attempt);
            await this.sleep(delay);
            continue;
          }

          // No more retries, throw the timeout error
          throw lastError;
        }

        if (error instanceof OpenRouterError && !error.isRetryable) {
          throw error;
        }

        if (attempt < this.config.maxRetries) {
          const delay = this.config.baseDelay * Math.pow(2, attempt);
          await this.sleep(delay);
          continue;
        }
      }
    }

    throw lastError || new OpenRouterError("UNKNOWN_ERROR", "Failed to complete request after retries");
  }

  private async handleAPIError(response: Response): Promise<OpenRouterError> {
    let errorBody: { message?: string; error?: { message?: string } };
    try {
      errorBody = await response.json();
    } catch {
      errorBody = { message: response.statusText };
    }

    const errorMap: Record<number, { code: ErrorCode; isRetryable: boolean }> = {
      400: { code: "INVALID_REQUEST", isRetryable: false },
      401: { code: "UNAUTHORIZED", isRetryable: false },
      403: { code: "FORBIDDEN", isRetryable: false },
      404: { code: "NOT_FOUND", isRetryable: false },
      429: { code: "RATE_LIMIT_EXCEEDED", isRetryable: false },
      500: { code: "SERVER_ERROR", isRetryable: true },
      502: { code: "BAD_GATEWAY", isRetryable: true },
      503: { code: "SERVICE_UNAVAILABLE", isRetryable: true },
      504: { code: "GATEWAY_TIMEOUT", isRetryable: true },
    };

    const errorInfo = errorMap[response.status] || {
      code: "UNKNOWN_ERROR",
      isRetryable: false,
    };

    return new OpenRouterError(
      errorInfo.code,
      errorBody.error?.message || errorBody.message || "Unknown error",
      errorInfo.isRetryable,
      { status: response.status, body: errorBody }
    );
  }

  private sanitizeUserInput(input: string): string {
    let sanitized = input.trim();

    if (sanitized.length > AI_PROMPT_MAX_LENGTH) {
      sanitized = sanitized.slice(0, AI_PROMPT_MAX_LENGTH);
    }

    if (sanitized.length < AI_PROMPT_MIN_LENGTH) {
      throw new OpenRouterError(
        "INVALID_INPUT",
        `User preferences must be at least ${AI_PROMPT_MIN_LENGTH} characters`,
        false
      );
    }

    sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, "").replace(/<iframe[^>]*>.*?<\/iframe>/gi, "");

    return sanitized;
  }

  private parseResponse(apiResponse: OpenRouterAPIResponse): SantaLetterResponse {
    try {
      const content = apiResponse.choices[0]?.message?.content;

      if (!content) {
        throw new OpenRouterError("INVALID_RESPONSE", "No content in API response", false);
      }

      const parsed = JSON.parse(content);

      if (!parsed.letter_content || !Array.isArray(parsed.suggested_gifts)) {
        throw new OpenRouterError("INVALID_RESPONSE", "Response does not match expected schema", false);
      }

      if (parsed.letter_content.length > AI_LETTER_MAX_LENGTH) {
        parsed.letter_content = parsed.letter_content.slice(0, AI_LETTER_MAX_LENGTH);
      }

      return {
        letterContent: parsed.letter_content,
        suggestedGifts: parsed.suggested_gifts.slice(0, AI_MAX_SUGGESTED_GIFTS),
        metadata: {
          model: apiResponse.model,
          tokensUsed: apiResponse.usage?.total_tokens || 0,
          generationTime: 0,
        },
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new OpenRouterError("INVALID_JSON", "Failed to parse JSON response", false, { originalError: error });
      }
      throw error;
    }
  }

  /**
   * FIX #20: Estimates cost of AI generation based on token usage
   * Pricing for gpt-4o-mini (as of 2025):
   * - Prompt tokens: $0.150 per 1M tokens ($0.00015 per 1K)
   * - Completion tokens: $0.600 per 1M tokens ($0.0006 per 1K)
   *
   * @param usage - Token usage from OpenRouter API response
   * @returns Estimated cost in USD
   */
  private estimateCost(usage?: { prompt_tokens: number; completion_tokens: number }): number {
    if (!usage) return 0;

    const promptCost = (usage.prompt_tokens / 1000) * AI_PROMPT_COST_PER_1K;
    const completionCost = (usage.completion_tokens / 1000) * AI_COMPLETION_COST_PER_1K;

    return promptCost + completionCost;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
