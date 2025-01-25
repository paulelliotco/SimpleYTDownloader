/**
 * Initiates a download process by sending a POST request with the specified data.
 * @example
 * startDownload({ url: "http://example.com", format: "mp3", quality: "high", is_playlist: false })
 * { "downloadId": 123, "status": "started" }
 * @param {{url: string, format: string, quality: string, is_playlist: boolean}} data - The data containing download parameters such as URL, format, quality, and playlist boolean.
 * @returns {Promise<Object>} Promise resolving to a JSON object with the download details or throws an error if the request fails.
 * @description
 *   - The function handles errors by throwing an error with response text if the HTTP request is not successful.
 *   - It converts the input data into JSON format and sets appropriate headers before sending the request.
 */
export async function startDownload(data: {
  url: string;
  format: string;
  quality: string;
  is_playlist: boolean;
}) {
  const res = await fetch("/api/downloads", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json();
}

export async function cancelDownload(id: string) {
  const res = await fetch(`/api/downloads/${id}/cancel`, {
    method: "POST",
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }
}

export async function pauseDownload(id: string) {
  const res = await fetch(`/api/downloads/${id}/pause`, {
    method: "POST",
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }
}

export async function resumeDownload(id: string) {
  const res = await fetch(`/api/downloads/${id}/resume`, {
    method: "POST",
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }
}

export async function getDownloads() {
  const res = await fetch("/api/downloads");
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res.json();
}