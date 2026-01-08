// src/app/ct/layout.tsx
import * as React from "react";
import { Suspense } from "react";
import CtLayoutClient from "./CtLayoutClient";

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div className="p-4" />}>
      <CtLayoutClient>{children}</CtLayoutClient>
    </Suspense>
  );
}
