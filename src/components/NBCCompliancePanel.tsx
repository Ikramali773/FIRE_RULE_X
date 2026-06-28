'use client';

import { useState } from 'react';
import type { NBCComplianceData } from '@/types';

interface NBCCompliancePanelProps {
    data?: NBCComplianceData;
}

export default function NBCCompliancePanel({ data }: NBCCompliancePanelProps) {
    const [showFloorOccupants, setShowFloorOccupants] = useState(false);
    const [showFloorExits, setShowFloorExits] = useState(false);
    const [showFloorDetectors, setShowFloorDetectors] = useState(false);

    if (!data || (!data.occupantLoad && !data.exitCapacity && !data.travelDistance && !data.firefightingInstallations && !data.detectorCounts)) {
        return null;
    }

    const { occupantLoad, exitCapacity, travelDistance, firefightingInstallations, detectorCounts } = data;

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
                {/* ── NBCS 2026 Applicability (Phase 1 Tracking Layer) ── */}
                {data.nbcsApplicability && (
                    <div className="rounded-xl border border-slate-100 overflow-hidden">
                        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                            <span className="text-sm">📋</span>
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                NBCS 2026 Part F Applicability
                            </span>
                            {data.nbcsApplicability.isApplicable ? (
                                <span className="badge badge-success text-[10px] ml-auto">APPLICABLE</span>
                            ) : (
                                <span className="badge badge-warning text-[10px] ml-auto">NOT APPLICABLE</span>
                            )}
                        </div>
                        <div className="p-4 bg-white">
                            <div className="flex flex-col gap-2">
                                <p className="text-sm text-slate-700">
                                    {data.nbcsApplicability.reason}
                                </p>
                                <div className="flex items-center gap-4 mt-2 border-t border-slate-100 pt-3">
                                    <div className="text-xs text-slate-500">
                                        <span className="font-semibold text-slate-700">Occupancy:</span> {data.nbcsApplicability.occupancyLabel}
                                    </div>
                                    <div className="text-xs text-slate-500 border-l border-slate-200 pl-4">
                                        <span className="font-semibold text-slate-700">Clause:</span> {data.nbcsApplicability.clauseRef}
                                    </div>
                                    <div className="text-[10px] text-slate-400 border-l border-slate-200 pl-4">
                                        (Tracking layer only — calculation logic remains NBC 2016)
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Occupant Load ── */}
                {occupantLoad && (
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
                                        {occupantLoad.totalOccupants}
                                    </div>
                                    <div className="text-[11px] text-slate-400 mt-0.5">Total Occupants</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-slate-700">
                                        {occupantLoad.loadFactor}
                                    </div>
                                    <div className="text-[11px] text-slate-400 mt-0.5">m²/person</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-slate-700">
                                        {occupantLoad.floorAreaUsed.toLocaleString()}
                                    </div>
                                    <div className="text-[11px] text-slate-400 mt-0.5">Total Area (m²)</div>
                                </div>
                            </div>
                            <div className="mt-3 text-center">
                                <span className="badge badge-info text-[10px]">Group {occupantLoad.group}</span>
                                <span className="ml-2 text-[10px] text-slate-400">
                                    Max single floor: {occupantLoad.maxOccupants} persons
                                </span>
                            </div>

                            {/* Floor-wise breakdown */}
                            {occupantLoad.floorWise && occupantLoad.floorWise.length > 0 && (
                                <div className="mt-3">
                                    <button
                                        onClick={() => setShowFloorOccupants(!showFloorOccupants)}
                                        className="text-xs text-indigo-500 hover:text-indigo-600 font-medium transition-colors"
                                    >
                                        {showFloorOccupants ? '▾ Hide' : '▸ Show'} floor-wise breakdown
                                    </button>
                                    {showFloorOccupants && (
                                        <table className="w-full text-sm mt-2">
                                            <thead>
                                                <tr className="border-b border-slate-100">
                                                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-400 uppercase">Floor</th>
                                                    <th className="px-3 py-2 text-right text-[11px] font-semibold text-slate-400 uppercase">Area (m²)</th>
                                                    <th className="px-3 py-2 text-right text-[11px] font-semibold text-slate-400 uppercase">Occupants</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {occupantLoad.floorWise.map((fl) => (
                                                    <tr key={fl.floorIndex} className="border-b border-slate-50">
                                                        <td className="px-3 py-1.5 text-slate-600">{fl.floorLabel}</td>
                                                        <td className="px-3 py-1.5 text-right font-mono text-slate-500">{fl.floorArea.toLocaleString()}</td>
                                                        <td className="px-3 py-1.5 text-right font-mono font-semibold text-slate-700">{fl.occupantCount}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Exit Capacity ── */}
                {exitCapacity && (
                    <div className="rounded-xl border border-slate-100 overflow-hidden">
                        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                            <span className="text-sm">🚪</span>
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Exit Capacity — Table 4
                            </span>
                            <span className="ml-auto text-[10px] text-slate-400">
                                {exitCapacity.totalOccupantCount} total occupants
                            </span>
                        </div>
                        <div className="p-4">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                                <div>
                                    <div className="text-lg font-bold text-indigo-600">{exitCapacity.stairwayMmPerPerson}</div>
                                    <div className="text-[10px] text-slate-400">Stairway (mm/person)</div>
                                </div>
                                <div>
                                    <div className="text-lg font-bold text-indigo-600">{exitCapacity.levelMmPerPerson}</div>
                                    <div className="text-[10px] text-slate-400">Door/Corridor (mm/person)</div>
                                </div>
                                <div>
                                    <div className="text-lg font-bold text-slate-700">{exitCapacity.maxStairwayWidthMm}</div>
                                    <div className="text-[10px] text-slate-400">Max Stairway Width (mm)</div>
                                </div>
                                <div>
                                    <div className="text-lg font-bold text-slate-700">{exitCapacity.maxLevelWidthMm}</div>
                                    <div className="text-[10px] text-slate-400">Max Door/Corridor (mm)</div>
                                </div>
                            </div>

                            {/* Floor-wise exit widths */}
                            {exitCapacity.floorWise && exitCapacity.floorWise.length > 0 && (
                                <div className="mt-3">
                                    <button
                                        onClick={() => setShowFloorExits(!showFloorExits)}
                                        className="text-xs text-indigo-500 hover:text-indigo-600 font-medium transition-colors"
                                    >
                                        {showFloorExits ? '▾ Hide' : '▸ Show'} floor-wise exit widths
                                    </button>
                                    {showFloorExits && (
                                        <div className="overflow-x-auto mt-2">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b border-slate-100">
                                                        <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-400 uppercase">Floor</th>
                                                        <th className="px-3 py-2 text-right text-[11px] font-semibold text-slate-400 uppercase">Occupants</th>
                                                        <th className="px-3 py-2 text-right text-[11px] font-semibold text-slate-400 uppercase">Stairway (mm)</th>
                                                        <th className="px-3 py-2 text-right text-[11px] font-semibold text-slate-400 uppercase">Door/Corridor (mm)</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {exitCapacity.floorWise.map((fl) => (
                                                        <tr key={fl.floorIndex} className="border-b border-slate-50">
                                                            <td className="px-3 py-1.5 text-slate-600">{fl.floorLabel}</td>
                                                            <td className="px-3 py-1.5 text-right font-mono text-slate-500">{fl.occupantCount}</td>
                                                            <td className="px-3 py-1.5 text-right font-mono font-semibold text-slate-700">{fl.stairwayWidthMm}</td>
                                                            <td className="px-3 py-1.5 text-right font-mono font-semibold text-slate-700">{fl.levelWidthMm}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Sprinkler & Smoke Detector Counts ── */}
                {detectorCounts && (
                    <div className="rounded-xl border border-slate-100 overflow-hidden">
                        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                            <span className="text-sm">🔥</span>
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Sprinklers & Smoke Detectors
                            </span>
                        </div>
                        <div className="p-4">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                                <div>
                                    <div className="text-2xl font-bold text-indigo-600">{detectorCounts.totalSprinklers}</div>
                                    <div className="text-[10px] text-slate-400">Total Sprinklers</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-indigo-600">{detectorCounts.totalSmokeDetectors}</div>
                                    <div className="text-[10px] text-slate-400">Total Smoke Detectors</div>
                                </div>
                                <div>
                                    <div className="text-lg font-bold text-slate-700">{detectorCounts.sprinklerSpacingM}m</div>
                                    <div className="text-[10px] text-slate-400">Sprinkler Spacing</div>
                                </div>
                                <div>
                                    <div className="text-lg font-bold text-slate-700">{detectorCounts.smokeDetectorSpacingM}m</div>
                                    <div className="text-[10px] text-slate-400">Detector Spacing</div>
                                </div>
                            </div>
                            <div className="mt-2 text-center text-[10px] text-slate-400">
                                Coverage: {detectorCounts.sprinklerCoverageM2} m²/sprinkler · {detectorCounts.smokeDetectorCoverageM2} m²/detector
                            </div>

                            {/* Floor-wise breakdown */}
                            {detectorCounts.floorWise && detectorCounts.floorWise.length > 0 && (
                                <div className="mt-3">
                                    <button
                                        onClick={() => setShowFloorDetectors(!showFloorDetectors)}
                                        className="text-xs text-indigo-500 hover:text-indigo-600 font-medium transition-colors"
                                    >
                                        {showFloorDetectors ? '▾ Hide' : '▸ Show'} floor-wise breakdown
                                    </button>
                                    {showFloorDetectors && (
                                        <div className="overflow-x-auto mt-2">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b border-slate-100">
                                                        <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-400 uppercase">Floor</th>
                                                        <th className="px-3 py-2 text-right text-[11px] font-semibold text-slate-400 uppercase">Area (m²)</th>
                                                        <th className="px-3 py-2 text-right text-[11px] font-semibold text-slate-400 uppercase">Sprinklers</th>
                                                        <th className="px-3 py-2 text-right text-[11px] font-semibold text-slate-400 uppercase">Smoke Det.</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {detectorCounts.floorWise.map((fl) => (
                                                        <tr key={fl.floorIndex} className="border-b border-slate-50">
                                                            <td className="px-3 py-1.5 text-slate-600">{fl.floorLabel}</td>
                                                            <td className="px-3 py-1.5 text-right font-mono text-slate-500">{fl.floorArea.toLocaleString()}</td>
                                                            <td className="px-3 py-1.5 text-right font-mono font-semibold text-emerald-600">{fl.sprinklerCount}</td>
                                                            <td className="px-3 py-1.5 text-right font-mono font-semibold text-amber-600">{fl.smokeDetectorCount}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Travel Distance ── */}
                {travelDistance && (
                    <div className="rounded-xl border border-slate-100 overflow-hidden">
                        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                            <span className="text-sm">📏</span>
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Travel Distance — Table 5
                            </span>
                        </div>
                        <div className="p-4">
                            {travelDistance.maxDistanceM === -1 ? (
                                <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-100">
                                    <p className="text-sm font-semibold text-red-700">⛔ Construction Type NOT PERMITTED</p>
                                    <p className="text-xs text-red-500 mt-1">
                                        Type 3/4 construction is not allowed for Group {travelDistance.group}.
                                        Must use Type 1 or Type 2 (fire-resistive/non-combustible).
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div>
                                        <div className="text-2xl font-bold text-indigo-600">{travelDistance.maxDistanceM}m</div>
                                        <div className="text-[11px] text-slate-400 mt-0.5">Max Allowed</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-slate-700">{travelDistance.baseDistanceM}m</div>
                                        <div className="text-[11px] text-slate-400 mt-0.5">Base Distance</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-slate-700">
                                            {travelDistance.constructionType === 'type12' ? '1 & 2' : '3 & 4'}
                                        </div>
                                        <div className="text-[11px] text-slate-400 mt-0.5">Construction Type</div>
                                    </div>
                                </div>
                            )}
                            {travelDistance.sprinklerApplied && travelDistance.maxDistanceM !== -1 && (
                                <div className="mt-3 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100 text-center">
                                    <span className="text-xs text-emerald-600 font-medium">💧 Sprinkler bonus applied (+50%)</span>
                                </div>
                            )}
                            <div className="mt-3 text-center">
                                <span className="badge badge-info text-[10px]">Group {travelDistance.group}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Firefighting Installations — Table 7 ── */}
                {firefightingInstallations && (
                    <div className="rounded-xl border border-slate-100 overflow-hidden">
                        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                            <span className="text-sm">🧯</span>
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Firefighting Installations — Table 7
                            </span>
                            <span className="ml-auto text-[10px] text-slate-400">
                                {firefightingInstallations.occupancyLabel} · {firefightingInstallations.heightTierLabel}
                            </span>
                        </div>
                        <div className="p-4">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {([
                                    { label: 'Fire Extinguisher', key: 'fireExtinguisher', value: firefightingInstallations.fireExtinguisher },
                                    { label: 'Hose Reel', key: 'firstAidHoseReel', value: firefightingInstallations.firstAidHoseReel },
                                    { label: 'Wet Riser', key: 'wetRiser', value: firefightingInstallations.wetRiser },
                                    { label: 'Down Comer', key: 'downComer', value: firefightingInstallations.downComer },
                                    { label: 'Yard Hydrant', key: 'yardHydrant', value: firefightingInstallations.yardHydrant },
                                    { label: 'Sprinkler System', key: 'automaticSprinkler', value: firefightingInstallations.automaticSprinkler },
                                    { label: 'Manual Fire Alarm', key: 'manualFireAlarm', value: firefightingInstallations.manualFireAlarm },
                                    { label: 'Auto Detection', key: 'autoDetectionAlarm', value: firefightingInstallations.autoDetectionAlarm },
                                ] as const).map((item) => {
                                    const fieldNotes = (firefightingInstallations?.evaluatedNotes || [])
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
                            {(firefightingInstallations.undergroundTankLitres ||
                                firefightingInstallations.terraceTankLitres ||
                                firefightingInstallations.undergroundPumpLpm ||
                                firefightingInstallations.terracePumpLpm) && (
                                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                                        {firefightingInstallations.undergroundTankLitres && (
                                            <div>
                                                <div className="text-lg font-bold text-indigo-600">
                                                    {(firefightingInstallations.undergroundTankLitres / 1000).toLocaleString()}k
                                                </div>
                                                <div className="text-[10px] text-slate-400">UG Tank (L)</div>
                                            </div>
                                        )}
                                        {firefightingInstallations.terraceTankLitres && (
                                            <div>
                                                <div className="text-lg font-bold text-indigo-600">
                                                    {(firefightingInstallations.terraceTankLitres / 1000).toLocaleString()}k
                                                </div>
                                                <div className="text-[10px] text-slate-400">Terrace Tank (L)</div>
                                            </div>
                                        )}
                                        {firefightingInstallations.undergroundPumpLpm && (
                                            <div>
                                                <div className="text-lg font-bold text-slate-700">
                                                    {firefightingInstallations.undergroundPumpLpm.toLocaleString()}
                                                </div>
                                                <div className="text-[10px] text-slate-400">UG Pump (L/min)</div>
                                            </div>
                                        )}
                                        {firefightingInstallations.terracePumpLpm && (
                                            <div>
                                                <div className="text-lg font-bold text-slate-700">
                                                    {firefightingInstallations.terracePumpLpm.toLocaleString()}
                                                </div>
                                                <div className="text-[10px] text-slate-400">Terrace Pump (L/min)</div>
                                            </div>
                                        )}
                                    </div>
                                )}

                            {/* Evaluated Notes */}
                            {firefightingInstallations.evaluatedNotes &&
                                firefightingInstallations.evaluatedNotes.length > 0 && (
                                    <div className="mt-4 rounded-lg border border-slate-100 overflow-hidden">
                                        <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
                                            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                                📋 Applicable Notes (Table 7)
                                            </span>
                                        </div>
                                        <div className="divide-y divide-slate-50">
                                            {firefightingInstallations.evaluatedNotes.map((note, idx) => (
                                                <div
                                                    key={`${note.noteId}-${idx}`}
                                                    className={`px-3 py-2 flex items-start gap-2 ${note.isMet ? 'bg-emerald-50/30' : 'bg-white'}`}
                                                >
                                                    <span className={`text-xs font-bold mt-0.5 shrink-0 ${note.isMet ? 'text-emerald-600' : 'text-amber-500'}`}>
                                                        {note.isMet ? '✓' : '✗'}
                                                    </span>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                                                note.isMet ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                                            }`}>
                                                                Note {note.noteId}
                                                            </span>
                                                            <span className={`text-[10px] font-medium ${note.isMet ? 'text-emerald-600' : 'text-amber-500'}`}>
                                                                {note.isMet ? 'CONDITION MET' : 'CONDITION NOT MET'}
                                                            </span>
                                                            {note.setValue && (
                                                                <span className="text-[10px] text-slate-400">
                                                                    {note.isMet ? `(= ${note.setValue.toLocaleString()} LPM)` : `(= ${note.setValue.toLocaleString()} LPM if met)`}
                                                                </span>
                                                            )}
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
