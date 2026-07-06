import { NextRequest, NextResponse } from 'next/server';
import { callMistralAgent, cleanAndParseJson, PeakFlowAgentType } from '@/lib/mistral/agents';

export async function GET(request: NextRequest) {
  // 1. Block in production
  if (process.env.NODE_ENV !== 'development') {
    return new NextResponse('Not Found', { status: 404 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const agent = searchParams.get('agent') as PeakFlowAgentType;

    const validAgents: PeakFlowAgentType[] = ['operatorBriefing', 'congestionOptimizer', 'campaignFormulator'];
    if (!agent || !validAgents.includes(agent)) {
      return NextResponse.json(
        { success: false, error: `Invalid or missing agent parameter. Must be one of: ${validAgents.join(', ')}` },
        { status: 400 }
      );
    }

    const testPrompt = `Return valid JSON only: {"status":"OK","agent":"${agent}"}`;
    const responseText = await callMistralAgent(agent, testPrompt);
    const parsedResponse = cleanAndParseJson(responseText);

    return NextResponse.json({
      ok: true,
      agent: agent,
      response: parsedResponse
    });
  } catch (error: any) {
    console.error('[Mistral Test Route] GET failure:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Block in production
  if (process.env.NODE_ENV !== 'development') {
    return new NextResponse('Not Found', { status: 404 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const agent = searchParams.get('agent') as PeakFlowAgentType;

    const validAgents: PeakFlowAgentType[] = ['operatorBriefing', 'congestionOptimizer', 'campaignFormulator'];
    if (!agent || !validAgents.includes(agent)) {
      return NextResponse.json(
        { success: false, error: `Invalid or missing agent parameter. Must be one of: ${validAgents.join(', ')}` },
        { status: 400 }
      );
    }

    const testPrompt = `Return valid JSON only: {"status":"OK","agent":"${agent}"}`;
    const responseText = await callMistralAgent(agent, testPrompt);
    const parsedResponse = cleanAndParseJson(responseText);

    return NextResponse.json({
      ok: true,
      agent: agent,
      response: parsedResponse
    });
  } catch (error: any) {
    console.error('[Mistral Test Route] POST failure:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
