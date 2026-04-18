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
    const { text } = JSON.parse(event.body);
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'ElevenLabs API key not configured.' })
      };
    }

    // First get available voices to find one we can use
    const voicesResult = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.elevenlabs.io',
        path: '/v1/voices',
        method: 'GET',
        headers: {
          'xi-api-key': apiKey,
          'Accept': 'application/json'
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      });
      req.on('error', reject);
      req.end();
    });

    let voiceId = 'EXAVITQu4vr4xnSDxMaL'; // Sarah - default fallback
    
    if (voicesResult.status === 200) {
      const voicesData = JSON.parse(voicesResult.body);
      const voices = voicesData.voices || [];
      // Prefer a female voice
      const femaleVoice = voices.find(v => 
        v.labels && (v.labels.gender === 'female') && v.voice_id
      ) || voices[0];
      if (femaleVoice) voiceId = femaleVoice.voice_id;
    }

    const payload = JSON.stringify({
      text: text.slice(0, 500),
      model_id: 'eleven_turbo_v2_5',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.2,
        use_speaker_boost: true
      }
    });

    const result = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.elevenlabs.io',
        path: `/v1/text-to-speech/${voiceId}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
          'Accept': 'audio/mpeg',
          'Content-Length': Buffer.byteLength(payload)
        }
      }, (res) => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => resolve({
          status: res.statusCode,
          contentType: res.headers['content-type'],
          body: Buffer.concat(chunks)
        }));
      });
      req.on('error', reject);
      req.write(payload);
      req.end();
    });

    if (result.status !== 200) {
      return {
        statusCode: result.status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'ElevenLabs error: ' + result.body.toString() })
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600'
      },
      body: result.body.toString('base64'),
      isBase64Encoded: true
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Function error: ' + err.message })
    };
  }
};
