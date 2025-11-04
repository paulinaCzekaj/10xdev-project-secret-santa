import { z } from "zod";
import type { SupabaseClient } from "@/db/supabase.client";
import { OpenRouterError } from "./openrouter.error";
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
  private readonly httpClient: typeof fetch;
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
    this.httpClient = fetch;
  }

  // === PUBLIC METHODS ===

  async generateSantaLetter(userPreferences: string, options?: GenerationOptions): Promise<SantaLetterResponse> {
    const startTime = Date.now();

    const systemPrompt = this.buildSystemPrompt(options?.language || "pl");

    const messages = this.buildMessages(systemPrompt, userPreferences);
    const responseFormat = this.buildResponseFormat();

    const apiResponse = await this.makeRequest(messages, responseFormat);
    const parsedResponse = this.parseResponse(apiResponse);

    parsedResponse.metadata.generationTime = Date.now() - startTime;

    return parsedResponse;
  }

  async validateRateLimit(participantId: string, isRegistered: boolean): Promise<RateLimitStatus> {
    try {
      const { data, error } = await this.supabase
        .from("wishes")
        .select("ai_generation_count_per_group, ai_last_generated_at")
        .eq("participant_id", parseInt(participantId))
        .single();

      if (error) {
        // If no wishlist exists yet, participant can generate
        if (error.code === "PGRST116") {
          const maxGenerations = isRegistered ? 5 : 3;
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

      const maxGenerations = isRegistered ? 5 : 3;
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

  async incrementGenerationCount(participantId: string): Promise<void> {
    try {
      const { error } = await this.supabase.rpc("increment_ai_generation_count", {
        p_participant_id: parseInt(participantId),
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
3. Zawrzyj pomysły na prezenty wysłane przez użytkownika w narracji listu
4. Dodaj emoji świąteczne (🎁, 🎄, ⭐, 🎅, ❄️, 🔔)
5. Maksymalnie 1000 znaków
6. Odpowiadaj TYLKO po polsku
7. Zakończ list w ciepły, świąteczny sposób

Przykład struktury:
Cześć Mikołaju! 🎅

[Wprowadzenie z ciepłym tonem]
[propozycje prezentów użytkownika wplecione w narrację]
[Ciepłe zakończenie ze świątecznymi życzeniami]

Wesołych Świąt! ⭐`,
      en: `You are an assistant helping to create Christmas wishlists for Secret Santa.

Task:
Based on user preferences, generate a warm, narrative letter to Santa with ideas from user's wishlist.

Guidelines:
1. Use letter format (e.g., "Dear Santa,..." or "Hey Santa!")
2. Tone should be warm, personal, and festive (not formal or dry)
3. Include ideas from user's wishlist woven into the narrative
4. Add Christmas emoji (🎁, 🎄, ⭐, 🎅, ❄️, 🔔)
5. Maximum 1000 characters
6. Respond ONLY in English
7. End with warm, festive wishes`,
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
              description: "List of ideas from user's wishlist",
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

        const response = await this.httpClient(this.apiEndpoint, {
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

    if (sanitized.length > 1000) {
      sanitized = sanitized.slice(0, 1000);
    }

    if (sanitized.length < 10) {
      throw new OpenRouterError("INVALID_INPUT", "User preferences must be at least 10 characters", false);
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

      if (parsed.letter_content.length > 1000) {
        parsed.letter_content = parsed.letter_content.slice(0, 1000);
      }

      return {
        letterContent: parsed.letter_content,
        suggestedGifts: parsed.suggested_gifts.slice(0, 5),
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

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
