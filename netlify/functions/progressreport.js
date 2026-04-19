exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }, body: '' };
  }
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { student, stats, notes, weekLabel } = JSON.parse(event.body);
    const apiKey = process.env.ANTHROPIC_API_KEY;

    // Generate AI summary of the week
    const prompt = `You are writing a professional weekly progress report for a student at Metanoia Academy in Namibia.

Student: ${student.name}
Grade: ${student.grade}
Subject: ${student.subject}
Platform: ${student.platform}
Current Topic: ${student.topic || 'General'}
Neurodiverse needs: ${(student.nd && student.nd.length) ? student.nd.join(', ') : 'None noted'}

Week: ${weekLabel}
Sessions completed this week: ${stats.sessions}
Total time spent: ${stats.totalMins} minutes
Average session length: ${stats.avgDuration} minutes
Topics covered: ${stats.subjects ? stats.subjects.join(', ') : student.subject}

Session notes from tutor:
${notes || 'No specific notes recorded this week.'}

Write a warm, professional weekly progress report with these sections:
1. WEEKLY OVERVIEW (2-3 sentences summarising the week)
2. WHAT WE WORKED ON (bullet points of topics/skills covered)
3. PROGRESS HIGHLIGHTS (what the student did well)
4. AREAS FOR CONTINUED FOCUS (what needs more practice - frame positively)
5. RECOMMENDED HOME PRACTICE (1-2 specific suggestions)
${(student.nd && student.nd.length && !student.nd.includes('None')) ? '6. ND SUPPORT NOTES (brief note on accommodations used this week)' : ''}

Keep it warm, encouraging, and under 300 words. Address it to the parent/guardian.`;

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5', max_tokens: 600, messages: [{ role: 'user', content: prompt }] })
    });
    const aiData = await aiRes.json();
    const reportText = aiData.content[0].text;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ report: reportText })
    };
  } catch (err) {
    return { statusCode: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: err.message }) };
  }
};

