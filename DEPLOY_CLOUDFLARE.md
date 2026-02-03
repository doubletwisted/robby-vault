# Deploy on Cloudflare Pages (with global likes)

This repo is a **static site** plus **Cloudflare Pages Functions** for anonymous global likes.

## 1) Create KV namespace
Cloudflare Dashboard → **Workers & Pages** → **KV** → Create namespace:
- Name: `robby-vault-likes`

## 2) Bind KV to the Pages project
Cloudflare Dashboard → **Pages** → your project → **Settings** → **Functions** → **KV namespaces**:
- Binding name: `LIKES`
- KV namespace: `robby-vault-likes`

## 3) Deploy
Pages → Connect repo → Framework: **None** → Build command: *(empty)* → Output: `/`

## API
- `GET /api/likes` → `{ "robby_foo.html": 12, ... }`
- `POST /api/like` (header `x-client-id`) body `{ "id": "robby_foo.html" }` → `{ ok, id, liked, count }`

## Notes
- Likes are anonymous; per-browser identity is stored in localStorage.
- KV counters are not strictly atomic; counts are "eventually consistent" (fine for this use).
