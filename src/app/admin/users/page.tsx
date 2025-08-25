// Server Component: evita prerender estático de una página cliente que usa useSession
export const dynamic = "force-dynamic";
export const revalidate = 0;

import ClientUsers from "./ClientUsers";

export default function Page() {
  return <ClientUsers />;
}
