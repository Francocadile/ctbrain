"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";

// Evitar doble ejecución por StrictMode / remounts en React
let didRun = false;

const API_BASE =
  typeof window !== "undefined" ? window.location.origin : "https://openbase.work";

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

const PushNotifications =
  Capacitor.getPlatform() !== "web"
    ? ((Capacitor as any).Plugins as any).PushNotifications
    : null;

async function setupPush() {
  if (didRun) {
    console.log("[mobile-push] already initialized, skipping");
    return;
  }
  didRun = true;

  console.log("[mobile-push] boot");

  if (!Capacitor.isNativePlatform()) {
    console.log("[mobile-push] not native, skip");
    return;
  }

  if (!PushNotifications) {
    console.error("[mobile-push] PushNotifications bridge missing");
    return;
  }

  console.log("[mobile-push] registering…");

  try {
    await PushNotifications.requestPermissions();
    await PushNotifications.register();

    PushNotifications.addListener("registration", async (token: any) => {
      console.log("[mobile-push] token", token.value);

      try {
        await registerDeviceToken(token.value);
      } catch (err) {
        console.error("[mobile-push] Error registering device token", err);
      }
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
