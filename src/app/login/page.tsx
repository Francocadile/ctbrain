// src/app/login/page.tsx
'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

// Evita que Next intente prerender estáticamente esta página
export const dynamic = 'force-dynamic';

function LoginContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/';

  // ⬇⬇⬇ Poné acá TU UI real del login (lo que ya tenías).
  // Dejo un markup básico para que compile y puedas adaptar.
  return (
    <main style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
      <div style={{ width: 360, maxWidth: '90%' }}>
        <h1 style={{ marginBottom: 12 }}>Iniciar sesión</h1>
        <form method="post" action="/api/auth/signin/credentials">
          <input
            type="hidden"
            name="callbackUrl"
            value={callbackUrl}
          />
          <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
            <input name="email" type="email" placeholder="Email" required />
            <input name="password" type="password" placeholder="Password" required />
          </div>
          <button type="submit">Entrar</button>
        </form>
      </div>
    </main>
  );
}

export default function Page() {
  // Suspense envuelve el uso de useSearchParams (CSR bailout)
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}

