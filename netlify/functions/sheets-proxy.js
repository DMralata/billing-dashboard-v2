export default async (request, context) => {
  const url = new URL(request.url);
  const sheetUrl = url.searchParams.get('url');

  if (!sheetUrl || !sheetUrl.startsWith('https://docs.google.com/spreadsheets/')) {
    return new Response('Invalid URL', { status: 400 });
  }

  const resp = await fetch(sheetUrl);
  const text = await resp.text();

  return new Response(text, {
    status: resp.status,
    headers: {
      'Content-Type': 'text/csv',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
    },
  });
};

export const config = { path: '/api/sheets-proxy' };
