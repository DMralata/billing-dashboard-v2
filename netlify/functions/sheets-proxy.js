exports.handler = async function(event) {
  const raw = event.rawQuery || '';
  const match = raw.match(/(?:^|&)url=([^&]*.*)/);
  const sheetUrl = match ? decodeURIComponent(match[1]) : null;
  if (!sheetUrl || !sheetUrl.startsWith('https://docs.google.com/spreadsheets/')) {
    return { statusCode: 400, body: `Invalid URL: ${sheetUrl}` };
  }
  try {
    const resp = await fetch(sheetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
    });
    const text = await resp.text();
    if (text.trim().startsWith('<!')) {
      return { statusCode: 403, body: 'Google returned an HTML page — sheet may not be published. Go to File → Share → Publish to web → CSV.' };
    }
    return {
      statusCode: 200,
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
