export default function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  response.status(200).json({
    ok: true,
    service: 'my-performance',
    runtime: 'vercel-function',
    version: '3.0.0-alpha.1',
    timestamp: new Date().toISOString()
  });
}
