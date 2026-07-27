import type { DerbyRegistrationReceipt } from '@troll/shared';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';

function apiBase(): string | null {
  const base = import.meta.env.VITE_API_BASE as string | undefined;
  return base ? base.replace(/\/$/, '') : null;
}

/**
 * Public derby registration — waiver then Stripe Checkout.
 * After payment, success URL should hit /derbies/:slug/register?session_id=...
 */
export function RegisterPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [signerName, setSignerName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<DerbyRegistrationReceipt | null>(null);

  useEffect(() => {
    if (!slug || !sessionId || receipt?.paid) return;
    const base = apiBase();
    if (!base) {
      setError('Registration opens when the API is available.');
      return;
    }
    let cancelled = false;
    setBusy(true);
    setError(null);
    void fetch(`${base}/derbies/${encodeURIComponent(slug)}/register/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Could not finalize registration');
        const body = (await res.json()) as {
          registration: DerbyRegistrationReceipt;
        };
        if (!cancelled) setReceipt(body.registration);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'complete failed');
        }
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, sessionId, receipt?.paid]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!slug) return;
    if (!agreed) {
      setError('Sign the waiver to continue.');
      return;
    }
    const base = apiBase();
    if (!base) {
      setError('Registration opens when the API is available.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const origin = window.location.origin;
      const res = await fetch(
        `${base}/derbies/${encodeURIComponent(slug)}/register`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            displayName,
            email,
            successUrl: `${origin}/derbies/${slug}/register?session_id={CHECKOUT_SESSION_ID}`,
            cancelUrl: `${origin}/derbies/${slug}/register`,
            waiver: {
              signerName: signerName || displayName,
              signatureData: `typed:${signerName || displayName}`,
            },
          }),
        },
      );
      if (!res.ok) throw new Error('Registration failed');
      const body = (await res.json()) as {
        registration: DerbyRegistrationReceipt;
      };
      setReceipt(body.registration);
      if (body.registration.checkoutUrl) {
        window.location.assign(body.registration.checkoutUrl);
        return;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'register failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col bg-deep text-hairline">
      <header className="border-b border-hairline px-4 py-4">
        <p className="font-ui text-xs uppercase tracking-wide text-hairline/70">
          Derby registration
        </p>
        <h1 className="font-data text-2xl tracking-wide">{slug ?? '—'}</h1>
      </header>

      <main className="flex flex-1 flex-col gap-4 p-4">
        {receipt?.paid && receipt.ticketCode ? (
          <section className="flex flex-col gap-2">
            <p className="font-ui text-lg font-medium">You are registered</p>
            <p className="font-data text-xl tracking-wide">{receipt.ticketCode}</p>
            <p className="font-ui text-sm text-hairline/80">
              Bring this ticket to the official weigh-in station.
            </p>
          </section>
        ) : (
          <form className="flex flex-col gap-3" onSubmit={onSubmit}>
            <label className="flex flex-col gap-1 font-ui text-sm">
              Display name
              <input
                className="border border-hairline/40 bg-transparent px-3 py-2"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                autoComplete="name"
              />
            </label>
            <label className="flex flex-col gap-1 font-ui text-sm">
              Email
              <input
                type="email"
                className="border border-hairline/40 bg-transparent px-3 py-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </label>
            <label className="flex flex-col gap-1 font-ui text-sm">
              Waiver signature (type full name)
              <input
                className="border border-hairline/40 bg-transparent px-3 py-2"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                required
              />
            </label>
            <label className="flex items-start gap-2 font-ui text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <span>
                I accept the derby waiver and rules. Official weigh-in only —
                app catch logs do not count as entries.
              </span>
            </label>
            <button
              type="submit"
              disabled={busy}
              className="border border-hairline bg-hairline px-4 py-3 font-ui text-sm font-medium text-deep disabled:opacity-50"
            >
              {busy ? 'Working…' : 'Pay & register'}
            </button>
          </form>
        )}

        {error && (
          <p className="font-ui text-sm text-caution" role="alert">
            {error}
          </p>
        )}

        <Link
          to={`/derbies/${slug ?? ''}`}
          className="font-ui text-xs underline text-hairline/70"
        >
          Leaderboard
        </Link>
      </main>
    </div>
  );
}
