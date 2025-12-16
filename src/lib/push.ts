import { GoogleAuth } from "google-auth-library";

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

export async function sendPushBatch(input: PushPayload): Promise<PushResult> {
  const saJson = process.env.FCM_SERVICE_ACCOUNT_JSON;
  if (!saJson) {
    console.warn("[push] FCM_SERVICE_ACCOUNT_JSON not set, skipping push");
    return { successCount: 0, failureCount: 0, invalidTokens: [] };
  }

  let serviceAccount: {
    project_id: string;
    client_email: string;
    private_key: string;
  };

  try {
    serviceAccount = JSON.parse(saJson);
  } catch (e) {
    console.error("[push] Failed to parse FCM_SERVICE_ACCOUNT_JSON", e);
    return { successCount: 0, failureCount: 0, invalidTokens: [] };
  }

  const projectId = serviceAccount.project_id;
  if (!projectId || !serviceAccount.client_email || !serviceAccount.private_key) {
    console.error("[push] Invalid FCM service account JSON (missing fields)");
    return { successCount: 0, failureCount: 0, invalidTokens: [] };
  }

  // Normalizar saltos de línea en la private_key
  const privateKey = serviceAccount.private_key.replace(/\\n/g, "\n");

  const auth = new GoogleAuth({
    credentials: {
      client_email: serviceAccount.client_email,
      private_key: privateKey,
    },
    projectId,
    scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
  });

  const tokens = Array.from(new Set(input.tokens.filter(Boolean)));
  console.log("[push] sendPushBatch: incoming tokens=", input.tokens.length);
  console.log("[push] sendPushBatch: unique non-empty tokens=", tokens.length);

  if (!tokens.length) {
    console.log("[push] sendPushBatch: no tokens after filtering, aborting");
    return { successCount: 0, failureCount: 0, invalidTokens: [] };
  }

  let successCount = 0;
  let failureCount = 0;
  const invalidTokens: string[] = [];
  const client = await auth.getClient();

  for (const token of tokens) {
    try {
      console.log("[push] sendPushBatch: sending v1 message to token", token);

      const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
      const res = await (client as any).request({
        url,
        method: "POST",
        data: {
          message: {
            token,
            notification: input.notification,
            data: input.data ?? {},
          },
        },
      });

      // HTTP-level error
      if (!res || res.status >= 400) {
        console.error("[push] FCM v1 HTTP error", res && res.status, res && res.data);
        failureCount++;
        continue;
      }

      const body = res.data as any;
      // v1 suele devolver un nombre de mensaje cuando está OK
      if (body && body.name) {
        successCount++;
        continue;
      }

      // Si viene algún error estructurado
      const err = body && (body.error || body.errorCode || body.status);
      if (err) {
        const errStr = typeof err === "string" ? err : JSON.stringify(err);
        console.error("[push] FCM v1 logical error", errStr);

        const upper = errStr.toUpperCase();
        if (upper.includes("UNREGISTERED") || upper.includes("NOT_FOUND")) {
          invalidTokens.push(token);
        }

        failureCount++;
        continue;
      }

      // Caso raro: sin name ni error explícito
      console.warn("[push] FCM v1 unexpected response", body);
      failureCount++;
    } catch (e: any) {
      console.error("[push] FCM v1 request failed", e?.response?.status, e?.response?.data || e);
      const msg = (e && (e.message as string)) || "";
      const upperMsg = msg.toUpperCase();
      if (upperMsg.includes("UNREGISTERED") || upperMsg.includes("NOT_FOUND")) {
        invalidTokens.push(token);
      }
      failureCount++;
    }
  }
  console.log("[push] sendPushBatch: done", {
    tokens: tokens.length,
    successCount,
    failureCount,
    invalidTokens: invalidTokens.length,
  });

  // Por consistencia, si hubo tokens, success+failure debería igualar tokens
  if (tokens.length > 0 && successCount + failureCount !== tokens.length) {
    console.warn("[push] sendPushBatch: inconsistent counts", {
      tokens: tokens.length,
      successCount,
      failureCount,
    });
  }

  return { successCount, failureCount, invalidTokens };
}
