import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isSuperadmin } from "@/lib/auth-helpers";

export default async function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!isSuperadmin(session)) return null;
  return <>{children}</>;
}
