exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const GEMINI_KEY = process.env.GEMINI_KEY || 'AQ.Ab8RN6L3o0vECsKGQ1Yvj9EUqpJO4w7K9ri4wCp4dhreB30ldA';

  try {
    const { text } = JSON.parse(event.body);
    if (!text) throw new Error('No text provided');

    const prompt = `You are a hiring data parser for a real estate company in India. Parse this WhatsApp message and return ONLY valid JSON — no markdown, no backticks, no explanation.

Even if the message has spelling mistakes, short forms, or Hinglish — understand the intent and extract correctly.

Return this exact JSON structure:
{"name":"full candidate name","role":"KAM or DCM or AM","city":"one of: Mumbai/Pune/Bangalore/NCR/Navi Mumbai/KDMC","leader":"reporting manager name usually in brackets","status":"one of: Selected/Dropped/Joined/Offer Sent/Offer Not Sent/Pipeline/Rejected","communication":"one of: Excellent/Very Good/Good/Decent/Average/Below Average/Poor","hunger":"one of: Very High/High/Medium/Low","background":"previous company or domain","market":"market area","source":"Referral or Recruiter","ctc":"CTC terms","rating":4,"tags":["highlight1","highlight2"],"notes":"","remarks":"1-2 line summary"}

Rules: rating 1-5. Fix spelling mistakes. Use null for missing fields.

Message: ${text}`;

    // Try gemini-1.5-flash first
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;
    
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 1000 }
      })
    });

    const rawText = await res.text();
    console.log('Gemini status:', res.status);
    console.log('Gemini response:', rawText.slice(0, 500));

    if (!res.ok) {
      throw new Error(`Gemini API error ${res.status}: ${rawText}`);
    }

    const data = JSON.parse(rawText);
    const generated = data.candidates[0].content.parts[0].text;
    const clean = generated.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(parsed)
    };

  } catch (e) {
    console.error('Handler error:', e.message);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: e.message })
    };
  }
};
