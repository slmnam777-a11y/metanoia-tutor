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
    const { studentName, grade, subject, platform, sessionNotes, centerName, tutorName } = JSON.parse(event.body);
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: { message: 'API key not configured on server.' } })
      };
    }

    const today = new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const weekStartStr = weekStart.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long' });

    const prompt = `You are writing a warm, professional weekly progress report for a parent from Metanoia Academy, an education centre in Namibia.

Write in a friendly, encouraging tone — parents are not educators, so avoid jargon. Be specific about what their child worked on and how they are doing. Always end on a positive, motivating note.

Student: ${studentName}
Grade: ${grade}
Subject: ${subject}
Platform: ${platform}
Tutor: ${tutorName}
Center: ${centerName}
Report period: ${weekStartStr} – ${today}

SESSION NOTES FROM THIS WEEK:
${sessionNotes}

Write the parent report in this exact format:

Dear Parent/Guardian of ${studentName},

[Opening paragraph — warm greeting, mention the week's sessions and overall tone]

WHAT WE WORKED ON THIS WEEK
[2-3 sentences describing the topics and activities in simple, parent-friendly language]

HOW ${studentName.toUpperCase()} IS DOING
[Honest but encouraging assessment of progress, effort, and attitude]

HIGHLIGHTS FROM THIS WEEK
[1-2 specific positive moments or breakthroughs worth celebrating]

AREAS WE ARE FOCUSING ON
[What needs more practice — framed positively as growth areas, not weaknesses]

HOW YOU CAN HELP AT HOME
[2-3 simple, practical suggestions for parents to support learning at home]

LOOKING AHEAD
[What will be covered next week]

Please don't hesitate to contact us if you have any questions about ${studentName}'s progress.

Warm regards,
${tutorName}
Metanoia Academy — ${centerName}`;

    const payload = JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
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
