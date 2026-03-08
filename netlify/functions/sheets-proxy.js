exports.handler = async function(event) {
  // Use rawQuery to avoid Netlify decoding %26 into & and splitting gid off
  const raw = event.rawQuery || '';
  const match = raw.match(/(?:^|&)url=([^&]*.*)/);
  const sheetUrl = match ? decodeURIComponent(match[1]) : null;

  if (!sheetUrl || !sheetUrl.startsWith('https://docs.google.com/spreadsheets/')) {
    return { statusCode: 400, body: `Invalid URL: ${sheetUrl}` };
  }

  try {
    const resp = await fetch(sheetUrl);
    const text = await resp.text();
    return {
      statusCode: resp.status,
      headers: {
        'Content-Type': 'text/csv',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache',
      },
      body: text,
    };
  } catch (err) {
    return { statusCode: 500, body: err.message };
  }
};
