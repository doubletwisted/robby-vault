function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

function bad(msg, status = 400) {
  return json({ ok: false, error: msg }, status);
}

export async function onRequestPost({ request, env }) {
  const kv = env.LIKES;
  if (!kv) return bad('KV binding LIKES missing', 500);

  const client = request.headers.get('x-client-id') || '';
  if (!client || client.length < 8) return bad('missing client id', 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return bad('invalid json');
  }

  const id = String(body?.id || '').trim();
  if (!id) return bad('missing id');

  // allowlist to prevent arbitrary key spam
  // we accept ids like: robby_flux.html / robby_ca_rule110.html
  if (!/^robby_[a-z0-9_\-]+\.html$/.test(id)) return bad('invalid id');

  const userKey = `u:${client}:${id}`;
  const countKey = `like:${id}`;

  const already = await kv.get(userKey);
  const next = !already; // toggle

  // naive counters (KV isn't atomic; acceptable for this use)
  const cur = Number((await kv.get(countKey)) || 0);
  const newCount = Math.max(0, cur + (next ? 1 : -1));

  if (next) {
    await kv.put(userKey, '1', { expirationTtl: 60 * 60 * 24 * 365 }); // 1 year
  } else {
    await kv.delete(userKey);
  }
  await kv.put(countKey, String(newCount));

  return json({ ok: true, id, liked: next, count: newCount });
}
