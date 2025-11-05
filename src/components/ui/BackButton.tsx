"use client";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
export default function BackButton({ label = "Volver atrás" }: { label?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md shadow hover:bg-gray-300 transition font-semibold mb-4 flex items-center"
    >
      <ArrowLeftIcon className="h-5 w-5 mr-1" /> {label}
    </button>
  );
}
