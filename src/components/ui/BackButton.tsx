"use client";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
export default function BackButton() {
  return (
    <button onClick={() => window.history.back()} className="absolute left-6 top-8 flex items-center text-gray-600 hover:text-blue-600">
      <ArrowLeftIcon className="h-5 w-5 mr-1" /> Volver
    </button>
  );
}
