const OLLAMA_URL = process.env.OLLAMA_DIRECT_URL || 'http://192.168.0.5:11434/api';
const MUTATOR_MODEL = 'qwen2.5:7b';

async function ollamaGenerate(model: string, prompt: string, temperature = 0.7): Promise<string> {
  const res = await fetch(`${OLLAMA_URL}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt, stream: false, options: { temperature } }),
  });
  if (!res.ok) throw new Error(`Ollama error: ${res.status} ${await res.text()}`);
  const data = await res.json() as { response: string };
  return data.response;
}

export async function mutatePrompt(
  currentPrompt: string,
  feedbacks: string[],
  experimentHistory: string,
): Promise<string> {
  const mutationPrompt = `You are a prompt engineering expert. Improve the following prompt for a Korean education AI system.

## Current Prompt
${currentPrompt}

## Judge Feedback (improvement points from recent experiments)
${feedbacks.length > 0 ? feedbacks.map((f, i) => `${i + 1}. ${f}`).join('\n') : '(first experiment, no feedback yet)'}

## Experiment History
${experimentHistory || '(none)'}

## Mutation Rules
1. MUST keep {{DATA}} placeholder — student data is injected here
2. Do NOT change JSON key names (strengths, weaknesses, summary, subject, reason, score, improvementTip)
3. You CAN change: instructions, analysis rules, few-shot examples, constraints, output guidelines
4. Change only 1-2 things at a time
5. If feedback exists, directly address those points
6. Write the prompt in Korean

Output ONLY the improved prompt wrapped in \`\`\`prompt code block. No explanation needed.`;

  const text = await ollamaGenerate(MUTATOR_MODEL, mutationPrompt);

  const blockMatch = text.match(/```prompt\s*\n([\s\S]*?)\n```/);
  if (blockMatch) return blockMatch[1].trim();

  const codeMatch = text.match(/```\s*\n([\s\S]*?)\n```/);
  if (codeMatch) return codeMatch[1].trim();

  return text.trim();
}
