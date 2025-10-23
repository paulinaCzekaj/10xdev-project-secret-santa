import { supabaseClient } from "@/db/supabase.client";

/**
 * Centralized API client for making HTTP requests
 * Handles authentication, error handling, and response parsing
 */

interface ApiClientConfig {
  baseUrl?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(config: ApiClientConfig = {}) {
    this.baseUrl = config.baseUrl || "";
  }

  /**
   * Get authentication headers with current session token
   */
  private async getAuthHeaders(): Promise<HeadersInit> {
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();

    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }

    return headers;
  }

  /**
   * Handle HTTP response and parse JSON
   * Throws error for non-OK responses
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        errorData.error?.message || errorData.message || `HTTP ${response.status}: ${response.statusText}`;

      throw new Error(errorMessage);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  /**
   * GET request
   */
  async get<T>(url: string): Promise<T> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseUrl}${url}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });
    return this.handleResponse<T>(response);
  }

  /**
   * POST request
   */
  async post<T, D = unknown>(url: string, data?: D): Promise<T> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseUrl}${url}`, {
      method: "POST",
      headers,
      body: data ? JSON.stringify(data) : undefined,
      cache: "no-store",
    });
    return this.handleResponse<T>(response);
  }

  /**
   * PATCH request
   */
  async patch<T, D = unknown>(url: string, data: D): Promise<T> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseUrl}${url}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(data),
      cache: "no-store",
    });
    return this.handleResponse<T>(response);
  }

  /**
   * DELETE request
   */
  async delete<T = void>(url: string): Promise<T> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseUrl}${url}`, {
      method: "DELETE",
      headers,
      cache: "no-store",
    });
    return this.handleResponse<T>(response);
  }
}

/**
 * Singleton instance of API client
 */
export const apiClient = new ApiClient();
