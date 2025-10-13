import { PropsWithChildren } from "react";

export default function Container({ children }: PropsWithChildren) {
  return (
  <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 bg-base-50">
      {children}
    </div>
  );
}
