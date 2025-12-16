import "./globals.css";
import Providers from "./providers";
import { MobilePushClient } from "../lib/mobile/pushClient";
import Script from "next/script";

export const metadata = {
  title: {
    default: "OPENBASE",
    template: "%s — OPENBASE",
  },
  description: "App",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-white text-gray-900">
        <Script
          id="capacitor-bridge-loader"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
(function () {
  try {
    if (typeof window === "undefined") return;

    var ua = navigator.userAgent || "";
    var isAppUA = ua.includes("Capacitor") || ua.includes("com.openbase.mobile");
    if (!isAppUA) return;

    console.log("[mobile-push] loader start");

  // Flag global para indicar que capacitor.js terminó de cargar
  (window as any).__CAP_READY__ = false;

    function injectCapacitorJs() {
      if (typeof window === "undefined") return Promise.resolve();

      var w = window;
      if (w.Capacitor && w.Capacitor.Plugins) {
        console.log("[mobile-push] capacitor bridge already present");
        console.log("[mobile-push] hasBridge=", !!(w && w.Capacitor && w.Capacitor.Plugins));
        console.log(
          "[mobile-push] hasPush=",
          !!(w && w.Capacitor && w.Capacitor.Plugins && w.Capacitor.Plugins.PushNotifications)
        );
        return Promise.resolve();
      }

      var addScript = function (src) {
        return new Promise(function (resolve, reject) {
          var s = document.createElement("script");
          s.src = src;
          s.onload = function () {
            console.log("[mobile-push] loaded "+ src);
            (window as any).__CAP_READY__ = true;
            resolve();
          };
          s.onerror = function () {
            console.warn("[mobile-push] failed "+ src);
            reject(new Error("failed " + src));
          };
          document.head.appendChild(s);
        });
      };

      return addScript("capacitor://localhost/capacitor.js")
        .catch(function () { return addScript("/capacitor.js"); })
        .catch(function () { return undefined; })
        .then(function () {
          var w2 = window;
          console.log(
            "[mobile-push] hasBridge=",
            !!(w2 && w2.Capacitor && w2.Capacitor.Plugins)
          );
          console.log(
            "[mobile-push] hasPush=",
            !!(w2 && w2.Capacitor && w2.Capacitor.Plugins && w2.Capacitor.Plugins.PushNotifications)
          );
        });
    }

    // Disparar inyección de capacitor.js; setupPush se encargará del resto
    injectCapacitorJs();
  } catch (e) {
    console.warn("[mobile-push] loader error", e);
  }
})();
    `,
          }}
        />
        {/* Ejecuta la inicialización de push sólo en cliente cuando se carga la app en Capacitor */}
        <MobilePushClient />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

