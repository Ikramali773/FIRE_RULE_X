'use client';

import type { Violation } from '@/types';

interface ViolationCardProps {
    violation: Violation;
}

export default function ViolationCard({ violation }: ViolationCardProps) {
    const severityBadge = {
        high: 'badge-severity-high',
        medium: 'badge-severity-medium',
        low: 'badge-severity-low',
    }[violation.severity];

    return (
        <div
            id={`violation-${violation.ruleId}`}
            className="card border-l-4 hover:shadow-md transition-shadow"
            style={{
                borderLeftColor:
                    violation.severity === 'high'
                        ? '#EF4444'
                        : violation.severity === 'medium'
                            ? '#F59E0B'
                            : '#3B82F6',
            }}
        >
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                    <span className={`badge ${severityBadge}`}>{violation.severity}</span>
                    <span className="text-xs text-slate-400 font-mono">{violation.clauseRef}</span>
                </div>
                <span className="text-xs font-mono text-slate-300">{violation.ruleId}</span>
            </div>

            <p className="text-sm text-slate-700 mb-3">{violation.description}</p>

            <div className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-100">
                <p className="text-xs font-semibold text-emerald-700 mb-1">💡 Fix Suggestion</p>
                <p className="text-sm text-emerald-600">{violation.fixSuggestion}</p>
            </div>
        </div>
    );
}
