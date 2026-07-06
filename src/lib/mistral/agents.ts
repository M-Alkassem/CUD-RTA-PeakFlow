import 'server-only';

export type PeakFlowAgentType =
  | "operatorBriefing"
  | "congestionOptimizer"
  | "campaignFormulator";

export interface OperatorBriefingResponse {
  briefingHeadline: string;
  operatorSummary: string;
  currentCondition: string;
  recommendedDecision: string;
  expectedImpact: string;
  whyNow: string;
  approvalChecklist: string[];
  riskNotes: string;
}

export interface CongestionOptimizerResponse {
  congestionCause: string;
  strategyRationale: string;
  tradeoffs: string;
  recommendedInterventionExplanation: string;
  comparisonText: string;
  operatorConfidenceExplanation: string;
  employerFlexSavingsMinutes: number;
  employerFlexConfidencePct: number;
  metroNolSavingsMinutes: number;
  metroNolConfidencePct: number;
  parkingRewardSavingsMinutes: number;
  parkingRewardConfidencePct: number;
}

export interface CampaignFormulatorResponse {
  metroShiftMessage: string;
  offPeakTravelMessage: string;
  remoteWorkMessage: string;
  alternateRouteMessage: string;
  employerAdvisory: string;
  publicAdvisory: string;
}

export function validateOperatorBriefing(data: any): OperatorBriefingResponse {
  // Gracefully fallback for riskNotes if omitted by the LLM
  if (data && (data.riskNotes === undefined || data.riskNotes === null)) {
    data.riskNotes = "Operator approval is required. No direct system action or forced rerouting is enabled.";
  }
  
  const requiredKeys: (keyof OperatorBriefingResponse)[] = [
    'briefingHeadline',
    'operatorSummary',
    'currentCondition',
    'recommendedDecision',
    'expectedImpact',
    'whyNow',
    'approvalChecklist',
    'riskNotes'
  ];
  for (const key of requiredKeys) {
    if (!data || data[key] === undefined || data[key] === null) {
      throw new Error(`Validation Error: Missing required key "${key}" in OperatorBriefingResponse.`);
    }
  }
  if (!Array.isArray(data.approvalChecklist)) {
    throw new Error('Validation Error: "approvalChecklist" must be an array of strings.');
  }
  return data as OperatorBriefingResponse;
}

export function validateCongestionOptimizer(data: any): CongestionOptimizerResponse {
  const requiredKeys: (keyof CongestionOptimizerResponse)[] = [
    'congestionCause',
    'strategyRationale',
    'tradeoffs',
    'recommendedInterventionExplanation',
    'comparisonText',
    'operatorConfidenceExplanation',
    'employerFlexSavingsMinutes',
    'employerFlexConfidencePct',
    'metroNolSavingsMinutes',
    'metroNolConfidencePct',
    'parkingRewardSavingsMinutes',
    'parkingRewardConfidencePct'
  ];
  for (const key of requiredKeys) {
    if (data[key] === undefined || data[key] === null) {
      throw new Error(`Validation Error: Missing required key "${key}" in CongestionOptimizerResponse.`);
    }
  }
  return data as CongestionOptimizerResponse;
}

export function validateCampaignFormulator(data: any): CampaignFormulatorResponse {
  const requiredKeys: (keyof CampaignFormulatorResponse)[] = [
    'metroShiftMessage',
    'offPeakTravelMessage',
    'remoteWorkMessage',
    'alternateRouteMessage',
    'employerAdvisory',
    'publicAdvisory'
  ];
  for (const key of requiredKeys) {
    if (data[key] === undefined || data[key] === null) {
      throw new Error(`Validation Error: Missing required key "${key}" in CampaignFormulatorResponse.`);
    }
  }
  return data as CampaignFormulatorResponse;
}

