import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <header className="relative z-20 border-b border-zinc-800/80 bg-black/60 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-700/60 bg-zinc-800 text-xs font-bold text-white">
            S
          </div>
          <span className="text-sm font-semibold tracking-tight text-white">SEDS Sri Lanka</span>
          <span className="text-xs font-normal text-zinc-500">/ Certificates</span>
        </Link>

        {/* Action */}
        <div className="flex items-center gap-3">
          {isAdmin ? (
            <Link
              to="/"
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:text-white"
            >
              Public Portal
            </Link>
          ) : (
            <Link
              to="/admin"
              className="rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-all hover:border-zinc-700 hover:text-white"
            >
              Admin
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
