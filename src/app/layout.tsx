import "./globals.css";
import Providers from "./providers";

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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

