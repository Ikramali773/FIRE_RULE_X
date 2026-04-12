'use client';

import type { NBCComplianceData } from '@/types';

interface NBCCompliancePanelProps {
    data?: NBCComplianceData;
}

export default function NBCCompliancePanel({ data }: NBCCompliancePanelProps) {
    if (!data || (!data.occupantLoad && !data.exitCapacity && !data.travelDistance && !data.firefightingInstallations)) {
        return null;
    }

    return (
        <div id="nbc-compliance-panel" className="card card-elevated !p-0 overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-indigo-50 to-violet-50 border-b border-indigo-100">
                <div className="flex items-center gap-2">
                    <span className="text-lg">🏛️</span>
                    <h3 className="font-bold text-slate-800">NBC 2016 Compliance</h3>
                    <span className="badge badge-info text-[10px] ml-auto">Part IV — Fire &amp; Life Safety</span>
                </div>
            </div>

            <div className="p-5 space-y-5">
                {/* Occupant Load */}
                {data.occupantLoad && (
                    <div className="rounded-xl border border-slate-100 overflow-hidden">
                        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                            <span className="text-sm">👥</span>
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Occupant Load — Table 3
                            </span>
                        </div>
                        <div className="p-4">
                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div>
                                    <div className="text-2xl font-bold text-indigo-600">
                                        {data.occupantLoad.maxOccupants}
                                    </div>
                                    <div className="text-[11px] text-slate-400 mt-0.5">
                                        Max Occupants
                                    </div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-slate-700">
                                        {data.occupantLoad.loadFactor}
                                    </div>
                                    <div className="text-[11px] text-slate-400 mt-0.5">
                                        m²/person
                                    </div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-slate-700">
                                        {data.occupantLoad.floorAreaUsed.toLocaleString()}
                                    </div>
                                    <div className="text-[11px] text-slate-400 mt-0.5">
                                        Floor Area (m²)
                                    </div>
                                </div>
                            </div>
                            <div className="mt-3 text-center">
                                <span className="badge badge-info text-[10px]">
                                    Group {data.occupantLoad.group}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Exit Capacity */}
                {data.exitCapacity && (
                    <div className="rounded-xl border border-slate-100 overflow-hidden">
                        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                            <span className="text-sm">🚪</span>
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Exit Capacity — Table 4
                            </span>
                            <span className="ml-auto text-[10px] text-slate-400">
                                {data.exitCapacity.occupantCount} occupants
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100">
                                        <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                            Component
                                        </th>
                                        <th className="px-4 py-2.5 text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                            Units Req.
                                        </th>
                                        <th className="px-4 py-2.5 text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                            Min Width
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="border-b border-slate-50">
                                        <td className="px-4 py-2.5 text-slate-600 font-medium">Stairways</td>
                                        <td className="px-4 py-2.5 text-center font-mono font-semibold text-slate-700">
                                            {data.exitCapacity.stairwayUnits}
                                        </td>
                                        <td className="px-4 py-2.5 text-center font-mono text-slate-500">
                                            {data.exitCapacity.stairwayWidthMm} mm
                                        </td>
                                    </tr>
                                    <tr className="border-b border-slate-50">
                                        <td className="px-4 py-2.5 text-slate-600 font-medium">Corridors</td>
                                        <td className="px-4 py-2.5 text-center font-mono font-semibold text-slate-700">
                                            {data.exitCapacity.corridorUnits}
                                        </td>
                                        <td className="px-4 py-2.5 text-center font-mono text-slate-500">
                                            {data.exitCapacity.corridorWidthMm} mm
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="px-4 py-2.5 text-slate-600 font-medium">Doors</td>
                                        <td className="px-4 py-2.5 text-center font-mono font-semibold text-slate-700">
                                            {data.exitCapacity.doorUnits}
                                        </td>
                                        <td className="px-4 py-2.5 text-center font-mono text-slate-500">
                                            {data.exitCapacity.doorWidthMm} mm
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Travel Distance */}
                {data.travelDistance && (
                    <div className="rounded-xl border border-slate-100 overflow-hidden">
                        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                            <span className="text-sm">📏</span>
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Travel Distance — Table 5
                            </span>
                        </div>
                        <div className="p-4">
                            {data.travelDistance.maxDistanceM === -1 ? (
                                <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-100">
                                    <p className="text-sm font-semibold text-red-700">
                                        ⛔ Construction Type NOT PERMITTED
                                    </p>
                                    <p className="text-xs text-red-500 mt-1">
                                        Type 3/4 construction is not allowed for Group {data.travelDistance.group}.
                                        Must use Type 1 or Type 2 (fire-resistive/non-combustible).
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div>
                                        <div className="text-2xl font-bold text-indigo-600">
                                            {data.travelDistance.maxDistanceM}m
                                        </div>
                                        <div className="text-[11px] text-slate-400 mt-0.5">
                                            Max Allowed
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-slate-700">
                                            {data.travelDistance.baseDistanceM}m
                                        </div>
                                        <div className="text-[11px] text-slate-400 mt-0.5">
                                            Base Distance
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-slate-700">
                                            {data.travelDistance.constructionType === 'type12' ? '1 & 2' : '3 & 4'}
                                        </div>
                                        <div className="text-[11px] text-slate-400 mt-0.5">
                                            Construction Type
                                        </div>
                                    </div>
                                </div>
                            )}
                            {data.travelDistance.sprinklerApplied && data.travelDistance.maxDistanceM !== -1 && (
                                <div className="mt-3 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100 text-center">
                                    <span className="text-xs text-emerald-600 font-medium">
                                        💧 Sprinkler bonus applied (+50%)
                                    </span>
                                </div>
                            )}
                            <div className="mt-3 text-center">
                                <span className="badge badge-info text-[10px]">
                                    Group {data.travelDistance.group}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Firefighting Installations — Table 7 */}
                {data.firefightingInstallations && (
                    <div className="rounded-xl border border-slate-100 overflow-hidden">
                        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                            <span className="text-sm">🧯</span>
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Firefighting Installations — Table 7
                            </span>
                            <span className="ml-auto text-[10px] text-slate-400">
                                {data.firefightingInstallations.occupancyLabel} · {data.firefightingInstallations.heightTierLabel}
                            </span>
                        </div>
                        <div className="p-4">
                            {/* Systems grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {([
                                    { label: 'Fire Extinguisher', key: 'fireExtinguisher', value: data.firefightingInstallations.fireExtinguisher },
                                    { label: 'Hose Reel', key: 'firstAidHoseReel', value: data.firefightingInstallations.firstAidHoseReel },
                                    { label: 'Wet Riser', key: 'wetRiser', value: data.firefightingInstallations.wetRiser },
                                    { label: 'Down Comer', key: 'downComer', value: data.firefightingInstallations.downComer },
                                    { label: 'Yard Hydrant', key: 'yardHydrant', value: data.firefightingInstallations.yardHydrant },
                                    { label: 'Sprinkler System', key: 'automaticSprinkler', value: data.firefightingInstallations.automaticSprinkler },
                                    { label: 'Manual Fire Alarm', key: 'manualFireAlarm', value: data.firefightingInstallations.manualFireAlarm },
                                    { label: 'Auto Detection', key: 'autoDetectionAlarm', value: data.firefightingInstallations.autoDetectionAlarm },
                                ] as const).map((item) => {
                                    // Find notes that apply to this field
                                    const fieldNotes = (data.firefightingInstallations.evaluatedNotes || [])
                                        .filter(n => n.field === item.key);

                                    return (
                                        <div
                                            key={item.label}
                                            className={`px-3 py-2 rounded-lg border text-center text-xs font-medium relative ${item.value
                                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                                    : 'bg-slate-50 border-slate-100 text-slate-400'
                                                }`}
                                        >
                                            <span className="mr-1">{item.value ? '✅' : '—'}</span>
                                            {item.label}
                                            {/* Show note badges */}
                                            {fieldNotes.length > 0 && (
                                                <div className="mt-1.5 flex flex-wrap gap-1 justify-center">
                                                    {fieldNotes.map((note, idx) => (
                                                        <span
                                                            key={`${note.noteId}-${idx}`}
                                                            title={note.description}
                                                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold cursor-help ${
                                                                note.isMet
                                                                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                                                    : 'bg-amber-50 text-amber-600 border border-amber-200'
                                                            }`}
                                                        >
                                                            {note.isMet ? '✓' : '✗'} Note {note.noteId}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Tank & Pump specs */}
                            {(data.firefightingInstallations.undergroundTankLitres ||
                                data.firefightingInstallations.terraceTankLitres ||
                                data.firefightingInstallations.undergroundPumpLpm ||
                                data.firefightingInstallations.terracePumpLpm) && (
                                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                                        {data.firefightingInstallations.undergroundTankLitres && (
                                            <div>
                                                <div className="text-lg font-bold text-indigo-600">
                                                    {(data.firefightingInstallations.undergroundTankLitres / 1000).toLocaleString()}k
                                                </div>
                                                <div className="text-[10px] text-slate-400">UG Tank (L)</div>
                                            </div>
                                        )}
                                        {data.firefightingInstallations.terraceTankLitres && (
                                            <div>
                                                <div className="text-lg font-bold text-indigo-600">
                                                    {(data.firefightingInstallations.terraceTankLitres / 1000).toLocaleString()}k
                                                </div>
                                                <div className="text-[10px] text-slate-400">Terrace Tank (L)</div>
                                            </div>
                                        )}
                                        {data.firefightingInstallations.undergroundPumpLpm && (
                                            <div>
                                                <div className="text-lg font-bold text-slate-700">
                                                    {data.firefightingInstallations.undergroundPumpLpm.toLocaleString()}
                                                </div>
                                                <div className="text-[10px] text-slate-400">UG Pump (L/min)</div>
                                            </div>
                                        )}
                                        {data.firefightingInstallations.terracePumpLpm && (
                                            <div>
                                                <div className="text-lg font-bold text-slate-700">
                                                    {data.firefightingInstallations.terracePumpLpm.toLocaleString()}
                                                </div>
                                                <div className="text-[10px] text-slate-400">Terrace Pump (L/min)</div>
                                            </div>
                                        )}
                                    </div>
                                )}

                            {/* Evaluated Notes Section */}
                            {data.firefightingInstallations.evaluatedNotes &&
                                data.firefightingInstallations.evaluatedNotes.length > 0 && (
                                    <div className="mt-4 rounded-lg border border-slate-100 overflow-hidden">
                                        <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
                                            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                                📋 Applicable Notes (Table 7)
                                            </span>
                                        </div>
                                        <div className="divide-y divide-slate-50">
                                            {data.firefightingInstallations.evaluatedNotes.map((note, idx) => (
                                                <div
                                                    key={`${note.noteId}-${idx}`}
                                                    className={`px-3 py-2 flex items-start gap-2 ${
                                                        note.isMet ? 'bg-emerald-50/30' : 'bg-white'
                                                    }`}
                                                >
                                                    <span className={`text-xs font-bold mt-0.5 shrink-0 ${
                                                        note.isMet ? 'text-emerald-600' : 'text-amber-500'
                                                    }`}>
                                                        {note.isMet ? '✓' : '✗'}
                                                    </span>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                                                note.isMet
                                                                    ? 'bg-emerald-100 text-emerald-700'
                                                                    : 'bg-amber-100 text-amber-700'
                                                            }`}>
                                                                Note {note.noteId}
                                                            </span>
                                                            <span className={`text-[10px] font-medium ${
                                                                note.isMet ? 'text-emerald-600' : 'text-amber-500'
                                                            }`}>
                                                                {note.isMet ? 'CONDITION MET' : 'CONDITION NOT MET'}
                                                            </span>
                                                            {note.additionalValue && (
                                                                <span className="text-[10px] text-slate-400">
                                                                    {note.isMet ? `(+${note.additionalValue.toLocaleString()})` : `(+${note.additionalValue.toLocaleString()} if met)`}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                                                            {note.description}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
