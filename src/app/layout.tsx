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
    // Marcar como no listo por defecto
    window.__CAP_READY__ = false;

    function addScript(src) {
      return new Promise(function (resolve, reject) {
        var s = document.createElement('script');
        s.src = src;
        s.onload = function () { resolve(); };
        s.onerror = function () { reject(new Error('failed ' + src)); };
        document.head.appendChild(s);
      });
    }

    function alreadyReady() {
      return !!(window.Capacitor && (window.Capacitor.Plugins || window.CapacitorNative));
    }

    if (alreadyReady()) {
      window.__CAP_READY__ = true;
      return;
    }

    addScript('capacitor://localhost/capacitor.js')
      .catch(function () { return addScript('/capacitor.js'); })
      .then(function () { window.__CAP_READY__ = true; })
      .catch(function () { window.__CAP_READY__ = false; });
  } catch (e) {
    window.__CAP_READY__ = false;
    console.log('[mobile-push] loader exception', e);
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

