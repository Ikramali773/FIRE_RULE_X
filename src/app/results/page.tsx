'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ComplianceScore from '@/components/ComplianceScore';
import ViolationCard from '@/components/ViolationCard';
import ExtinguisherTable from '@/components/ExtinguisherTable';
import NBCCompliancePanel from '@/components/NBCCompliancePanel';
import type { AnalyzeResponse } from '@/types';
import nbcData from '@/data/nbc_building_classification.json';

function ResultsContent() {
    const router = useRouter();
    const [data, setData] = useState<AnalyzeResponse | null>(null);

    useEffect(() => {
        const stored = sessionStorage.getItem('firerulx_result');
        if (!stored) {
            router.push('/');
            return;
        }
        try {
            setData(JSON.parse(stored));
        } catch {
            router.push('/');
        }
    }, [router]);

    if (!data) {
        return (
            <main className="min-h-screen bg-[var(--background)] flex items-center justify-center">
                <div className="spinner spinner-lg"></div>
            </main>
        );
    }

    const { extraction, analysis, confidence, meta } = data;

    // Sort violations: high → medium → low
    const sortedViolations = [...analysis.violations].sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        return order[a.severity] - order[b.severity];
    });

    return (
        <div className="pt-24 pb-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">
                            {extraction.buildingName || 'Analysis Results'}
                        </h1>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className="badge badge-info">{analysis.hazardType} hazard</span>
                            <span className="badge badge-info">{meta.aiProvider !== 'none' ? 'AI Vision' : 'Manual Input'}</span>
                            {meta.wasConverted && (
                                <span className="badge badge-warning">Converted from {meta.originalFormat.toUpperCase()}</span>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => router.push('/')} className="btn-secondary text-sm !py-2">
                            ← Upload Another
                        </button>
                    </div>
                </div>

                {/* Main grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left column: Score */}
                    <div className="lg:col-span-1">
                        <div className="card card-elevated text-center py-8 sticky top-24">
                            <ComplianceScore
                                score={analysis.complianceScore}
                                grade={analysis.grade}
                                nocReadiness={analysis.nocReadiness}
                            />

                            {/* Confidence info */}
                            {confidence.flags.length > 0 && (
                                <div className="mt-6 pt-4 border-t border-slate-100 text-left">
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                        ⚠️ Confidence Notes
                                    </p>
                                    <ul className="space-y-1">
                                        {confidence.flags.map((flag, i) => (
                                            <li key={i} className="text-xs text-amber-600">• {flag}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Summary stats */}
                            <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3 text-center">
                                <div>
                                    <div className="text-2xl font-bold text-slate-700">
                                        {analysis.requiredExtinguishers.length}
                                    </div>
                                    <div className="text-xs text-slate-400">Requirements</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-slate-700">
                                        {analysis.violations.length}
                                    </div>
                                    <div className="text-xs text-slate-400">Violations</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right column: Details */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Building Information Card */}
                        <div className="card card-elevated">
                            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                🏢 Building Information
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 col-span-2 md:col-span-1">
                                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Building Type</div>
                                    <div className="font-semibold text-slate-800">{extraction.buildingType || 'Unknown'}</div>
                                    <div className="text-[10px] text-slate-400 mt-1">
                                        Class {extraction.occupancyGroup}
                                        {extraction.occupancyGroup && (nbcData.occupancyGroups as any)[extraction.occupancyGroup]
                                            ? ` - ${(nbcData.occupancyGroups as any)[extraction.occupancyGroup].label}`
                                            : ''}
                                        {extraction.occupancyGroup && extraction.occupancySubdivision && (nbcData.occupancyGroups as any)[extraction.occupancyGroup]?.subdivisions?.[extraction.occupancySubdivision]
                                            ? ` (${extraction.occupancySubdivision}: ${(nbcData.occupancyGroups as any)[extraction.occupancyGroup].subdivisions[extraction.occupancySubdivision].label})`
                                            : extraction.occupancySubdivision ? ` (${extraction.occupancySubdivision})` : ''}
                                    </div>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Occupant Load</div>
                                    <div className="font-semibold text-slate-800">
                                        {analysis.nbcCompliance?.occupantLoad?.totalOccupants
                                            ? analysis.nbcCompliance.occupantLoad.totalOccupants.toLocaleString()
                                            : extraction.occupantCount ? extraction.occupantCount.toLocaleString() : 'N/A'}
                                    </div>
                                    <div className="text-[10px] text-slate-400 mt-1">persons (total)</div>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Height</div>
                                    <div className="font-semibold text-slate-800">{extraction.buildingHeight}m</div>
                                    <div className="text-[10px] text-slate-400 mt-1">{extraction.numberOfFloors} Floors</div>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Area</div>
                                    <div className="font-semibold text-slate-800">{extraction.totalFloorArea ? extraction.totalFloorArea.toLocaleString() : 'N/A'}</div>
                                    <div className="text-[10px] text-slate-400 mt-1">m²</div>
                                </div>
                            </div>
                        </div>

                        {/* Violations */}
                        {sortedViolations.length > 0 && (
                            <div>
                                <h2 className="text-lg font-bold text-slate-800 mb-4">
                                    ⚠️ Violations ({sortedViolations.length})
                                </h2>
                                <div className="space-y-3">
                                    {sortedViolations.map((v) => (
                                        <ViolationCard key={v.ruleId} violation={v} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* NBC Compliance */}
                        <NBCCompliancePanel data={analysis.nbcCompliance} />

                        {/* Passed rules */}
                        {analysis.passedRules.length > 0 && (
                            <div>
                                <h2 className="text-lg font-bold text-slate-800 mb-4">
                                    ✅ Passed Checks ({analysis.passedRules.length})
                                </h2>
                                <div className="card">
                                    <ul className="space-y-2">
                                        {analysis.passedRules.map((rule, i) => (
                                            <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                                                <span className="text-emerald-500 mt-0.5">✓</span>
                                                {rule}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}

                        {/* Extinguisher requirements */}
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 mb-4">
                                🧯 Required Equipment
                            </h2>
                            <ExtinguisherTable requirements={analysis.requiredExtinguishers} />
                        </div>

                        {/* Analysis metadata */}
                        <div className="card bg-slate-50 border-slate-100">
                            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                                Analysis Details
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                                <div>
                                    <span className="text-slate-400 text-xs">File</span>
                                    <p className="text-slate-600 font-medium truncate">{meta.fileName}</p>
                                </div>
                                <div>
                                    <span className="text-slate-400 text-xs">Area</span>
                                    <p className="text-slate-600 font-medium">{extraction.totalFloorArea} m²</p>
                                </div>
                                <div>
                                    <span className="text-slate-400 text-xs">Floors</span>
                                    <p className="text-slate-600 font-medium">{extraction.numberOfFloors}</p>
                                </div>
                                <div>
                                    <span className="text-slate-400 text-xs">Analyzed</span>
                                    <p className="text-slate-600 font-medium">
                                        {new Date(meta.analyzedAt).toLocaleTimeString()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ResultsPage() {
    return (
        <main className="min-h-screen bg-[var(--background)]">
            <Navbar />
            <Suspense fallback={
                <div className="pt-32 pb-8 flex flex-col items-center justify-center">
                    <div className="spinner mb-4"></div>
                    <p className="text-slate-500">Loading results...</p>
                </div>
            }>
                <ResultsContent />
            </Suspense>
            <Footer />
        </main>
    );
}
