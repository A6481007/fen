// Safe API helper for admin components
export const safeApiCall = async (url: string, options?: RequestInit) => {
  try {
    const response = await fetch(url, {
      ...options,
      cache: "no-store",
      headers: {
        ...options?.headers,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });

    // Check if response is ok
    if (!response.ok) {
      // Try to get error details from response body
      let errorDetails = "";
      try {
        const errorBody = await response.text();
        errorDetails = errorBody ? ` - ${errorBody}` : "";
      } catch (e) {
        // If we can't read the body, continue without it
      }

      throw new Error(
        `API call failed: ${response.status} ${response.statusText}${errorDetails}`
      );
    }

    // Check content type before parsing JSON
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      throw new Error(
        `Expected JSON response but got: ${contentType}. Response: ${text.substring(
          0,
          100
        )}...`
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(
        `JSON parse error: ${error.message}. This usually means the server returned HTML instead of JSON.`
      );
    }
    throw error;
  }
};

export const handleApiError = (error: unknown, context: string) => {
  console.error(`${context}:`, error);

  if (error instanceof Error) {
    if (error.message.includes("JSON parse error")) {
      console.error(
        "The server likely returned an HTML error page instead of JSON. Check server logs and API endpoint."
      );
    } else if (error.message.includes("API call failed")) {
      console.error(
        "API request failed. Check network connection and server status."
      );
    }
  }
};
