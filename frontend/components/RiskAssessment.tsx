'use client';

import { useEffect, useState } from 'react';

interface RiskAssessmentProps {
  location: { lat: number; lng: number; address?: string } | null;
}

interface RiskData {
  level: 'low' | 'medium' | 'high';
  percentage: number;
  description: string;
  reasons: string[];
}

const LEVEL_COLOR = {
  high:   { text: 'text-red-600',   bar: 'bg-red-500',   badge: 'badge-high'   },
  medium: { text: 'text-amber-600', bar: 'bg-amber-500', badge: 'badge-medium' },
  low:    { text: 'text-green-600', bar: 'bg-green-500', badge: 'badge-low'    },
};

export default function RiskAssessment({ location }: RiskAssessmentProps) {
  const [risk, setRisk] = useState<RiskData | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!location) { setRisk(null); return; }

    const run = async () => {
      setLoading(true);
      setErr('');
      try {
        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        if (!apiKey) { setErr('Gemini API key not configured'); setLoading(false); return; }

        const prompt = `You are an emergency risk assessment system. Analyze the safety risk for GPS coordinates: ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}${
          location.address ? ` (${location.address})` : ''
        }.

Consider: natural disaster zones (seismic activity, flood plains, wildfire risk), crime statistics, geographic isolation, proximity to hospitals/emergency services, infrastructure density.

Respond ONLY with valid JSON, no markdown fences:
{"level":"low|medium|high","percentage":0-100,"description":"one concise sentence","reasons":["factor 1","factor 2","factor 3"]}`;

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
          }
        );
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const match = text.match(/\{[\s\S]*\}/);
        if (match) setRisk(JSON.parse(match[0]));
        else setErr('Could not parse AI response');
      } catch {
        setErr('AI assessment unavailable');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [location]);

  if (!location) {
    return (
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold mono text-zinc-900">DANGER ASSESSMENT</h3>
          <span className="badge badge-info">AI</span>
        </div>
        <div className="terminal text-xs py-6 text-center">
          <p className="dim">$ awaiting_location_input</p>
          <p className="mt-1 cursor-blink">Select a map point to begin analysis</p>
        </div>
      </div>
    );
  }

  const colors = risk ? LEVEL_COLOR[risk.level] : LEVEL_COLOR.medium;

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold mono text-zinc-900">DANGER ASSESSMENT</h3>
        {risk && <span className={`badge ${colors.badge}`}>{risk.level}</span>}
        {loading && <span className="badge badge-info">Analyzing...</span>}
      </div>

      {loading ? (
        <div className="terminal text-xs py-4">
          <p className="dim">$ gemini-2.0-flash --model risk_analysis</p>
          <p className="green mt-1">Fetching seismic data...</p>
          <p className="green">Cross-referencing crime index...</p>
          <p className="green">Checking hospital proximity...</p>
          <p className="hi mt-1 cursor-blink">Running inference</p>
        </div>
      ) : err ? (
        <div className="terminal text-xs py-3">
          <p className="red">Error: {err}</p>
        </div>
      ) : risk ? (
        <div className="space-y-3">
          {/* Gauge bar */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-zinc-500 mono">Risk Score</span>
              <span className={`text-lg font-bold mono ${colors.text}`}>{risk.percentage}%</span>
            </div>
            <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${colors.bar}`}
                style={{ width: `${risk.percentage}%` }}
              />
            </div>
          </div>

          {/* Description */}
          <p className="text-xs text-zinc-600 leading-relaxed">{risk.description}</p>

          {/* Factors */}
          <div className="terminal text-xs">
            <p className="dim mb-1">$ risk_factors --verbose</p>
            {risk.reasons.map((r, i) => (
              <p key={i} className="green">+ {r}</p>
            ))}
          </div>

          {/* Coords */}
          <div className="flex items-center gap-1.5 text-xs mono text-zinc-400 bg-zinc-50 rounded-lg px-3 py-2">
            <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="truncate">{location.address || `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
