require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5';

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

    try {
      return { error: false, result: JSON.parse(content), model: OPENROUTER_MODEL };
    } catch {
      return { error: false, result: { summary: content, raw: true }, model: OPENROUTER_MODEL };
    }
  } catch (err) {
    console.error('AI Service Error:', err.message);
    return { error: true, message: err.message };
  }
}

module.exports = { callAI };
