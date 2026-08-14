'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Skia Labs Application Error:', error);
    fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: error.message, stack: error.stack })
    }).catch(console.error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] bg-zinc-950 text-white px-4 text-center selection:bg-pink-500/30">
      <div className="w-20 h-20 mb-8 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20 shadow-[0_0_40px_-10px_rgba(239,68,68,0.3)]">
        <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 className="text-4xl font-bold mb-4 tracking-tight">Something went wrong!</h2>
      <p className="text-zinc-400 max-w-md mb-10 leading-relaxed text-lg">
        We've encountered an unexpected error while trying to render this page or shader.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={() => reset()}
          className="px-8 py-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-sm font-medium transition-all hover:scale-105 active:scale-95 shadow-lg"
        >
          Try again
        </button>
        <a 
          href="/"
          className="px-8 py-4 bg-gradient-to-r from-pink-500 to-blue-500 hover:from-pink-600 hover:to-blue-600 rounded-xl text-sm font-medium transition-all hover:scale-105 active:scale-95 text-white shadow-[0_0_30px_-5px_rgba(236,72,153,0.4)]"
        >
          Return Home
        </a>
      </div>
    </div>
  );
}
