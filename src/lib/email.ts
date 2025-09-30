// src/lib/email.ts
/**
 * Envío de email de reset con fallback a consola.
 * Si configurás RESEND_API_KEY y RESET_EMAIL_FROM, envia por Resend REST.
 */
type SendResult = { ok: true } | { ok: false; error: string };

export async function sendResetEmail(to: string, name: string | null, link: string): Promise<SendResult> {
  const from = process.env.RESET_EMAIL_FROM || "";
  const apiKey = process.env.RESEND_API_KEY || "";
  const subject = "CTBrain · Restablecer contraseña";
  const html = `
    <p>Hola${name ? ` ${name}` : ""},</p>
    <p>Recibimos una solicitud para restablecer tu contraseña.</p>
    <p><a href="${link}">Haz clic aquí para crear una nueva contraseña</a>. Este enlace vence en 1 hora.</p>
    <p>Si no solicitaste este cambio, puedes ignorar este mensaje.</p>
  `;

  if (apiKey && from) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to,
          subject,
          html,
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        console.error("[email] resend error", txt);
        // Fallback a consola también
      } else {
        return { ok: true };
      }
    } catch (e: any) {
      console.error("[email] resend exception", e?.message || e);
    }
  }

  // Fallback consola (dev)
  console.info("[email] reset link (dev)", { to, link });
  return { ok: true };
}
