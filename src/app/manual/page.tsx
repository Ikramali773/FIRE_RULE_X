'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

interface SimpleInput {
    projectName: string;
    state: string;
    city: string;
    buildingStatus: string;
    buildingType: string;
    buildingHeight: number;
    numberOfFloors: number;
    floorAreas: number[];
    basementCount: number;
    basementArea: number;
    plotArea: number | null;
    totalBuiltUpArea: number | null;
    parkingType: string;
    sprinklerProposed: boolean;
}

const defaultInput: SimpleInput = {
    projectName: '',
    state: '',
    city: '',
    buildingStatus: 'proposed',
    buildingType: '',
    buildingHeight: 0,
    numberOfFloors: 1,
    floorAreas: [0],
    basementCount: 0,
    basementArea: 0,
    plotArea: null,
    totalBuiltUpArea: null,
    parkingType: 'open',
    sprinklerProposed: false,
};

export default function ManualPage() {
    const router = useRouter();
    const [form, setForm] = useState<SimpleInput>(defaultInput);
    const [buildingTypes, setBuildingTypes] = useState<string[]>([]);
    const [hasBasement, setHasBasement] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [typesLoading, setTypesLoading] = useState(true);

    // Fetch building types on mount
    useEffect(() => {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        fetch(`${API_BASE_URL}/api/building-types`)
            .then((res) => res.json())
            .then((data) => {
                setBuildingTypes(data.building_types || []);
                setTypesLoading(false);
            })
            .catch(() => {
                setTypesLoading(false);
                setError('Could not load building types. Is the backend running?');
            });
    }, []);

    const updateField = (field: keyof SimpleInput, value: string | number | number[] | boolean | null) => {
        setForm((prev) => ({ ...prev, [field]: value as never }));
    };

    // When number of floors changes, resize the floorAreas array
    const handleFloorCountChange = (count: number) => {
        const newCount = Math.max(1, count);
        setForm((prev) => {
            const newAreas = [...prev.floorAreas];
            if (newCount > newAreas.length) {
                // Add new floors — pre-fill with last floor's value for convenience
                const lastValue = newAreas.length > 0 ? newAreas[newAreas.length - 1] : 0;
                while (newAreas.length < newCount) {
                    newAreas.push(lastValue);
                }
            } else {
                // Remove extra floors
                newAreas.length = newCount;
            }
            return { ...prev, numberOfFloors: newCount, floorAreas: newAreas };
        });
    };

    const updateFloorArea = (index: number, value: number) => {
        setForm((prev) => {
            const newAreas = [...prev.floorAreas];
            newAreas[index] = value;
            return { ...prev, floorAreas: newAreas };
        });
    };

    const applyToAllFloors = () => {
        if (form.floorAreas.length === 0) return;
        const firstValue = form.floorAreas[0];
        setForm((prev) => ({
            ...prev,
            floorAreas: prev.floorAreas.map(() => firstValue),
        }));
    };

    const handleSubmit = async () => {
        // Validation
        if (!form.buildingType) {
            setError('Please select a building type.');
            return;
        }
        if (!form.buildingHeight || form.buildingHeight <= 0) {
            setError('Please enter a valid building height.');
            return;
        }
        if (!form.numberOfFloors || form.numberOfFloors <= 0) {
            setError('Please enter a valid number of floors.');
            return;
        }
        if (form.floorAreas.some(a => !a || a <= 0)) {
            setError('Please enter a valid area for each floor.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const payload = {
                project_name: form.projectName,
                state: form.state,
                city: form.city,
                building_status: form.buildingStatus,
                building_type: form.buildingType,
                building_height: form.buildingHeight,
                number_of_floors: form.numberOfFloors,
                floor_areas: form.floorAreas,
                basement_count: form.basementCount,
                basement_area: hasBasement ? form.basementArea : 0,
                plot_area: form.plotArea,
                total_built_up_area: form.totalBuiltUpArea,
                parking_type: form.parkingType,
                sprinkler_proposed: form.sprinklerProposed,
            };

            const response = await fetch(`${API_BASE_URL}/api/analyze-simple`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Analysis failed');
            }

            const data = await response.json();
            sessionStorage.setItem('firerulx_result', JSON.stringify(data));
            router.push('/results');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const totalArea = form.floorAreas.reduce((s, a) => s + a, 0) + (hasBasement ? form.basementArea : 0);
    const isValid = form.buildingType && form.buildingHeight > 0 && form.numberOfFloors > 0 && form.floorAreas.every(a => a > 0);

    return (
        <main className="min-h-screen bg-[var(--background)]">
            <Navbar />

            <div className="pt-28 pb-8 px-4 sm:px-6 lg:px-8">
                <div className="max-w-lg mx-auto">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-slate-900 mb-2">
                            🏢 Manual Building Analysis
                        </h1>
                        <p className="text-slate-500">
                            Enter your building details to get fire safety compliance results
                        </p>
                    </div>

                    {/* Form */}
                    <div className="card card-elevated space-y-6">
                        {/* 0. Project Context */}
                        <div className="space-y-4 pb-4 border-b border-slate-100">
                            <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-2">Project Context</h3>
                            
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Project Name</label>
                                <input
                                    type="text"
                                    value={form.projectName}
                                    onChange={(e) => updateField('projectName', e.target.value)}
                                    placeholder="e.g. Skyline Towers"
                                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition text-sm"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">State</label>
                                    <input
                                        type="text"
                                        value={form.state}
                                        onChange={(e) => updateField('state', e.target.value)}
                                        placeholder="e.g. Maharashtra"
                                        className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">City</label>
                                    <input
                                        type="text"
                                        value={form.city}
                                        onChange={(e) => updateField('city', e.target.value)}
                                        placeholder="e.g. Mumbai"
                                        className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition text-sm"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Building Status</label>
                                <div className="flex gap-4">
                                    {['proposed', 'existing', 'under_construction'].map((status) => (
                                        <label key={status} className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="buildingStatus"
                                                value={status}
                                                checked={form.buildingStatus === status}
                                                onChange={(e) => updateField('buildingStatus', e.target.value)}
                                                className="w-4 h-4 text-orange-500 focus:ring-orange-400"
                                            />
                                            <span className="text-sm text-slate-600 capitalize">{status.replace('_', ' ')}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-2">Building Specifications</h3>

                        {/* 1. Building Type */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                Building Type <span className="text-red-400">*</span>
                            </label>
                            {typesLoading ? (
                                <div className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-400">
                                    Loading building types...
                                </div>
                            ) : (
                                <select
                                    id="building-type-select"
                                    value={form.buildingType}
                                    onChange={(e) => updateField('buildingType', e.target.value)}
                                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition text-sm bg-white"
                                >
                                    <option value="">Select building type...</option>
                                    {buildingTypes.map((type) => (
                                        <option key={type} value={type}>
                                            {type}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {/* 2. Building Height */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                Building Height (m) <span className="text-red-400">*</span>
                            </label>
                            <input
                                id="building-height-input"
                                type="number"
                                value={form.buildingHeight || ''}
                                onChange={(e) => updateField('buildingHeight', Number(e.target.value))}
                                placeholder="e.g. 15"
                                min={0}
                                step={0.5}
                                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition text-sm"
                            />
                        </div>

                        {/* 3. Number of Floors */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                Number of Floors <span className="text-red-400">*</span>
                            </label>
                            <input
                                id="num-floors-input"
                                type="number"
                                value={form.numberOfFloors || ''}
                                onChange={(e) => handleFloorCountChange(Number(e.target.value))}
                                placeholder="e.g. 4"
                                min={1}
                                max={100}
                                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition text-sm"
                            />
                        </div>

                        {/* 4. Per-Floor Area Inputs */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-semibold text-slate-700">
                                    Floor Areas (m²) <span className="text-red-400">*</span>
                                </label>
                                {form.numberOfFloors > 1 && form.floorAreas[0] > 0 && (
                                    <button
                                        type="button"
                                        onClick={applyToAllFloors}
                                        className="text-xs text-orange-500 hover:text-orange-600 font-medium transition-colors"
                                    >
                                        Apply Ground Floor area to all ↓
                                    </button>
                                )}
                            </div>
                            <p className="text-xs text-slate-400 mb-2">
                                Enter the area of each floor separately
                            </p>
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                {form.floorAreas.map((area, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <span className="text-xs text-slate-400 w-24 shrink-0 font-medium">
                                            {idx === 0 ? 'Ground Floor' : `Floor ${idx}`}
                                        </span>
                                        <input
                                            id={`floor-area-input-${idx}`}
                                            type="number"
                                            value={area || ''}
                                            onChange={(e) => updateFloorArea(idx, Number(e.target.value))}
                                            placeholder="e.g. 500"
                                            min={0}
                                            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition text-sm"
                                        />
                                        <span className="text-xs text-slate-400">m²</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 5. Basement */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-semibold text-slate-700">
                                    Basement
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        id="has-basement-toggle"
                                        type="checkbox"
                                        checked={hasBasement}
                                        onChange={(e) => {
                                            setHasBasement(e.target.checked);
                                            if (!e.target.checked) {
                                                updateField('basementArea', 0);
                                                updateField('basementCount', 0);
                                            }
                                        }}
                                        className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
                                    />
                                    <span className="text-sm text-slate-600">Has Basement</span>
                                </label>
                            </div>
                            {hasBasement && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 mb-1">Total Basement Area (m²)</label>
                                        <input
                                            id="basement-area-input"
                                            type="number"
                                            value={form.basementArea || ''}
                                            onChange={(e) => updateField('basementArea', Number(e.target.value))}
                                            placeholder="Area in m²"
                                            min={0}
                                            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 mb-1">Number of Basements</label>
                                        <input
                                            type="number"
                                            value={form.basementCount || ''}
                                            onChange={(e) => updateField('basementCount', Number(e.target.value))}
                                            placeholder="Count"
                                            min={1}
                                            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition text-sm"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 6. Additional Specs */}
                        <div className="space-y-4 pt-4 border-t border-slate-100">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Plot Area (m²) <span className="font-normal text-slate-400">(opt)</span></label>
                                    <input
                                        type="number"
                                        value={form.plotArea || ''}
                                        onChange={(e) => updateField('plotArea', Number(e.target.value))}
                                        placeholder="e.g. 2000"
                                        min={0}
                                        className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Built-up Area (m²) <span className="font-normal text-slate-400">(opt)</span></label>
                                    <input
                                        type="number"
                                        value={form.totalBuiltUpArea || ''}
                                        onChange={(e) => updateField('totalBuiltUpArea', Number(e.target.value))}
                                        placeholder="e.g. 15000"
                                        min={0}
                                        className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition text-sm"
                                    />
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-8">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={form.sprinklerProposed}
                                        onChange={(e) => updateField('sprinklerProposed', e.target.checked)}
                                        className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
                                    />
                                    <span className="text-sm font-semibold text-slate-700">Sprinkler System Proposed</span>
                                </label>
                            </div>
                        </div>

                        {/* Summary */}
                        {isValid && (
                            <div className="px-4 py-3 rounded-lg bg-slate-50 border border-slate-100 text-sm text-slate-600">
                                <div className="font-semibold text-slate-700 mb-1">📊 Summary</div>
                                <div>
                                    <span className="text-slate-400">Type:</span> {form.buildingType}
                                </div>
                                <div>
                                    <span className="text-slate-400">Total Area:</span>{' '}
                                    {totalArea.toLocaleString()} m²
                                    <span className="text-xs text-slate-400 ml-1">(sum of all floors{hasBasement && form.basementArea > 0 ? ' + basement' : ''})</span>
                                </div>
                                <div>
                                    <span className="text-slate-400">Height:</span> {form.buildingHeight}m
                                    {' · '}
                                    <span className="text-slate-400">Floors:</span> {form.numberOfFloors}
                                    {hasBasement && form.basementArea > 0 && (
                                        <>
                                            {' · '}
                                            <span className="text-slate-400">Basement:</span> {form.basementArea} m²
                                        </>
                                    )}
                                </div>
                                <div className="mt-1 text-xs text-slate-400">
                                    Floor areas: {form.floorAreas.map((a, i) => `${i === 0 ? 'G' : i}: ${a}m²`).join(' · ')}
                                </div>
                            </div>
                        )}

                        {/* Error */}
                        {error && (
                            <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                                ⚠️ {error}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3 pt-2">
                            <button
                                id="analyze-btn"
                                onClick={handleSubmit}
                                disabled={loading || !isValid}
                                className="btn-primary flex-1 py-3"
                            >
                                {loading ? (
                                    <>
                                        <span className="spinner !w-4 !h-4 !border-white/30 !border-t-white"></span>
                                        Analyzing...
                                    </>
                                ) : (
                                    '🔍 Analyze Compliance'
                                )}
                            </button>
                            <button
                                onClick={() => router.push('/')}
                                className="btn-secondary"
                            >
                                ← Back
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <Footer />
        </main>
    );
}
