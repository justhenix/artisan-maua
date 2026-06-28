import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { env } from '$env/dynamic/private';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { text, client } = await request.json();

		if (!text) {
			return json({ success: false, error: 'Input text is required' }, { status: 400 });
		}

		// 1. Fetch catalog items for LLM context
		const catalogRes = await db.execute('SELECT * FROM catalog_items');
		const catalog = catalogRes.rows.map((row: any) => ({
			styleCode: row.style_code,
			title: row.title,
			category: row.category,
			material: row.material,
			notes_en: row.notes_en,
			notes_id: row.notes_id,
			imageUrl: row.image_url
		}));

		// 2. Determine AI Provider and key
		const geminiKey = env.GEMINI_API_KEY;
		const anthropicKey = env.ANTHROPIC_API_KEY;

		if (!geminiKey && !anthropicKey) {
			return json({ success: false, error: 'No AI API keys configured' }, { status: 500 });
		}

		const prompt = `
You are an expert order processing AI assistant for Heather Benjamin Jewelry.
Your task is to parse a messy purchase order, email, DM, or spreadsheet text and extract structured line items and identify any production blockers.

Master Catalog Context (Official Style Codes, Titles, categories, materials, etc.):
${JSON.stringify(catalog, null, 2)}

Input Order Text:
${text}

For each line item in the input text:
1. Extract the raw item description, quantity, price, and notes.
2. Resolve it against the Master Catalog to find the matching 'styleCode' and retrieve its 'imageUrl'. If it is ambiguous, does not match, or is missing required details, set 'styleCode' to null or empty string.
3. Identify any production blockers (High or Medium impact) that require human input before production can start in Bali.
   - Example 1: Missing or ambiguous size (e.g. Starburst Ring size).
   - Example 2: Missing or ambiguous finish/material (e.g. Gold vs Silver).
   - Each blocker MUST have:
     - 'id': unique string (e.g., 'star-bird-finish')
     - 'impact': 'High impact' or 'Medium impact'
     - 'question': a clear question for the user (e.g. 'Which Black Lip Star with Bird of Prey Dangle finish should Bali make?')
     - 'evidence': the exact text snippet from the order
     - 'risk': why this is a production risk (e.g. 'Finish changes metal casting, material cost, etc.')
     - 'options': array of potential choices for the user to select

Return ONLY a valid JSON object matching this schema:
{
  "lineItems": [
    {
      "id": "item-unique-id",
      "item": "Raw input item description",
      "styleCode": "MATCHED-STYLE-CODE-OR-EMPTY",
      "qty": 10,
      "finish": "Silver or Gold Vermeil or empty",
      "notes": "Any notes",
      "unitPrice": 120.0,
      "imageUrl": "Matched image URL or empty",
      "source": "Input snippet context"
    }
  ],
  "blockers": [
    {
      "id": "blocker-id",
      "impact": "High impact",
      "question": "Question text",
      "evidence": "Evidence text",
      "risk": "Risk text",
      "options": ["Option A", "Option B"],
      "answer": ""
    }
  ]
}
Do not output markdown code blocks or any leading/trailing text. Just raw JSON.
`;

		let responseText = '';

		if (geminiKey) {
			// Call Google Gemini API
			console.log('Calling Google Gemini API...');
			const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${geminiKey}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					contents: [{
						parts: [{ text: prompt }]
					}],
					generationConfig: {
						responseMimeType: 'application/json'
					}
				})
			});

			if (!res.ok) {
				const errText = await res.text();
				throw new Error(`Gemini API returned status ${res.status}: ${errText}`);
			}

			const data = await res.json();
			responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
		} else if (anthropicKey) {
			// Call Anthropic Claude API
			console.log('Calling Anthropic Claude API...');
			const res = await fetch('https://api.anthropic.com/v1/messages', {
				method: 'POST',
				headers: {
					'x-api-key': anthropicKey,
					'anthropic-version': '2023-06-01',
					'content-type': 'application/json'
				},
				body: JSON.stringify({
					model: 'claude-3-5-sonnet-20241022',
					max_tokens: 4000,
					messages: [{ role: 'user', content: prompt }]
				})
			});

			if (!res.ok) {
				const errText = await res.text();
				throw new Error(`Claude API returned status ${res.status}: ${errText}`);
			}

			const data = await res.json();
			responseText = data.content?.[0]?.text || '';
		}

		// Clean and parse JSON response
		const cleanJson = responseText.replace(/^[^{]*|[^}]*$/g, '');
		const parsed = JSON.parse(cleanJson);

		return json({
			success: true,
			lineItems: parsed.lineItems || [],
			blockers: parsed.blockers || []
		});

	} catch (err: any) {
		console.error('AI Processing Error:', err);
		return json({ success: false, error: err.message }, { status: 500 });
	}
};
