'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

interface SimpleInput {
    buildingType: string;
    buildingHeight: number;
    numberOfFloors: number;
    maxFloorArea: number;
    basementArea: number;
}

const defaultInput: SimpleInput = {
    buildingType: '',
    buildingHeight: 0,
    numberOfFloors: 1,
    maxFloorArea: 0,
    basementArea: 0,
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

    const updateField = (field: keyof SimpleInput, value: string | number) => {
        setForm((prev) => ({ ...prev, [field]: value }));
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
        if (!form.maxFloorArea || form.maxFloorArea <= 0) {
            setError('Please enter a valid floor area.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const payload = {
                building_type: form.buildingType,
                building_height: form.buildingHeight,
                number_of_floors: form.numberOfFloors,
                max_floor_area: form.maxFloorArea,
                basement_area: hasBasement ? form.basementArea : 0,
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

    const isValid = form.buildingType && form.buildingHeight > 0 && form.numberOfFloors > 0 && form.maxFloorArea > 0;

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
                                onChange={(e) => updateField('numberOfFloors', Math.max(1, Number(e.target.value)))}
                                placeholder="e.g. 4"
                                min={1}
                                max={100}
                                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition text-sm"
                            />
                        </div>

                        {/* 4. Highest Floor Area */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                Highest Floor Area (m²) <span className="text-red-400">*</span>
                            </label>
                            <p className="text-xs text-slate-400 mb-1.5">Area of the floor which has the largest area</p>
                            <input
                                id="max-floor-area-input"
                                type="number"
                                value={form.maxFloorArea || ''}
                                onChange={(e) => updateField('maxFloorArea', Number(e.target.value))}
                                placeholder="e.g. 500"
                                min={0}
                                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition text-sm"
                            />
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
                                            }
                                        }}
                                        className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
                                    />
                                    <span className="text-sm text-slate-600">Has Basement</span>
                                </label>
                            </div>
                            {hasBasement && (
                                <input
                                    id="basement-area-input"
                                    type="number"
                                    value={form.basementArea || ''}
                                    onChange={(e) => updateField('basementArea', Number(e.target.value))}
                                    placeholder="Basement area in m²"
                                    min={0}
                                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition text-sm"
                                />
                            )}
                        </div>

                        {/* Summary */}
                        {isValid && (
                            <div className="px-4 py-3 rounded-lg bg-slate-50 border border-slate-100 text-sm text-slate-600">
                                <div className="font-semibold text-slate-700 mb-1">📊 Summary</div>
                                <div>
                                    <span className="text-slate-400">Type:</span> {form.buildingType}
                                </div>
                                <div>
                                    <span className="text-slate-400">Derived Total Area:</span>{' '}
                                    {(form.maxFloorArea * form.numberOfFloors + (hasBasement ? form.basementArea : 0)).toLocaleString()} m²
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
