import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <h1 className="text-xl font-semibold text-gray-100 mb-2">
        Page not found
      </h1>
      <p className="text-gray-500 text-sm mb-4">
        This page doesn&apos;t exist or has been removed.
      </p>
      <Link
        href="/"
        className="text-sm text-indigo-400 hover:text-indigo-300"
      >
        Back to board
      </Link>
    </div>
  );
}
