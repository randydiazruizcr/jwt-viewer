# JWT Viewer — Design Spec

Date: 2026-09-03
Status: Implemented. Sections below describe what was built; where the
implementation departed from the original design, the reason is stated
inline.

## Purpose

A client-side tool to decode, verify, and generate JSON Web Tokens (RFC 7519).
Functional scope is inspired by jwt.io (decode + verify + generate), but with
an original, modern visual design — not a visual clone.

## Scope

- Decode: paste a JWT, see header and payload as formatted JSON.
- Verify: check the signature against a provided secret (HS*) or public key
  (RS*/ES*/PS*), and report claim-based failures (e.g. expired) separately
  from signature failures.
- Generate: edit header/payload claims and sign a brand-new token with a
  provided secret/private key.
- 100% client-side. No backend, no network calls. Nothing — token or key
  material — ever leaves the browser. This must be visible in the UI (e.g.
  "Everything runs in your browser, nothing is sent to a server").
- Hosting/deployment target is intentionally undecided. The project is
  developed and verified locally first; hosting is a separate decision to be
  made after the tool works.

## Stack

Modeled on `novapos-web`'s stack, trimmed to what a backend-less tool needs:

- Next.js 16 (App Router), but the entire app is client-side (`"use client"`)
  under a single route. Next is used as a build/routing shell only — no API
  routes, no server actions, no server components doing real work.
- React 19, TypeScript, Tailwind v4.
- Zustand for state. TanStack Query is **not** used — there is nothing async
  to cache; all computation is local (Web Crypto resolves in the same tick,
  no network round-trip).
- No form library. The original stack list carried `react-hook-form` + `zod`
  over from novapos-web, but nothing here submits a form: every input is a
  controlled field bound straight to the Zustand store and validated as you
  type. Adding a form library would have meant a second source of truth for
  the same fields.
- `jose` for all JWT operations (decode/verify/sign) — runs on Web Crypto
  API, no native Node dependencies, supports HS/RS/ES/PS algorithm families.
- `lucide-react` for icons, `clsx` + `tailwind-merge` for class composition.
- Testing: Vitest + Testing Library (unit/component), Playwright (e2e).
- Tooling: ESLint, Prettier, Yarn Classic 1.22. Husky + lint-staged are
  **not** installed: `husky` needs a git repository to write hooks into, and
  whether this project uses git is a decision the owner deferred. Add them
  when that is settled.

## Architecture

No `feature/<domain>` folder layer (that pattern exists elsewhere in the
workspace to mirror a ticket board; this project has no ticket-driven
feature separation). Components are organized directly by domain:

```
src/
  app/
    layout.tsx
    page.tsx        # the whole screen: assembles the panels, holds no logic
    globals.css     # design tokens + the `token-glyphs` metrics both token layers share
    icon.svg
  components/
    ui/             # Button, Panel, CopyButton (own primitives, not shadcn)
    jwt-editor/     # TokenInput, JsonEditor, SignatureStatus, ClaimsTimeline
    jwt-keys/       # AlgorithmSelect, KeyInput (secret for HS* vs PEM for the rest)
  lib/
    jwt/
      decode.ts     # split + base64url decode, no signature validation
      verify.ts     # wrapper over jose.jwtVerify
      sign.ts       # wrapper over jose.SignJWT
      keys.ts       # PEM format validation + "is there enough key to verify/sign?"
      types.ts
    format/
      claims.ts     # iat/nbf/exp → readable dates and relative time
    cn.ts
  store/
    jwt-store.ts    # Zustand: raw token, header, payload, alg, key material, verification result
  test/
    setup.ts
    key-fixtures.ts # real PEM key pairs, generated per test run
```

Two components replaced what the design called `HeaderPanel` / `PayloadPanel`
/ `GenerateButton`: a single `JsonEditor` serves both header and payload
(they differ only in label and placeholder), and the generate button is
three lines of JSX in `page.tsx` rather than a component wrapping one store
action. `ClaimsTimeline` was added — see Components.

## UI approach

Single split-panel layout (jwt.io-inspired functionally, not visually):
left column is the raw-token textarea (3 segments color-highlighted while
typing), right side has decoded Header/Payload JSON editors plus a signature
panel (algorithm + key input + verification status). "Generate" is not a
separate screen — it's the same header/payload panels switched into edit
mode, so decode → edit → sign → verify happens in one continuous loop.

Rejected alternatives:

- Separate tabs per operation (Decode/Verify/Generate): rejected because
  decode and verify are used together constantly — splitting them forces
  re-pasting or losing context on tab switch.
- Full-screen mode toggle (Analyze vs Build): rejected because generate and
  verify are used in a cycle (generate, then verify what you just generated)
  — a full-screen toggle breaks that cycle.

## Components

- **TokenInput** — large textarea for the raw JWT. The 3 segments
  (header/payload/signature) are colored amber / teal / violet by a text
  layer painted _under_ a transparent textarea; both layers share the
  `token-glyphs` class so they wrap identically. A `contenteditable` would
  have allowed real markup but breaks paste, undo and screen readers.
  Debounced auto-decode (200 ms) on change, no "Decode" button.
