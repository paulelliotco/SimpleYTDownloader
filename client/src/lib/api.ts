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