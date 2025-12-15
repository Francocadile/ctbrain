export type PushPayload = {
  tokens: string[];
  notification: {
    title: string;
    body: string;
  };
  data?: Record<string, string>;
};

export type PushResult = {
  successCount: number;
  failureCount: number;
  invalidTokens: string[];
};

/**
 * Envío batch de notificaciones push vía FCM (endpoint legacy /fcm/send).
 *
 * - Usa process.env.FCM_SERVER_KEY como clave de servidor.
 * - Envía en batches de 500 tokens.
 * - Devuelve la lista de invalidTokens para desactivarlos en DB.
 */
export async function sendPushBatch(input: PushPayload): Promise<PushResult> {
  const key = process.env.FCM_SERVER_KEY;
  if (!key) {
    console.warn("[push] FCM_SERVER_KEY not set, skipping push");
    return { successCount: 0, failureCount: 0, invalidTokens: [] };
  }

  const tokens = Array.from(new Set(input.tokens.filter(Boolean)));
  if (!tokens.length) {
    return { successCount: 0, failureCount: 0, invalidTokens: [] };
  }

  const batchSize = 500;
  let successCount = 0;
  let failureCount = 0;
  const invalidTokens: string[] = [];

  for (let i = 0; i < tokens.length; i += batchSize) {
    const slice = tokens.slice(i, i + batchSize);

    const res = await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        Authorization: `key=${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        registration_ids: slice,
        notification: input.notification,
        data: input.data ?? {},
      }),
    });

    if (!res.ok) {
      // Si FCM falla a nivel HTTP, contamos todo el batch como fallido.
      console.error("[push] FCM HTTP error", res.status, await res.text());
      failureCount += slice.length;
      continue;
    }

    const json: any = await res.json();
    if (!Array.isArray(json.results)) {
      console.error("[push] Unexpected FCM response", json);
      failureCount += slice.length;
      continue;
    }

    json.results.forEach((r: any, idx: number) => {
      if (r.error) {
        failureCount++;
        // Errores que indican token inválido/caducado
        if (
          r.error === "InvalidRegistration" ||
          r.error === "NotRegistered" ||
          r.error === "MissingRegistration"
        ) {
          invalidTokens.push(slice[idx]);
        }
      } else {
        successCount++;
      }
    });
  }

  return { successCount, failureCount, invalidTokens };
}
