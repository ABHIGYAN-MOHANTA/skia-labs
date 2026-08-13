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
            <Link href="/#gallery" className="text-zinc-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">
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
              href="/#gallery" 
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
