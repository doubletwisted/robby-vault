export async function onRequestGet({ env }) {
  const kv = env.LIKES;
  if (!kv) return new Response('KV binding LIKES missing', { status: 500 });

  const list = await kv.list({ prefix: 'like:' });
  const out = {};

  for (const k of list.keys) {
    const id = k.name.slice('like:'.length);
    const v = await kv.get(k.name);
    out[id] = Number(v || 0);
  }

  return new Response(JSON.stringify(out), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}
