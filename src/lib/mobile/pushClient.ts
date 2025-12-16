"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import type {
  PushNotificationSchema,
  Token,
  ActionPerformed,
} from "@capacitor/push-notifications";
import { PushNotifications } from "@capacitor/push-notifications";

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

async function setupPush() {
  if (didRun) {
    console.log("[mobile-push] already initialized, skipping");
    return;
  }
  didRun = true;

  console.log("[mobile-push] boot");

  try {
    const isNative = Capacitor.isNativePlatform();
    const platform = Capacitor.getPlatform();
    console.log("[mobile-push] isNativePlatform=", isNative, "platform=", platform);

    if (!isNative) {
      console.log("[mobile-push] Not running on native platform, skipping");
      return;
    }

    if (platform !== "android" && platform !== "ios") {
      console.log("[mobile-push] Unsupported platform", platform);
      return;
    }

    console.log("[mobile-push] Initializing push notifications on", platform);

    console.log(
      "[mobile-push] isPluginAvailable(PushNotifications)=",
      Capacitor.isPluginAvailable("PushNotifications")
    );

    console.log(
      "[mobile-push] Capacitor.Plugins keys=",
      Object.keys((Capacitor as any).Plugins || {})
    );

    let permStatus = await PushNotifications.checkPermissions();
    console.log("[mobile-push] Current permission status", permStatus);

    if (permStatus.receive !== "granted") {
      console.log("[mobile-push] requesting permissions");
      permStatus = await PushNotifications.requestPermissions();
      console.log("[mobile-push] Request permission result", permStatus);
    }

    if (permStatus.receive !== "granted") {
      console.warn("[mobile-push] Push permission not granted");
      return;
    }

    // Listeners primero para no perder el evento de registration
    PushNotifications.addListener("registration", async (token: Token) => {
      const shortToken = token.value ? token.value.substring(0, 12) : "<empty>";
      console.log("[mobile-push] got token", shortToken);
      await registerDeviceToken(token.value);
    });

    PushNotifications.addListener("registrationError", (error: any) => {
      console.error("[mobile-push] Registration error", error);
    });

    PushNotifications.addListener(
      "pushNotificationReceived",
      (notification: PushNotificationSchema) => {
        console.log(
          "[mobile-push] Notification received",
          JSON.stringify(notification)
        );
      }
    );

    PushNotifications.addListener(
      "pushNotificationActionPerformed",
      (action: ActionPerformed) => {
        console.log(
          "[mobile-push] Notification action performed",
          JSON.stringify(action)
        );
      }
    );

    console.log("[mobile-push] registering");
    await PushNotifications.register();
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
