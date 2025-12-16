"use client";

import { useEffect } from "react";
import { Capacitor, registerPlugin } from "@capacitor/core";

// Evitar doble ejecución por StrictMode / remounts en React
let didRun = false;

const PushNotifications = registerPlugin<any>("PushNotifications");

export async function setupPush() {
  console.log("[mobile-push] boot");
  console.log(
    "[mobile-push] isNativePlatform=",
    Capacitor.isNativePlatform(),
    "platform=",
    Capacitor.getPlatform()
  );

  if (!Capacitor.isNativePlatform()) return;

  if (didRun) {
    console.log("[mobile-push] already initialized, skipping");
    return;
  }
  didRun = true;

  try {
    const perm = await PushNotifications.requestPermissions();
    console.log("[mobile-push] perm", perm);

    await PushNotifications.register();
    console.log("[mobile-push] registering…");

    await PushNotifications.addListener("registration", async (token: any) => {
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

    await PushNotifications.addListener("registrationError", (err: any) => {
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
