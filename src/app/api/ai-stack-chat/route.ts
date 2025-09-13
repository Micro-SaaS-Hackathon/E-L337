import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');


export async function POST(req: NextRequest) {
  try {
    const { message, conversation, currentStack, forceSuggestions } = await req.json();

    const systemPrompt = `
    You are a friendly, expert tech stack consultant helping users choose the best technologies for their project. \n\nCurrent user's stack selections: ${JSON.stringify(currentStack || {}, null, 2)}\n\n${forceSuggestions ? 'IMPORTANT: The user has enabled "Force stack suggestions" mode. You MUST provide specific tech stack recommendations in EVERY response, regardless of the user\'s question. Always end your response with a SUGGESTIONS array.\n\n' : ''}Instructions:\n- Ask clarifying questions early.\n- Provide explanations with trade-offs.${forceSuggestions ? '\n- ALWAYS provide specific tech stack suggestions in EVERY response.' : ''}\n- End with a SUGGESTIONS array (plain text, JS-like) exactly in the format:\nSUGGESTIONS: [ {category: 'frontend', field: 'framework', value: 'nextjs', name: 'Next.js', rationale: 'Reason'}, ... ]\n- Include a full stack (frontend framework + styling, backend language + database, cloud provider).\n- Do not modify stack directly; only suggest.\n- Keep tone helpful & concise.`;

    const conversationContext = (conversation || [])
      .map((m: any) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');
    const prompt = `${systemPrompt}\n\nPrevious conversation:\n${conversationContext}\n\nUser: ${message}`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const streamingResult = await model.generateContentStream({ contents: [{ role: 'user', parts: [{ text: prompt }] }] });

    const encoder = new TextEncoder();

    const parseSuggestions = (full: string) => {
      let suggestions: any[] = [];
      const safeObj = (raw: string) => {
        try {
          let s = raw.trim();
          if (s.startsWith('```')) s = s.replace(/^```[a-zA-Z0-9]*\n?/, '').replace(/```$/,'').trim();
          s = s.replace(/([,{\s])([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
          s = s.replace(/'([^'\\]|\\.)*'/g, m => { const inner = m.slice(1, -1).replace(/\\"/g,'"').replace(/"/g,'\\"'); return '"' + inner + '"'; });
          s = s.replace(/,(\s*[}\]])/g, '$1');
          return JSON.parse(s);
        } catch { return null; }
      };
      const suggMatch = full.match(/SUGGESTIONS:\s*(\[[\s\S]*?\](?:\s*\n|$))/m);
      if (suggMatch) {
        try {
          let raw = suggMatch[1].trim();
          if (raw.includes('```')) raw = raw.replace(/```[a-zA-Z]*\n?/g,'').replace(/```/g,'');
          const first = raw.indexOf('['); const last = raw.lastIndexOf(']');
          if (first !== -1 && last !== -1) raw = raw.slice(first, last + 1);
          raw = raw.replace(/([,{\s])([a-zA-Z0-9_]+)\s*:/g,'$1"$2":');
          raw = raw.replace(/'([^'\\]|\\.)*'/g, m=>{const inner=m.slice(1,-1).replace(/\\"/g,'"').replace(/"/g,'\\"');return '"'+inner+'"';});
          raw = raw.replace(/,(\s*[\]}])/g,'$1');
          suggestions = JSON.parse(raw);
        } catch {}
      }
      if (suggestions.length === 0) {
        for (const m of full.matchAll(/STACK_ADD:\s*({[\s\S]*?})/g)) {
          const parsed = safeObj(m[1]);
            if (parsed && parsed.category && parsed.field && parsed.value) suggestions.push({ ...parsed, rationale: parsed.rationale || '' });
        }
      }
      const clean = suggMatch ? full.replace(suggMatch[0], '').trim() : full.replace(/STACK_ADD:\s*{[\s\S]*?}/g,'').trim();
      return { suggestions, clean };
    };

    const stream = new ReadableStream({
      async start(controller) {
        try {
          let full = '';
          for await (const chunk of streamingResult.stream) {
            const text = chunk.text();
            if (text) {
              full += text;
              controller.enqueue(encoder.encode(`event: chunk\ndata: ${JSON.stringify({ text })}\n\n`));
            }
          }
          const { suggestions, clean } = parseSuggestions(full);
          controller.enqueue(encoder.encode(`event: suggestions\ndata: ${JSON.stringify({ suggestions })}\n\n`));
          controller.enqueue(encoder.encode(`event: done\ndata: ${JSON.stringify({ final: clean })}\n\n`));
          controller.close();
        } catch (e) {
          controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ message: 'Streaming error' })}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no'
      }
    });
  } catch (error) {
    console.error('AI stack chat streaming error:', error);
    return NextResponse.json({ error: 'Failed to process chat message' }, { status: 500 });
  }
}
