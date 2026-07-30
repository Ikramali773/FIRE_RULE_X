'use client';

import { useEffect, useState } from 'react';

interface ComplianceScoreProps {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D';
    nocReadiness: 'READY' | 'CONDITIONAL' | 'NOT_READY';
}

export default function ComplianceScore({ score, grade, nocReadiness }: ComplianceScoreProps) {
    const [animatedScore, setAnimatedScore] = useState(0);

    // Animate score on mount
    useEffect(() => {
        const duration = 1500;
        const start = performance.now();
        const animate = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setAnimatedScore(Math.round(eased * score));
            if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }, [score]);

    // Score color
    const getColor = () => {
        if (score >= 90) return '#10B981'; // green
        if (score >= 60) return '#F59E0B'; // amber
        return '#EF4444'; // red
    };

    // Ring calculations
    const radius = 76;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference - (animatedScore / 100) * circumference;

    const nocLabel = {
        READY: { text: 'NOC Ready', className: 'badge-pass' },
        CONDITIONAL: { text: 'Conditional', className: 'badge-warning' },
        NOT_READY: { text: 'Not Ready', className: 'badge-fail' },
    }[nocReadiness];

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="score-ring">
                <svg width="180" height="180">
                    <circle className="score-ring-track" cx="90" cy="90" r={radius} />
                    <circle
                        className="score-ring-progress"
                        cx="90"
                        cy="90"
                        r={radius}
                        stroke={getColor()}
                        strokeDasharray={circumference}
                        strokeDashoffset={dashOffset}
                    />
                </svg>
                <div className="score-ring-label">
                    <span className="text-4xl font-bold" style={{ color: getColor() }}>
                        {animatedScore}
                    </span>
                    <span className="text-lg font-bold text-slate-400">Grade {grade}</span>
                </div>
            </div>

            <span className={`badge ${nocLabel.className} text-sm`}>
                {nocLabel.text}
            </span>
        </div>
    );
}
