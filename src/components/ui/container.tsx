import type { ReactNode } from "react";

export default function Container({
  children,
  className = ""
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`mx-auto w-full max-w-5xl px-4 ${className}`}>{children}</div>;
}
