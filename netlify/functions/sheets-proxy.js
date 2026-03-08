exports.handler = async function(event) {
  const rawUrl = event.queryStringParameters?.url;
  const sheetUrl = rawUrl ? decodeURIComponent(rawUrl) : null;

  if (!sheetUrl || !sheetUrl.startsWith('https://docs.google.com/spreadsheets/')) {
    return { statusCode: 400, body: 'Invalid URL' };
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
