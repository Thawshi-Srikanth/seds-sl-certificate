import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <header className="relative z-20 border-b border-zinc-800 bg-[#09090b]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 transition-opacity hover:opacity-90">
          <img
            src="/sedsl-l-icon.png"
            alt="SEDS Sri Lanka"
            className="h-8 w-8 object-contain bg-zinc-900 border border-zinc-700 p-0.5"
          />
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-bold tracking-wider text-[#DFDFDE] uppercase">SEDS Sri Lanka</span>
            <span className="text-xs font-mono text-[#3B82F6]">/ VERIFY</span>
          </div>
        </Link>

        {/* Action */}
        <div className="flex items-center gap-3">
          {isAdmin ? (
            <Link
              to="/"
              className="btn-secondary-sharp px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors"
            >
              Public Portal
            </Link>
          ) : (
            <a
              href="mailto:info@sedsl.org"
              className="btn-secondary-sharp px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors hover:text-white flex items-center gap-1.5"
            >
              Support
            </a>
          )}
        </div>
      </div>
    </header>
  );
};
