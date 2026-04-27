function getBaseURL(): string {
  // Always use the local Next.js API proxy at /api
  // The proxy at /api/[...path]/route.ts forwards to the actual backend
  // This eliminates CORS issues, mixed-content errors, and port-forwarding problems
  // Works seamlessly across localhost, GitHub Codespaces, and any deployment
  return '/api';
}

const BASE_URL = getBaseURL();

console.log('[API] Configured BASE_URL:', BASE_URL);

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string;
};

export async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const url = `${BASE_URL}${endpoint}`;
  console.log(`[API] ${method} ${url}`);

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
    });

    const data = await res.json();
    
    if (!res.ok) {
      // Use warn for 4xx/5xx responses (these are often expected errors like invalid PIN)
      if (res.status >= 400) {
        console.warn(`[API] ${res.status}:`, data?.message || data);
      }
      throw new Error(data.message || `Request failed with status ${res.status}`);
    }
    
    console.log(`[API] Success ${res.status}:`, data);
    return data as T;
  } catch (error) {
    // Only log unexpected fetch errors (network failures, etc.)
    if (error instanceof TypeError) {
      console.error(`[API] Network error for ${url}:`, error);
    }
    throw error;
  }
}
