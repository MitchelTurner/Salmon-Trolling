import { FEEDBACK_QUESTION } from '@troll/shared';
import { useEffect, useState } from 'react';
import { getFeedbackFor, submitThumbsDown } from './store.js';
import type { RecommendationFeedbackRecord } from './types.js';

type Props = {
  recommendationId: string;
};

/**
 * Thumbs-down asks exactly one question: what did you run instead?
 * No star ratings, no multi-field surveys.
 */
export function FeedbackControls({ recommendationId }: Props) {
  const [open, setOpen] = useState(false);
  const [ranInstead, setRanInstead] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<RecommendationFeedbackRecord | null>(null);

  useEffect(() => {
    void getFeedbackFor(recommendationId).then((row) => {
      if (row) setSaved(row);
    });
  }, [recommendationId]);

  if (saved) {
    return (
      <div
        className="flex flex-col gap-1 border border-hairline p-3"
        aria-label="Feedback recorded"
      >
        <p className="font-ui text-xs uppercase tracking-wide text-hairline/70">
          Feedback recorded
        </p>
        <p className="font-ui text-sm text-hairline">
          You ran: {saved.ranInstead}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2" aria-label="Recommendation feedback">
      {!open ? (
        <button
          type="button"
          className="flex min-h-hit items-center justify-center rounded-chart border border-hairline bg-deep px-4 font-ui text-sm text-hairline"
          onClick={() => {
            setOpen(true);
            setError(null);
          }}
        >
          Thumbs down — this was off
        </button>
      ) : (
        <form
          className="flex flex-col gap-2 border border-hairline p-3"
          onSubmit={(e) => {
            e.preventDefault();
            setBusy(true);
            setError(null);
            void submitThumbsDown({ recommendationId, ranInstead })
              .then((row) => {
                setSaved(row);
                setOpen(false);
              })
              .catch((err: unknown) => {
                setError(err instanceof Error ? err.message : 'save failed');
              })
              .finally(() => setBusy(false));
          }}
        >
          <label className="flex flex-col gap-1">
            <span className="font-ui text-sm font-medium text-hairline">
              {FEEDBACK_QUESTION}
            </span>
            <span className="font-ui text-xs text-hairline/70">
              Finish, depth, speed — whatever you actually put in the water.
            </span>
            <textarea
              className="min-h-[6rem] w-full rounded-chart border border-hairline bg-deep px-3 py-2 font-ui text-base text-hairline outline-none focus:border-flat"
              value={ranInstead}
              onChange={(e) => setRanInstead(e.target.value)}
              required
              maxLength={2000}
              autoFocus
            />
          </label>
          {error && (
            <p className="font-ui text-sm text-caution" role="alert">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy || ranInstead.trim().length === 0}
              className="flex min-h-hit flex-1 items-center justify-center rounded-chart border border-hairline bg-flat px-4 font-ui text-sm text-hairline disabled:opacity-50"
            >
              {busy ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              className="flex min-h-hit items-center justify-center rounded-chart border border-hairline px-4 font-ui text-sm text-hairline"
              onClick={() => {
                setOpen(false);
                setError(null);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
