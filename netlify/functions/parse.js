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
 
  const GROQ_KEY = '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';
 
  try {
    const { text } = JSON.parse(event.body);
    if (!text) throw new Error('No text provided');
 
    const prompt = `You are a hiring data parser for a real estate company in India. Parse this WhatsApp message and return ONLY valid JSON — no markdown, no backticks, no explanation whatsoever.
 
Even if the message has spelling mistakes, short forms, or Hinglish — understand the intent and extract correctly.
 
Return this exact JSON:
{"name":"full candidate name","role":"KAM or DCM or AM","city":"one of: Mumbai/Pune/Bangalore/NCR/Navi Mumbai/KDMC","leader":"reporting manager name usually in brackets","status":"one of: Selected/Dropped/Joined/Offer Sent/Offer Not Sent/Pipeline/Rejected","communication":"one of: Excellent/Very Good/Good/Decent/Average/Below Average/Poor","hunger":"one of: Very High/High/Medium/Low","background":"previous company or domain","market":"market area","source":"Referral or Recruiter","ctc":"CTC terms","rating":4,"tags":["highlight1","highlight2"],"notes":"","remarks":"1-2 line summary"}
 
Rules:
- rating 1-5: 5=excellent, 4=good, 3=average, 2=weak, 1=poor
- Fix spelling mistakes intelligently
- leader name is usually in brackets like (Shashank) or (Majid)
- Use null for genuinely missing fields
- Return ONLY the JSON object, nothing else
 
Message: ${text}`;
 
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + GROQ_KEY
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 1000
      })
    });
 
    const data = await res.json();
    
    if (!res.ok) {
      throw new Error('Groq error ' + res.status + ': ' + JSON.stringify(data));
    }
 
    const raw = data.choices[0].message.content;
    const clean = raw.replace(/```json|```/g, '').trim();
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
    console.error('Error:', e.message);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: e.message })
    };
  }
};
