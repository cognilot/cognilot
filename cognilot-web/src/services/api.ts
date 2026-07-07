// API base configuration and fetch wrapper

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || '';
const API_BASE_URL = rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`;

export interface ApiError {
  message: string;
  status: number;
  details?: unknown;
}

class ApiClient {
  private getAuthToken(explicitToken?: string): string | null {
    if (explicitToken) return explicitToken;

    // Inject Supabase project ID in headers for the backend API
    const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const projectRef = projectUrl.match(/https:\/\/(.*?)\.supabase\.co/)?.[1];

    if (projectRef) {
      const storageKey = `sb-${projectRef}-auth-token`;
      const sessionStr = localStorage.getItem(storageKey);
      if (sessionStr) {
        try {
          const sessionData = JSON.parse(sessionStr);
          return sessionData.access_token || null;
        } catch (e) {
          console.error('ApiClient: Error parsing session data', e);
        }
      }
    }

    // Fallback to legacy discovery if projectRef is not found
    const storageKey = Object.keys(localStorage).find(
      (key) => key.startsWith('sb-') && key.endsWith('-auth-token')
    );
    if (storageKey) {
      try {
        const sessionData = JSON.parse(localStorage.getItem(storageKey) || '{}');
        return sessionData.access_token || null;
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error: ApiError = {
        message: 'Request failed',
        status: response.status,
      };

      try {
        const errorData = await response.json();
        error.message = errorData.detail || errorData.message || error.message;
        error.details = errorData;
      } catch {
        error.message = response.statusText || error.message;
      }

      throw error;
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  async get<T>(endpoint: string, token?: string): Promise<T> {
    const authToken = this.getAuthToken(token);
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers,
    });

    return this.handleResponse<T>(response);
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    const token = this.getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  async put<T>(endpoint: string, data: unknown): Promise<T> {
    const token = this.getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });

    return this.handleResponse<T>(response);
  }

  async patch<T>(endpoint: string, data: unknown): Promise<T> {
    const token = this.getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data),
    });

    return this.handleResponse<T>(response);
  }

  async delete<T>(endpoint: string): Promise<T> {
    const token = this.getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers,
    });

    return this.handleResponse<T>(response);
  }

  async uploadFile<T>(endpoint: string, file: File): Promise<T> {
    const token = this.getAuthToken();
    const formData = new FormData();
    formData.append('file', file);

    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    return this.handleResponse<T>(response);
  }
}

export const api = new ApiClient();
