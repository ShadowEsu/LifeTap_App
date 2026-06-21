/**
 * Google Gemini AI Service
 * Performs structured risk assessment of emergency alerts.
 * Returns a predictable JSON structure even when the API fails.
 */

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { RiskAssessment, RiskLevel } from '../types';
import { ExternalApiError } from '../utils/errors';

let geminiClient: GoogleGenerativeAI | null = null;
let geminiModel: GenerativeModel | null = null;

function getGeminiModel(): GenerativeModel {
  if (!geminiModel) {
    if (!config.gemini.apiKey) {
      throw new ExternalApiError('Gemini', 'API key is not configured');
    }
    geminiClient = new GoogleGenerativeAI(config.gemini.apiKey);
    geminiModel = geminiClient.getGenerativeModel({
      model: config.gemini.model,
      generationConfig: {
        maxOutputTokens: config.gemini.maxTokens,
        temperature: config.gemini.temperature,
        responseMimeType: 'application/json',
      },
    });
  }
  return geminiModel;
}

export interface AssessmentContext {
  alertId: string;
  timestamp: Date;
  location: {
    lat: number;
    lon: number;
    address?: string;
  };
  deviceName?: string;
  recentAlerts: Array<{
    timestamp: Date;
    location: { lat: number; lon: number };
    status: string;
  }>;
}

/**
 * Constructs the Gemini prompt using alert context.
 * Follows the structure defined in API_SPEC.md.
 */
function buildAssessmentPrompt(ctx: AssessmentContext): string {
  const hour = ctx.timestamp.getHours();
  const isNight = hour < 6 || hour >= 22;
  const timeDesc = isNight ? 'Night time (increased risk)' : 'Daytime';

  const recentAlertsSummary =
    ctx.recentAlerts.length > 0
      ? ctx.recentAlerts
          .slice(0, 5)
          .map(
            (a, i) =>
              `  Alert ${i + 1}: ${a.timestamp.toISOString()} at (${a.location.lat.toFixed(4)}, ${a.location.lon.toFixed(4)}) — Status: ${a.status}`,
          )
          .join('\n')
      : '  No recent alerts in past 7 days';

  const locationDesc = ctx.location.address
    ? `${ctx.location.address} (${ctx.location.lat.toFixed(4)}, ${ctx.location.lon.toFixed(4)})`
    : `GPS: ${ctx.location.lat.toFixed(4)}, ${ctx.location.lon.toFixed(4)}`;

  return `You are an emergency response risk assessment AI. Analyze this emergency alert and provide a structured JSON response.

ALERT DETAILS:
- Alert ID: ${ctx.alertId}
- Timestamp: ${ctx.timestamp.toISOString()}
- Time of Day: ${timeDesc} (${hour}:00 local)
- Location: ${locationDesc}
- Device: ${ctx.deviceName ?? 'Unknown Device'}

RECENT ALERT HISTORY (past 7 days):
${recentAlertsSummary}

ASSESSMENT TASK:
Based on the above context, provide a risk assessment in the following JSON format exactly:

{
  "risk_level": "low" | "medium" | "high",
  "risk_score": <integer 0-100>,
  "rationale": "<1-2 sentence explanation of the risk assessment>",
  "suggested_actions": [
    "<action 1>",
    "<action 2>",
    "<action 3>",
    "<optional action 4>",
    "<optional action 5>"
  ],
  "escalation_criteria": {
    "trigger_emergency_services": "<condition that warrants calling emergency services>",
    "escalation_threshold": <risk_score threshold, integer>
  }
}

SCORING GUIDELINES:
- 0-33: Low risk (daytime, familiar location, single alert, responsive user history)
- 34-66: Medium risk (evening, new location, some pattern concerns)
- 67-100: High risk (nighttime, isolated location, repeated alerts, no response history)

Respond ONLY with valid JSON. No markdown, no explanation outside the JSON.`;
}

/**
 * Fallback assessment when Gemini is unavailable.
 * Defaults to medium risk to trigger human review.
 */
function buildFallbackAssessment(alertId: string): RiskAssessment {
  logger.warn({ alertId }, 'Using fallback risk assessment (Gemini unavailable)');
  return {
    risk_level: RiskLevel.MEDIUM,
    risk_score: 50,
    assessment_timestamp: new Date(),
    rationale:
      'Automated risk assessment unavailable. Defaulting to medium risk to ensure human review.',
    suggested_actions: [
      'Contact the alert owner directly to verify their status',
      'Check if the location is known and expected',
      'Escalate to emergency services if no response within 5 minutes',
    ],
    escalation_criteria: {
      trigger_emergency_services: 'No contact response within 5 minutes',
      escalation_threshold: 50,
    },
  };
}

interface GeminiResponseJson {
  risk_level?: string;
  risk_score?: number;
  rationale?: string;
  suggested_actions?: string[];
  escalation_criteria?: {
    trigger_emergency_services?: string;
    escalation_threshold?: number;
  };
}

/**
 * Assesses the risk level of an emergency alert using Google Gemini.
 * Falls back to a safe default on API error.
 */
export async function assessAlertRisk(ctx: AssessmentContext): Promise<RiskAssessment> {
  if (!config.features.geminiAssessment || !config.gemini.apiKey) {
    return buildFallbackAssessment(ctx.alertId);
  }

  const startTime = Date.now();

  try {
    const model = getGeminiModel();
    const prompt = buildAssessmentPrompt(ctx);

    logger.debug({ alertId: ctx.alertId }, 'Sending assessment request to Gemini');

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    const parsed = JSON.parse(responseText) as GeminiResponseJson;

    // Validate and sanitize the Gemini response
    const validRiskLevels = [RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH];
    const riskLevel = validRiskLevels.includes(parsed.risk_level as RiskLevel)
      ? (parsed.risk_level as RiskLevel)
      : RiskLevel.MEDIUM;

    const riskScore = Math.max(0, Math.min(100, Math.round(parsed.risk_score ?? 50)));

    const assessment: RiskAssessment = {
      risk_level: riskLevel,
      risk_score: riskScore,
      assessment_timestamp: new Date(),
      rationale:
        typeof parsed.rationale === 'string'
          ? parsed.rationale
          : 'Assessment completed without detailed rationale.',
      suggested_actions: Array.isArray(parsed.suggested_actions)
        ? parsed.suggested_actions.slice(0, 5).map(String)
        : ['Contact the user to verify their status'],
      escalation_criteria:
        parsed.escalation_criteria
          ? {
              trigger_emergency_services:
                parsed.escalation_criteria.trigger_emergency_services ??
                'No response within 5 minutes',
              escalation_threshold: parsed.escalation_criteria.escalation_threshold ?? 75,
            }
          : undefined,
    };

    const duration = Date.now() - startTime;
    logger.info(
      { alertId: ctx.alertId, riskLevel, riskScore, durationMs: duration },
      'Gemini risk assessment complete',
    );

    return assessment;
  } catch (err) {
    const duration = Date.now() - startTime;
    logger.error(
      { err, alertId: ctx.alertId, durationMs: duration },
      'Gemini API error — using fallback assessment',
    );
    return buildFallbackAssessment(ctx.alertId);
  }
}
