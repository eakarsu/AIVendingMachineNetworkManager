require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = 'anthropic/claude-3-5-sonnet-20241022';

function parseAIJson(content) {
  try { return JSON.parse(content); } catch {}
  try {
    const stripped = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(stripped);
  } catch {}
  try {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch {}
  return null;
}

async function callAI(systemPrompt, userPrompt) {
  if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === 'your-openrouter-api-key-here') {
    return {
      error: false,
      result: {
        summary: 'AI Demo Mode - No API key configured',
        details: 'Please set OPENROUTER_API_KEY in your .env file to get real AI predictions.',
        recommendations: ['Configure your OpenRouter API key', 'Restart the application'],
        confidence: 0,
        model: OPENROUTER_MODEL
      }
    };
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'AI Vending Machine Network Manager'
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const parsed = parseAIJson(content);
    return { error: false, result: parsed || { summary: content, raw: true }, model: OPENROUTER_MODEL };
  } catch (err) {
    console.error('AI Service Error:', err.message);
    return { error: true, message: err.message };
  }
}

async function persistAIResult(pool, userId, endpoint, inputData, result) {
  try {
    await pool.query(
      'INSERT INTO ai_results (user_id, endpoint, input_data, result) VALUES ($1, $2, $3, $4)',
      [userId, endpoint, JSON.stringify(inputData), JSON.stringify(result)]
    );
  } catch (e) {
    console.error('Failed to persist AI result:', e.message);
  }
}

module.exports = { callAI, parseAIJson, persistAIResult };
