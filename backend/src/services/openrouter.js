require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });

function parseAIJson(content) {
  try { return JSON.parse(content); } catch {}
  try { return JSON.parse(content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()); } catch {}
  const match = content.match(/\{[\s\S]*\}/);
  if (match) { try { return JSON.parse(match[0]); } catch {} }
  return null;
}

async function callAI(systemPrompt, userPrompt) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL;
  const baseUrl = String(process.env.OPENROUTER_BASE_URL || '').replace(/\/$/, '');
  if (!apiKey || !model || !baseUrl) throw new Error('OpenRouter configuration is required');
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'X-Title': 'AI Vending Machine Network Manager' },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    })
  });
  if (!response.ok) throw new Error(`OpenRouter request failed with HTTP ${response.status}`);
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenRouter returned no content');
  return { error: false, result: parseAIJson(content) || { analysis: content }, model: data.model || model, usage: data.usage || null };
}

async function persistAIResult(pool, userId, endpoint, inputData, result, model) {
  await pool.query(
    'INSERT INTO ai_results (user_id, endpoint, input_data, result, model_used) VALUES ($1, $2, $3, $4, $5)',
    [userId, endpoint, JSON.stringify(inputData), JSON.stringify(result), model]
  );
}

module.exports = { callAI, parseAIJson, persistAIResult };
