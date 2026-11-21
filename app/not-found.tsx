import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 text-center">
      <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">404 - Page Not Found</h2>
      <p className="mt-2 text-sm text-slate-400">The requested page could not be found.</p>
      <Link
        href="/"
        className="mt-6 px-4 py-2 rounded-xl bg-teal-700 text-white font-semibold text-xs transition-colors hover:bg-teal-600"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}
