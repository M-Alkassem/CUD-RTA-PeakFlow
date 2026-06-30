const fs = require('fs');
const path = require('path');

const getEnvVariable = (key) => {
  if (process.env[key]) {
    const val = process.env[key].trim();
    if (val && val !== 'undefined') return val;
  }
  try {
    let envPath = path.join(__dirname, '.env.local');
    if (!fs.existsSync(envPath)) {
      envPath = path.join(__dirname, '..', '.env.local');
    }
    if (!fs.existsSync(envPath)) {
      envPath = path.join(process.cwd(), '.env.local');
    }
    if (!fs.existsSync(envPath)) {
      envPath = path.join(process.cwd(), 'rta-peakflow-copilot', '.env.local');
    }
    console.log('Trying file path:', envPath, 'exists:', fs.existsSync(envPath));
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('#') || !trimmed.includes('=')) continue;
        const [k, ...vParts] = trimmed.split('=');
        if (k.trim() === key) {
          const val = vParts.join('=').trim();
          if (val && val !== 'undefined') return val;
        }
      }
    }
  } catch (err) {
    console.error('Error manually reading .env.local:', err);
  }
  return undefined;
};

const apiKey = getEnvVariable('MISTRAL_API_KEY');
const agentId = getEnvVariable('MISTRAL_AGENT_ID');
const agentVersion = getEnvVariable('MISTRAL_AGENT_VERSION') || "0";

console.log('apiKey:', apiKey ? 'Loaded' : 'Not Loaded');
console.log('agentId:', agentId);
console.log('agentVersion:', agentVersion);

if (!apiKey || !agentId) {
  console.log('Missing API key or Agent ID. Cannot run test.');
  process.exit(1);
}

const payload = {
  "agent_id": agentId,
  "agent_version": Number(agentVersion),
  "inputs": [
    {
      "role": "user",
      "content": JSON.stringify({
        location: "Al Garhoud Bridge",
        risk_score: 84,
        risk_level: "High",
        forecast_window: "45 minutes",
        causes: ["PM peak demand","road near capacity","speed drop"],
        recommended_action: "Route advisory to Business Bay Crossing",
        human_approval_required: true
      }) + "\nReturn ONLY valid JSON matching this schema: {\"situationSummary\": \"A concise 2-sentence summary of the traffic state using only provided metrics.\", \"causeExplanation\": \"An explanation of the congestion causes based strictly on the active triggers.\", \"recommendedAction\": \"Route advisory to Business Bay Crossing\", \"publicAdvisory\": \"Max 160 characters plain text warning suitable for roadside signs.\", \"humanApprovalNote\": \"This recommendation requires human approval before publishing to official roadside advisory channels.\"}. No markdown, no headings, no code fences, no explanation."
    }
  ],
  "completion_args": {
    "temperature": 0.2,
    "max_tokens": 450
  }
};

fetch('https://api.mistral.ai/v1/conversations', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  },
  body: JSON.stringify(payload)
})
.then(async (response) => {
  console.log('First response status:', response.status);
  if (!response.ok && (response.status === 400 || response.status === 422)) {
    console.log('Retrying without completion_args...');
    const retryPayload = { ...payload };
    delete retryPayload.completion_args;
    return fetch('https://api.mistral.ai/v1/conversations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(retryPayload)
    });
  }
  return response;
})
.then(async (res) => {
  console.log('Final response status:', res.status);
  const text = await res.text();
  console.log('Response body:', text);
})
.catch((err) => {
  console.error('Error:', err);
});
