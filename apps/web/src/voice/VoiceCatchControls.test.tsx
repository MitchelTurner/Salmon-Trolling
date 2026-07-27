import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { VoiceCatchControls } from './VoiceCatchControls.js';
import type { SpeechRecognitionFactory } from './speech.js';

afterEach(() => {
  cleanup();
});

describe('VoiceCatchControls', () => {
  it('parses speech into a draft and never auto-submits a catch', async () => {
    const onDraft = vi.fn();
    let emit: ((transcript: string) => void) | null = null;

    const factory: SpeechRecognitionFactory = (handlers) => {
      emit = (transcript: string) => {
        handlers.onResult({ transcript, isFinal: true });
      };
      return {
        start: () => undefined,
        stop: () => handlers.onEnd(),
        abort: () => undefined,
      };
    };

    render(<VoiceCatchControls onDraft={onDraft} speechFactory={factory} />);

    fireEvent.click(screen.getByTestId('voice-log-button'));
    emit?.('coho twelve pounds forty-five feet green flasher');
    fireEvent.click(screen.getByTestId('voice-log-button')); // stop → draft

    await waitFor(() => {
      expect(onDraft).toHaveBeenCalledTimes(1);
    });

    const draft = onDraft.mock.calls[0]?.[0];
    expect(draft.species).toBe('coho');
    expect(draft.massLb).toBe(12);
    expect(draft.lengthFt).toBe(45);
    expect(draft.notes).toBe('green flasher');

    // Voice controls have no Log catch button — confirmation is elsewhere.
    expect(screen.queryByRole('button', { name: /log catch/i })).toBeNull();
  });
});