- **JsonEditor** — one component, used for both header and payload. Raw text
  is the source of truth while editing (the JSON may be temporarily broken);
  the parsed object is what the rest of the app consumes.
- **ClaimsTimeline** — renders `iat` / `nbf` / `exp` as readable dates and
  relative time under the payload. Reads the clock through
  `useSyncExternalStore`, which keeps the render pure and avoids a
  server/client hydration mismatch.
- **AlgorithmSelect** — dropdown of algorithms supported by `jose` (HS256/
  384/512, RS256/384/512, ES256/384/512, PS256/384/512), bound to the
  header's `alg` claim.
- **KeyInput** — shape changes by algorithm: a single secret textarea for
  HS*, or public/private PEM textareas for RS*/ES*/PS*. Validates PEM format
  before use.
- **SignatureStatus** — status badge (Valid / Invalid / Unverified /
  Expired) with a reason when verification fails.
- **GenerateButton** — signs the current header/payload with the provided
  key, writes the result back into TokenInput, switches back to decode mode
  (which immediately verifies what was just signed).

## Data flow and state

Single Zustand store (`useJwtStore`) as the source of truth:

```ts
{
  rawToken: string
  headerText: string               // what the editor holds; may be broken JSON mid-edit
  payloadText: string
  header: object | null            // last text that actually parsed; null while broken
  payload: object | null
  headerError: string | null
  payloadError: string | null
  tokenError: string | null
  signError: string | null
  algorithm: JwsAlgorithm          // taken from header.alg, override-able via AlgorithmSelect
  keyMaterial: { type: 'secret'; secret } | { type: 'pem'; publicKey; privateKey }
  verification: { status: 'idle' | 'valid' | 'invalid' | 'expired' | 'error'; message? }
  mode: 'decode' | 'edit'
}
```

The design sketched `header` / `payload` as the only fields; the split into
`*Text` plus parsed value is what makes "mark the broken JSON without
discarding what the user typed" possible. `keyMaterial` is a discriminated
union rather than four optional fields, so an HS secret and a PEM pair can
never be half-populated at the same time.

Two actions exist beyond the design: `verifyNow()` (the setters fire it, and
tests await it, which keeps the async verification deterministic under test)
and `loadExample()`, which signs a demo token at runtime instead of shipping
a hardcoded one.

**Decode → verify (read mode):**

1. `TokenInput` changes → `setRawToken` action → `lib/jwt/decode.ts` splits
   the token into 3 segments and base64url-decodes header/payload (no Web
   Crypto involved, instant, no key needed) → updates `header`/`payload`/
   `algorithm`.
2. If `keyMaterial` is present, `lib/jwt/verify.ts` (wraps `jose.jwtVerify`)
   runs automatically → updates `verification`.
3. If no key is present, `verification.status` stays `idle` ("Unverified"
   in the UI, not treated as failure).

**Generate (edit mode):**

1. User edits HeaderPanel/PayloadPanel directly, or starts from a cleared
   store (`mode: 'edit'`).
2. With `keyMaterial` present, `GenerateButton` calls `lib/jwt/sign.ts`
   (wraps `jose.SignJWT`) → produces a new `rawToken` → written back into
   `TokenInput`, `mode` returns to `'decode'`, which triggers the flow above
   and verifies what was just signed.

All crypto is async (Web Crypto), but nothing goes over the network — no
loading states or caching layer needed.

## Error handling

Errors are resolved inline in the panel where they occur — no global modals
or toasts:

- **Malformed token** (not 3 segments, or a segment isn't valid base64url/
  JSON): TokenInput shows an inline error; header/payload stay `null` and
  the panels show an "Invalid token" placeholder instead of broken JSON.
- **Malformed key** (invalid PEM, empty secret for HS*): KeyInput validates
  before attempting verify/sign and marks the field with a specific error,
  without calling into `jose`.
- **Verification failure**: `jose.jwtVerify` throws (signature mismatch,
  unsupported `alg`, key doesn't match algorithm) → caught and translated
  into a specific message in SignatureStatus (distinct text per cause).
- **Expired token**: reported as an `exp` claim error by `jose`, but shown
  distinctly from an invalid signature (an "Expired" badge, not "Invalid")
  — they're different problems for someone debugging auth.
- **Invalid JSON while editing Header/Payload**: GenerateButton is disabled
  and the editor is marked, without discarding what the user typed.

A Next.js `ErrorBoundary` is a general safety net, not expected to trigger
in normal operation — all cases above are handled as state, not as
uncaught exceptions.

## Testing

- **Unit (Vitest)**: `lib/jwt/decode.ts`, `verify.ts`, `sign.ts` — valid
  cases per algorithm family (HS/RS/ES/PS), and every error case above
  (malformed token, incompatible key, expired, unsupported alg).
- **Component (Testing Library)**: TokenInput decodes on paste; KeyInput
  changes shape per algorithm; SignatureStatus renders the correct badge
  per verification state.
- **E2E (Playwright)**: generate → view signed token → auto-verify as
  valid; paste a known JWT fixture → decode → verify with its correct
  secret → valid; same fixture with a wrong secret → invalid.
