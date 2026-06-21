'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

interface RiskAssessmentProps {
  location: { lat: number; lng: number; address?: string } | null;
}

interface RiskData {
  level: 'low' | 'medium' | 'high';
  percentage: number;
  description: string;
  reasons: string[];
}

export default function RiskAssessment({ location }: RiskAssessmentProps) {
  const [risk, setRisk] = useState<RiskData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!location) {
      setRisk(null);
      return;
    }

    const assessRisk = async () => {
      setLoading(true);
      try {
        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        if (!apiKey) {
          toast.error('Gemini API key not configured');
          setLoading(false);
          return;
        }

        const prompt = `Analyze the safety risk level for coordinates: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}${
          location.address ? ` (${location.address})` : ''
        }. 

Consider factors like:
- Natural disaster zones (earthquakes, floods, wildfires)
- Crime statistics for major cities
- Geographic isolation/accessibility
- Time of day implications
- Infrastructure proximity (hospitals, police)

Respond in JSON format:
{
  "level": "low|medium|high",
  "percentage": 0-100,
  "description": "Brief description",
  "reasons": ["reason1", "reason2", "reason3"]
}`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [{ text: prompt }],
                },
              ],
            }),
          }
        );

        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        // Extract JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const riskData = JSON.parse(jsonMatch[0]);
          setRisk(riskData);
        }
      } catch (error) {
        console.error('Risk assessment error:', error);
        // Fallback: random risk for demo
        setRisk({
          level: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as 'low' | 'medium' | 'high',
          percentage: Math.floor(Math.random() * 100),
          description: 'Unable to assess risk at this time',
          reasons: ['API unavailable', 'Using fallback assessment'],
        });
      } finally {
        setLoading(false);
      }
    };

    assessRisk();
  }, [location]);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-amber-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  const getRiskBgColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'bg-red-50 border-red-200';
      case 'medium':
        return 'bg-amber-50 border-amber-200';
      case 'low':
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  if (!location) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold mb-4 text-gray-900">
          Danger Assessment
        </h3>
        <div className="text-center py-8 text-gray-500">
          Select a location on the map to assess risk level
        </div>
      </div>
    );
  }

  return (
    <div className={`card border-2 ${getRiskBgColor(risk?.level || 'medium')}`}>
      <h3 className="text-lg font-semibold mb-4 text-gray-900">
        Danger Assessment
      </h3>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin text-2xl mb-2">⌛</div>
          <div className="text-gray-600">Analyzing location...</div>
        </div>
      ) : risk ? (
        <div className="space-y-4">
          {/* Percentage Circle */}
          <div className="flex items-center justify-center">
            <div className="relative w-32 h-32">
              <svg className="transform -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="8"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeDasharray={`${(risk.percentage / 100) * 339.3} 339.3`}
                  className={getRiskColor(risk.level)}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className={`text-3xl font-bold ${getRiskColor(risk.level)}`}>
                    {risk.percentage}%
                  </div>
                  <div className="text-xs text-gray-600 uppercase font-semibold mt-1">
                    {risk.level}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <p className="text-sm text-gray-700 text-center">
              {risk.description}
            </p>
          </div>

          {/* Reasons */}
          {risk.reasons && risk.reasons.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">Factors:</p>
              <ul className="space-y-1">
                {risk.reasons.map((reason, idx) => (
                  <li key={idx} className="text-xs text-gray-600 flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Coordinates */}
          <div className="text-xs text-gray-500 text-center bg-white/50 p-2 rounded">
            {location.address || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`}
          </div>
        </div>
      ) : null}
    </div>
  );
}
