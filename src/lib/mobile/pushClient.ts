"use client";

import { useEffect } from "react";

// Evitar doble ejecución por StrictMode / remounts en React
let didRun = false;

function getCap() {
  return (window as any)?.Capacitor;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForCapReady() {
  for (let i = 0; i < 50; i++) {
    if ((window as any).__CAP_READY__ && (window as any).Capacitor) return true;
    await sleep(200);
  }
  return false;
}

export async function setupPush() {
  console.log("[mobile-push] boot");

  const ok = await waitForCapReady();
  const Cap = getCap();

  console.log(
    "[mobile-push] capReady=",
    (window as any).__CAP_READY__,
    "cap=",
    !!(window as any).Capacitor
  );
  console.log("[mobile-push] hasCap=", !!Cap, "hasNative=", !!(window as any)?.CapacitorNative);
  console.log("[mobile-push] platform=", Cap?.getPlatform?.(), "isNative=", Cap?.isNativePlatform?.());

  if (!ok || !Cap?.isNativePlatform?.()) return;

  if (didRun) {
    console.log("[mobile-push] already initialized, skipping");
    return;
  }
  didRun = true;

  // IMPORTANT: usar el proxy desde window.Capacitor
  const Push = Cap?.Plugins?.PushNotifications;

  console.log("[mobile-push] plugins keys=", Object.keys(Cap?.Plugins ?? {}));
  console.log("[mobile-push] hasPush=", !!Push);

  if (!Push) {
    console.error("[mobile-push] PushNotifications proxy missing on window.Capacitor");
    return;
  }

  try {
    const perm = await Push.requestPermissions();
    console.log("[mobile-push] perm", perm);

    await Push.register();
    console.log("[mobile-push] registering…");

    Push.addListener("registration", async (token: any) => {
      console.log("[mobile-push] token", token?.value);

      await fetch("/api/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token?.value,
          platform: Cap.getPlatform(),
        }),
      });

      console.log("[mobile-push] posted /api/devices");
    });

    Push.addListener("registrationError", (err: any) => {
      console.error("[mobile-push] registrationError", err);
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
