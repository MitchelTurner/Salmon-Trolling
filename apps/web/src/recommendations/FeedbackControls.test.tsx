import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FEEDBACK_QUESTION } from '@troll/shared';
import {
  TrollDatabase,
  getLocalDb,
  setLocalDb,
} from '../db/database.js';
import { ulid } from '../db/ulid.js';
import { FeedbackControls } from './FeedbackControls.js';
import { issueRecommendation } from './store.js';

describe('FeedbackControls', () => {
  beforeEach(async () => {
    const db = new TrollDatabase(`troll-ui-${ulid()}`);
    setLocalDb(db);
    await db.open();
  });

  afterEach(async () => {
    cleanup();
    const db = getLocalDb();
    db.close();
    await db.delete();
  });

  it('asks only what did you run instead after thumbs-down', async () => {
    const rec = await issueRecommendation({
      lightLevel: 0.1,
      turbidity: 0.2,
      weekOfYear: 24,
    });

    render(<FeedbackControls recommendationId={rec.id} />);

    fireEvent.click(
      screen.getByRole('button', { name: /thumbs down/i }),
    );
    expect(screen.getByText(FEEDBACK_QUESTION)).toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'glow spoony, slower troll' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(screen.getByText(/you ran:/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/glow spoony/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /thumbs down/i }),
    ).not.toBeInTheDocument();
  });
});