export async function callMistralAgent(agentType: PeakFlowAgentType, prompt: string): Promise<string> {
  const apiKey = process.env.MISTRAL_API_KEY?.trim();
  
  let agentId: string | undefined;
  if (agentType === "operatorBriefing") {
    agentId = process.env.MISTRAL_OPERATOR_BRIEFING_AGENT_ID?.trim();
  } else if (agentType === "congestionOptimizer") {
    agentId = process.env.MISTRAL_CONGESTION_OPTIMIZER_AGENT_ID?.trim();
  } else if (agentType === "campaignFormulator") {
    agentId = process.env.MISTRAL_CAMPAIGN_FORMULATOR_AGENT_ID?.trim();
  }

  // 1. Validate missing configuration
  if (!apiKey || apiKey === 'undefined') {
    console.error('[Mistral Helper] Error: MISTRAL_API_KEY is not configured.');
    throw new Error('MISTRAL_API_KEY is missing from the server environment configuration.');
  }

  if (!agentId || agentId === 'undefined') {
    console.error(`[Mistral Helper] Error: Agent ID for type "${agentType}" is not configured.`);
    throw new Error(`Agent ID for type "${agentType}" is missing from the server environment configuration.`);
  }

  const maskedKey = apiKey.length > 8 ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : '****';
  console.log(`[Mistral Helper] Querying Agent ${agentType} (${agentId}) with Key: ${maskedKey}`);

  const url = 'https://api.mistral.ai/v1/agents/completions';
  const payload = {
    agent_id: agentId,
    messages: [
      { role: 'user', content: prompt }
    ],
    stream: false,
    response_format: { type: 'json_object' }
  };

  const timeoutMs = 25000; // 25 seconds timeout

  // Fetch with retry logic (retry once on 429 or 5xx)
  let attempt = 1;
  const maxAttempts = 2;
  let response: Response | null = null;
  let lastError: any = null;

  while (attempt <= maxAttempts) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        break; // Success!
      }

      // Read error text for logging
      const errText = await response.text();
      let errorJson: any = null;
      try {
        errorJson = JSON.parse(errText);
      } catch (e) {
        // Ignored
      }

      console.error(`[Mistral Helper] Attempt ${attempt} failed: API Response Error (HTTP ${response.status}):`, errorJson || errText);
      lastError = new Error(`Mistral API returned HTTP status ${response.status}: ${errText || response.statusText}`);

      // Retry condition: 429 or 5xx
      if ((response.status === 429 || response.status >= 500) && attempt < maxAttempts) {
        console.warn(`[Mistral Helper] Retrying after 429/5xx error (Attempt ${attempt})...`);
        attempt++;
        await new Promise(resolve => setTimeout(resolve, 1500));
        continue;
      }

      throw lastError;

    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        lastError = new Error(`Request to Mistral Agent timed out after ${timeoutMs}ms.`);
      } else {
        lastError = error;
      }

      console.error(`[Mistral Helper] Attempt ${attempt} threw exception: ${lastError.message}`);

      if (attempt < maxAttempts) {
        console.warn(`[Mistral Helper] Retrying after exception (Attempt ${attempt})...`);
        attempt++;
        await new Promise(resolve => setTimeout(resolve, 1500));
        continue;
      }

      throw lastError;
    }
  }

  if (!response || !response.ok) {
    throw lastError || new Error('Failed to query Mistral Agent.');
  }

  const resData = await response.json();
  const assistantText = resData.choices?.[0]?.message?.content?.trim();

  if (!assistantText) {
    console.error('[Mistral Helper] Empty completion output from Mistral Agent.');
    throw new Error('Received an empty response from Mistral Agent completions.');
  }

  return assistantText;
}

export function cleanAndParseJson(text: string): any {
  if (!text) return {};
  let cleaned = text.trim();
  
  if (cleaned.startsWith('```')) {
    const firstNewline = cleaned.indexOf('\n');
    if (firstNewline !== -1) {
      cleaned = cleaned.substring(firstNewline).trim();
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.substring(0, cleaned.length - 3).trim();
    }
  }
  
  try {
    return JSON.parse(cleaned);
  } catch (e: any) {
    console.error('[Mistral Helper] Failed to parse JSON from content:', cleaned);
    throw new Error(`JSON parsing failed: ${e.message}. Content was: ${cleaned.substring(0, 500)}`);
  }
}
