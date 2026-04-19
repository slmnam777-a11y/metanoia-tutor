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
    const { username, password } = JSON.parse(event.body);
    const validUsername = process.env.TUTOR_USERNAME;
    const validPassword = process.env.TUTOR_PASSWORD;

    if (!validUsername || !validPassword) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: false, error: 'Auth not configured on server.' })
      };
    }

    if (username === validUsername && password === validPassword) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: true })
      };
    } else {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ success: false, error: 'Invalid username or password.' })
      };
    }
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: false, error: 'Server error: ' + err.message })
    };
  }
};

