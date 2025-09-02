// src/components/HelpTip.tsx
"use client";

import { useState } from "react";

export default function HelpTip({ text, className = "" }: { text: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className={relative inline-flex items-center ${className}}
          onMouseEnter={()=>setOpen(true)} onMouseLeave={()=>setOpen(false)}>
      <span
        aria-label="Ayuda"
        className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full border text-[10px] leading-none text-gray-700 bg-white hover:bg-gray-50"
      >?</span>
      {open && (
        <span className="absolute z-20 left-1/2 -translate-x-1/2 top-5 w-56 text-[11px] rounded-md border bg-white px-2 py-1 shadow-md text-gray-700">
          {text}
        </span>
      )}
    </span>
  );
}
