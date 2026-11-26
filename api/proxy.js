const TARGET_MAP = {
  lb: 'http://20.244.34.101:5000',
  'server-1': 'http://52.172.229.225:5001',
  'server-2': 'http://20.193.245.71:5001',
  'server-3': 'http://52.172.255.132:5001',
};

async function readRequestBody(req) {
  if (req.method === 'GET' || req.method === 'HEAD') return undefined;
  if (req.body !== undefined) {
    if (Buffer.isBuffer(req.body)) return req.body;
    if (typeof req.body === 'string') return req.body;
    return JSON.stringify(req.body);
  }
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return chunks.length > 0 ? Buffer.concat(chunks) : undefined;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const targetKey = Array.isArray(req.query?.target) ? req.query.target[0] : req.query?.target;
  const upstreamBase = TARGET_MAP[targetKey];
  if (!upstreamBase) {
    return res.status(400).json({ status: 'error', message: 'Invalid proxy target' });
  }

  const rawRest = Array.isArray(req.query?.rest) ? req.query.rest.join('/') : req.query?.rest || '';
  const cleanRest = String(rawRest).replace(/^\/+/, '');

  const forwardQuery = new URLSearchParams();
  if (req.query && typeof req.query === 'object') {
    for (const [k, v] of Object.entries(req.query)) {
      if (k === 'target' || k === 'rest') continue;
      if (Array.isArray(v)) {
        for (const item of v) forwardQuery.append(k, String(item));
      } else if (v !== undefined) {
        forwardQuery.set(k, String(v));
      }
    }
  }
  const qs = forwardQuery.toString();
  const upstreamUrl = `${upstreamBase}/${cleanRest}${qs ? `?${qs}` : ''}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 9000);

  try {
    const body = await readRequestBody(req);
    const headers = {};
    if (req.headers['content-type']) {
      headers['content-type'] = req.headers['content-type'];
    } else if (body !== undefined) {
      headers['content-type'] = 'application/json';
    }

    const upstreamRes = await fetch(upstreamUrl, {
      method: req.method || 'GET',
      headers,
      body,
      signal: controller.signal,
    });

    const contentType = upstreamRes.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    const buffer = Buffer.from(await upstreamRes.arrayBuffer());
    return res.status(upstreamRes.status).send(buffer);
  } catch (err) {
    const isTimeout = err?.name === 'AbortError';
    return res.status(isTimeout ? 504 : 502).json({
      status: 'error',
      message: isTimeout
        ? `Upstream timeout reaching ${targetKey}`
        : `Upstream unreachable (${err?.message || 'network error'})`,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
