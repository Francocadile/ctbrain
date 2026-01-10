import { CSRF_HEADER_NAME, getClientCsrfToken } from "@/lib/security/client-csrf";

export type UploadDiagramPngParams = {
  sessionId: string;
  exerciseIndex: number;
  pngDataUrl: string;
};

export type UploadDiagramPngResponse = {
  url: string;
};

export async function uploadDiagramPng(
  params: UploadDiagramPngParams,
): Promise<UploadDiagramPngResponse> {
  const token = getClientCsrfToken();

  const res = await fetch("/api/uploads/diagram", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { [CSRF_HEADER_NAME]: token } : {}),
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    let message = "";
    try {
      const data = (await res.json()) as any;
      if (data && typeof data.error === "string") {
        message = data.error;
      } else if (data && typeof data.message === "string") {
        message = data.message;
      }
    } catch {
      const text = await res.text().catch(() => "");
      message = text || res.statusText;
    }

    console.error("uploadDiagramPng failed", {
      status: res.status,
      statusText: res.statusText,
      message,
    });

    throw new Error(message || `Error al subir diagrama (${res.status})`);
  }

  const json = (await res.json()) as { url?: string };
  if (!json?.url) {
    throw new Error("Respuesta de subida de diagrama sin URL");
  }

  return { url: json.url };
}

export type UploadDiagramBackgroundParams = {
  sessionId: string;
  pngDataUrl: string;
};

export type UploadDiagramBackgroundResponse = {
  url: string;
};

export async function uploadDiagramBackground(
  params: UploadDiagramBackgroundParams,
): Promise<UploadDiagramBackgroundResponse> {
  const token = getClientCsrfToken();

  const res = await fetch("/api/uploads/diagram-background", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { [CSRF_HEADER_NAME]: token } : {}),
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");

    console.error("uploadDiagramBackground failed", {
      status: res.status,
      statusText: res.statusText,
      body: text,
    });

    const error = new Error(
      `Error al subir fondo de diagrama (${res.status}): ${text || res.statusText}`,
    );
    (error as any).status = res.status;
    (error as any).body = text;
    throw error;
  }

  const json = (await res.json()) as { url?: string };
  if (!json?.url) {
    throw new Error("Respuesta de subida de fondo sin URL");
  }

  return { url: json.url };
}
