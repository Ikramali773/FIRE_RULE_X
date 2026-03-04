export default function Footer() {
    return (
        <footer className="bg-slate-900 text-slate-400 py-12 mt-20">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">🔥</span>
                        <span className="text-white font-bold">
                            Fire<span className="text-orange-400">RuleX</span>
                        </span>
                    </div>

                    <p className="text-sm text-center md:text-right max-w-md">
                        IS 2190:2024 compliance checking tool for commercial buildings.
                        AI-powered analysis — verify results with a qualified fire safety professional.
                    </p>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
                    <p>© {new Date().getFullYear()} FireRuleX. For informational purposes only.</p>
                    <p>Not a substitute for professional fire safety audit.</p>
                </div>
            </div>
        </footer>
    );
}
