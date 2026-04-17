const https = require('https');

exports.handler = async function(event) {
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

  try {
    const { studentName, grade, subject, platform, duration, conversation } = JSON.parse(event.body);
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: { message: 'API key not configured on server.' } })
      };
    }

    const transcript = conversation.map(m => `${m.role === 'user' ? 'Student' : 'AI Tutor'}: ${m.content}`).join('\n\n');

    const prompt = `You are an educational analyst reviewing a tutoring session transcript. Write a concise session notes report based on the transcript below.

Student: ${studentName}
Grade: ${grade}
Subject: ${subject}
Platform: ${platform}
Session duration: ${duration} minutes

TRANSCRIPT:
${transcript}

Write the session notes in this exact format:

SESSION NOTES — ${studentName}
Date: ${new Date().toLocaleDateString('en-ZA', {day:'numeric',month:'long',year:'numeric'})}
Subject: ${subject} | Grade: ${grade} | Duration: ${duration} min

TOPICS COVERED
[List the main topics or concepts covered in the session]

STUDENT PERFORMANCE
[Describe how the student performed — what they understood well, what they found challenging]

BREAKTHROUGHS & WINS
[Any moments of understanding, progress, or positive engagement]

AREAS NEEDING ATTENTION
[What the student struggled with or needs more practice on]

RECOMMENDED NEXT STEPS
[2-3 specific things the student should focus on next session]

TUTOR NOTES
[Any observations about learning style, engagement, or support needs worth noting]`;

    const payload = JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    });

    const result = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Length': Buffer.byteLength(payload)
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      });
      req.on('error', reject);
      req.write(payload);
      req.end();
    });

    return {
      statusCode: result.status,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: result.body
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: { message: 'Function error: ' + err.message } })
    };
  }
};
