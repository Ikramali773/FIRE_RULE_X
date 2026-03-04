'use client';

import type { ExtinguisherRequirement } from '@/types';

interface ExtinguisherTableProps {
    requirements: ExtinguisherRequirement[];
}

const classColors: Record<string, string> = {
    A: '#EF4444',
    B: '#F59E0B',
    C: '#3B82F6',
    D: '#8B5CF6',
    F: '#10B981',
};

export default function ExtinguisherTable({ requirements }: ExtinguisherTableProps) {
    if (requirements.length === 0) {
        return (
            <div className="card text-center text-slate-400 py-8">
                No extinguisher requirements calculated.
            </div>
        );
    }

    return (
        <div className="card overflow-hidden !p-0">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-100">
                <h3 className="font-bold text-slate-700">🧯 Required Extinguishers</h3>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-100">
                            <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                Class
                            </th>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                Min Rating
                            </th>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                Count
                            </th>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                Clause
                            </th>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                Note
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {requirements.map((req, i) => (
                            <tr
                                key={`${req.fireClass}-${i}`}
                                className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                            >
                                <td className="px-5 py-3">
                                    <span
                                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-white font-bold text-sm"
                                        style={{ backgroundColor: classColors[req.fireClass] || '#94A3B8' }}
                                    >
                                        {req.fireClass}
                                    </span>
                                </td>
                                <td className="px-5 py-3 font-mono font-semibold text-slate-700">
                                    {req.minimumRating}
                                </td>
                                <td className="px-5 py-3 text-slate-600">
                                    {req.countRequired}
                                    {req.perFloor && (
                                        <span className="text-xs text-slate-400 ml-1">/floor</span>
                                    )}
                                </td>
                                <td className="px-5 py-3 text-xs text-slate-400 font-mono">
                                    {req.clauseRef}
                                </td>
                                <td className="px-5 py-3 text-xs text-slate-400">
                                    {req.note || '—'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
