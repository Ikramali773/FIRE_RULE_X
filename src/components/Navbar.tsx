'use client';

import Link from 'next/link';

export default function Navbar() {
    return (
        <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-white/80 border-b border-slate-100">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 group">
                        <span className="text-2xl">🔥</span>
                        <span className="text-xl font-bold text-slate-800 group-hover:text-orange-500 transition-colors">
                            Fire<span className="gradient-text">RuleX</span>
                        </span>
                    </Link>

                    {/* Nav links */}
                    <div className="flex items-center gap-6">
                        <a
                            href="#how-it-works"
                            className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
                        >
                            How It Works
                        </a>
                        <a
                            href="#upload"
                            className="btn-primary text-sm !py-2 !px-4"
                        >
                            Check Compliance
                        </a>
                    </div>
                </div>
            </div>
        </nav>
    );
}
