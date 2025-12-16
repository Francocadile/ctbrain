"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";

// Evitar doble ejecución por StrictMode / remounts en React
let didRun = false;

const API_BASE =
  typeof window !== "undefined" ? window.location.origin : "https://openbase.work";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getPushBridge(): Promise<any | null> {
  // Solo en nativo
  if (!Capacitor.isNativePlatform()) return null;

  // Espera a que capacitor.js inyecte el bridge global (server.url puede tardar)
  for (let i = 0; i < 25; i++) {
    const w = window as any;
    const bridge = w?.Capacitor?.Plugins?.PushNotifications;
    if (bridge) return bridge;
    await sleep(200);
  }
  return null;
}

async function registerDeviceToken(token: string) {
  try {
    console.log("[mobile-push] posting /api/devices");
    const res = await fetch(`${API_BASE}/api/devices`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ pushToken: token, platform: "android" }),
    });

    const text = await res.text();
    console.log("[mobile-push] /api/devices status", res.status);
    console.log("[mobile-push] /api/devices body", text);

    if (!res.ok) {
      console.warn("[mobile-push] Failed to register device token");
    }
  } catch (err) {
    console.error("[mobile-push] Error calling /api/devices", err);
  }
}

async function setupPush() {
  if (didRun) {
    console.log("[mobile-push] already initialized, skipping");
    return;
  }
  didRun = true;

  try {
    console.log("[mobile-push] boot");
    console.log(
      "[mobile-push] isNativePlatform=",
      Capacitor.isNativePlatform(),
      "platform=",
      Capacitor.getPlatform()
    );

    const PushNotifications = await getPushBridge();
    if (!PushNotifications) {
      console.error("[mobile-push] PushNotifications bridge missing (after wait)");
      return;
    }

    console.log("[mobile-push] bridge ok, requesting permissions…");

    const perm = await PushNotifications.requestPermissions();
    console.log("[mobile-push] perm", perm);

    await PushNotifications.register();
    console.log("[mobile-push] registering…");

    PushNotifications.addListener("registration", async (token: any) => {
      console.log("[mobile-push] token", token?.value);

      await fetch("/api/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token?.value,
          platform: Capacitor.getPlatform(),
        }),
      });

      console.log("[mobile-push] posted /api/devices");
    });

    PushNotifications.addListener("registrationError", (err: any) => {
      console.error("[mobile-push] registration error", err);
    });
  } catch (e) {
    console.error("[mobile-push] setupPush failed", e);
  }
}

export function useMobilePushClient() {
  useEffect(() => {
    void setupPush();
  }, []);
}

export function MobilePushClient() {
  useMobilePushClient();
  return null;
}
