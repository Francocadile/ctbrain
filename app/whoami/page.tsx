import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function WhoAmI() {
  const session = await getServerSession(authOptions);
  return (
    <pre className="p-6">{JSON.stringify(session, null, 2)}</pre>
  );
}
