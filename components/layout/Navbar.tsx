"use client";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useCompareStore } from "@/stores/compare.store";
import { useState } from "react";

export default function Navbar() {
  const { data: session } = useSession();
  const { colleges: compareList } = useCompareStore();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-ink-950 border-b border-ink-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="w-8 h-8 rounded-full bg-gold-500 seal-sheen ring-4 ring-gold-700/30 flex items-center justify-center text-ink-950 font-mono-label font-bold text-xs">CV</span>
            <span className="font-display font-semibold text-lg text-paper tracking-tight group-hover:text-gold-100 transition-colors">CollegeVerse</span>
          </Link>

          <div className="hidden md:flex items-center gap-7">
            <Link href="/" className="text-sm font-medium text-ink-200 hover:text-gold-100 transition-colors">Colleges</Link>
            <Link href="/community" className="text-sm font-medium text-ink-200 hover:text-gold-100 transition-colors">Community</Link>
            <Link href="/predictor" className="text-sm font-medium text-ink-200 hover:text-gold-100 transition-colors">Predictor</Link>
            <Link href={compareList.length ? `/compare?ids=${compareList.map((c) => c.id).join(",")}` : "/compare"} className="relative text-sm font-medium text-ink-200 hover:text-gold-100 transition-colors">
              Compare
              {compareList.length > 0 && (
                <span className="absolute -top-2 -right-4 bg-gold-500 text-ink-950 text-[10px] font-mono-label font-bold rounded-full w-4 h-4 flex items-center justify-center">{compareList.length}</span>
              )}
            </Link>
            {session ? (
              <>
                <Link href="/saved" className="text-sm font-medium text-ink-200 hover:text-gold-100 transition-colors">Saved</Link>
                <span className="text-sm text-ink-400">{session.user.name || session.user.email}</span>
                <button onClick={() => signOut()} className="text-sm font-medium text-ink-400 hover:text-clay-600 transition-colors">Sign out</button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium text-ink-200 hover:text-gold-100 transition-colors">Log in</Link>
                <Link href="/signup" className="text-sm font-semibold bg-gold-500 text-ink-950 px-4 py-2 rounded-full hover:bg-gold-600 transition-colors">Sign up</Link>
              </>
            )}
          </div>

          <button className="md:hidden p-2 rounded-lg text-ink-200" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={menuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden pb-4 flex flex-col gap-3 border-t border-ink-700 pt-3">
            <Link href="/" className="text-sm font-medium text-ink-200 py-1">Colleges</Link>
            <Link href="/community" className="text-sm font-medium text-ink-200 py-1">Community</Link>
            <Link href="/predictor" className="text-sm font-medium text-ink-200 py-1">Predictor</Link>
            <Link href={compareList.length ? `/compare?ids=${compareList.map((c) => c.id).join(",")}` : "/compare"} className="text-sm font-medium text-ink-200 py-1">Compare {compareList.length > 0 && `(${compareList.length})`}</Link>
            {session ? (
              <>
                <Link href="/saved" className="text-sm font-medium text-ink-200 py-1">Saved</Link>
                <button onClick={() => signOut()} className="text-sm font-medium text-left text-clay-600 py-1">Sign out</button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium text-ink-200 py-1">Log in</Link>
                <Link href="/signup" className="text-sm font-medium text-gold-500 py-1">Sign up</Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}