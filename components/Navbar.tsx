'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

function UserAvatar({ user, size = 'sm' }: { user: any, size?: 'sm' | 'md' }) {
  const [imgError, setImgError] = useState(false);
  const sizeClasses = size === 'md' ? 'w-10 h-10' : 'w-8 h-8';

  if (user.photoURL && !imgError) {
    return (
      <img
        src={user.photoURL}
        alt="Profile"
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
        className={`${sizeClasses} rounded-full border border-white/20`}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div className={`${sizeClasses} rounded-full border border-white/20 bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold shadow-inner`}>
      {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
    </div>
  );
}

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, signIn, signOut } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-extrabold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                Skia Labs
              </span>
            </Link>
          </div>

          {/* Center: Navigation (desktop) */}
          <div className="hidden md:flex flex-1 items-center justify-center space-x-8">
            <Link href="/" className="text-zinc-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">
              Home
            </Link>
            <Link href="/examples" className="text-zinc-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">
              Examples
            </Link>
            <Link href="/community" className="text-zinc-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">
              Community
            </Link>
          </div>

          {/* Right: Actions (desktop) */}
          <div className="hidden md:flex flex-shrink-0 items-center space-x-4">
            <Link href="/editor" className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-full hover:bg-purple-700 transition-colors shadow-lg shadow-purple-500/20">
              Launch Editor
            </Link>

            <div className="h-6 w-px bg-white/10 mx-2"></div>

            {user ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <UserAvatar user={user} size="sm" />
                  <span className="text-sm font-medium text-zinc-300">{user.displayName || 'User'}</span>
                </div>
                <button
                  onClick={signOut}
                  className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={signIn}
                className="px-4 py-2 border border-zinc-700 text-zinc-300 text-sm font-medium rounded-full hover:bg-white/5 hover:text-white transition-colors"
              >
                Sign In
              </button>
            )}

            <div className="h-6 w-px bg-white/10 mx-2"></div>

            <a
              href="https://github.com/ABHIGYAN-MOHANTA/skia-labs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 hover:text-zinc-200 flex items-center justify-center hover:scale-105 transition-all duration-75"
              aria-label="GitHub Repository"
            >
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 26 26" aria-hidden="true">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
            </a>
          </div>

          {/* Mobile Menu Button */}
          <div className="-mr-2 flex md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-800 focus:ring-white transition-colors"
              aria-controls="mobile-menu"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {!isMobileMenuOpen ? (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-white/10" id="mobile-menu">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link
              href="/"
              className="text-zinc-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              href="/examples"
              className="text-zinc-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Examples
            </Link>
            <Link
              href="/community"
              className="text-zinc-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Community
            </Link>
            <a
              href="https://github.com/ABHIGYAN-MOHANTA/skia-labs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-300 hover:text-white flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              GitHub
            </a>
            <Link
              href="/editor"
              className="text-purple-400 hover:text-purple-300 block px-3 py-2 rounded-md text-base font-bold mt-4"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Launch Editor
            </Link>

            <div className="border-t border-white/10 mt-4 pt-4 pb-2">
              {user ? (
                <div className="px-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <UserAvatar user={user} size="md" />
                    <span className="text-base font-medium text-zinc-300">{user.displayName || 'User'}</span>
                  </div>
                  <button
                    onClick={() => {
                      signOut();
                      setIsMobileMenuOpen(false);
                    }}
                    className="text-sm font-medium text-zinc-400 hover:text-white px-3 py-2"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    signIn();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full mt-2 px-4 py-2 border border-zinc-700 text-zinc-300 text-base font-medium rounded-md hover:bg-white/5 hover:text-white transition-colors"
                >
                  Sign In with Google
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
