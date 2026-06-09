exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const GEMINI_KEY = 'AQ.Ab8RN6L3o0vECsKGQ1Yvj9EUqpJO4w7K9ri4wCp4dhreB30ldA';

  try {
    const { text } = JSON.parse(event.body);

    const prompt = `You are a hiring data parser for a real estate company in India. Parse this WhatsApp message and return ONLY valid JSON — no markdown, no backticks, no explanation.

Even if the message has spelling mistakes, short forms, or Hinglish — understand the intent and extract correctly.

Return this exact JSON structure:
{"name":"full candidate name","role":"KAM or DCM or AM","city":"one of: Mumbai/Pune/Bangalore/NCR/Navi Mumbai/KDMC","leader":"reporting manager name (usually in brackets)","status":"one of: Selected/Dropped/Joined/Offer Sent/Offer Not Sent/Pipeline/Rejected","communication":"one of: Excellent/Very Good/Good/Decent/Average/Below Average/Poor","hunger":"one of: Very High/High/Medium/Low","background":"previous company or domain","market":"market area they will cover","source":"Referral or Recruiter","ctc":"CTC terms as mentioned","rating":4,"tags":["2-4 short highlights"],"notes":"any other important info","remarks":"1-2 line summary of overall feedback"}

Rules:
- rating 1-5: 5=excellent, 4=good, 3=average, 2=weak, 1=poor
- Fix spelling mistakes intelligently
- leader name is usually in brackets like (Shashank) or (Majid)
- Use null for genuinely missing fields

Message:
${text}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 1000 }
        })
      }
    );

    const data = await res.json();
    const raw = data.candidates[0].content.parts[0].text;
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(parsed)
    };

  } catch (e) {
    console.error('Parse error:', e.message);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: e.message, stack: e.stack })
    };
  }
};
