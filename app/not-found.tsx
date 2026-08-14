import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] bg-zinc-950 text-white px-4 text-center selection:bg-pink-500/30">
      <h2 className="text-9xl font-black bg-gradient-to-r from-pink-500 to-blue-500 bg-clip-text text-transparent mb-2 tracking-tighter">
        404
      </h2>
      <h3 className="text-2xl font-bold mb-6 text-zinc-200 tracking-tight">Lost in the void</h3>
      <p className="text-zinc-400 max-w-md mb-10 text-lg leading-relaxed">
        We couldn't find the page or shader you were looking for. It might have been moved, deleted, or never existed in the first place.
      </p>
      <Link
        href="/"
        className="px-8 py-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-sm font-medium transition-all hover:scale-105 active:scale-95 shadow-xl"
      >
        Return to Home
      </Link>
    </div>
  );
}
