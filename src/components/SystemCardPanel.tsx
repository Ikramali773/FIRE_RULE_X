'use client';

import type { SystemCard } from '@/types';

interface SystemCardPanelProps {
    cards?: SystemCard[];
}

export default function SystemCardPanel({ cards }: SystemCardPanelProps) {
    if (!cards || cards.length === 0) {
        return null;
    }

    return (
        <div>
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                📚 Triggered BIS Standards
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {cards.map((card, idx) => (
                    <div key={idx} className="card card-elevated !p-0 overflow-hidden flex flex-col h-full border-t-4 border-t-indigo-500">
                        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-2">
                            <h3 className="font-bold text-slate-800 text-sm truncate">{card.systemName}</h3>
                            <span className="badge badge-indigo text-[10px] shrink-0">{card.status}</span>
                        </div>
                        <div className="p-4 flex-1 flex flex-col gap-4">
                            <div>
                                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Triggered By</div>
                                <div className="text-xs text-slate-600 leading-relaxed">{card.triggeredBy}</div>
                            </div>
                            
                            <div>
                                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Relevant Standards</div>
                                <div className="flex flex-wrap gap-1.5">
                                    {card.relevantStandards.map(std => (
                                        <span key={std} className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded border border-slate-200 font-medium">
                                            {std}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="mt-auto grid grid-cols-1 gap-4 pt-3 border-t border-slate-100">
                                <div>
                                    <div className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider mb-1">Missing Inputs</div>
                                    <ul className="space-y-1">
                                        {card.missingInputs.map((input, i) => (
                                            <li key={i} className="text-[11px] text-slate-500 flex items-start gap-1.5">
                                                <span className="text-amber-400 text-[10px] mt-0.5">●</span>
                                                <span className="leading-tight">{input}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                
                                <div>
                                    <div className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wider mb-1">Next Steps</div>
                                    <ul className="space-y-1">
                                        {card.nextSteps.map((step, i) => (
                                            <li key={i} className="text-[11px] text-slate-600 flex items-start gap-1.5">
                                                <span className="text-emerald-400 text-[10px] mt-0.5">→</span>
                                                <span className="leading-tight">{step}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
