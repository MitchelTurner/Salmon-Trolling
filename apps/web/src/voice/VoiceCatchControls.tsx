import { useRef, useState } from 'react';
import {
  parseCatchUtterance,
  type CatchDraft,
} from './parse-catch-utterance.js';
import {
  createBrowserSpeechRecognition,
  isSpeechRecognitionAvailable,
  type SpeechRecognitionFactory,
  type SpeechSession,
} from './speech.js';

export type VoiceCatchControlsProps = {
  /** Apply draft fields into the confirm form — never writes a Catch by itself. */
  onDraft: (draft: CatchDraft) => void;
  speechFactory?: SpeechRecognitionFactory;
};

/**
 * Push-to-talk voice catch logging.
 * Parses to a draft only. The angler must confirm in the form — never auto-submit.
 */
export function VoiceCatchControls({
  onDraft,
  speechFactory = createBrowserSpeechRecognition,
}: VoiceCatchControlsProps) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<SpeechSession | null>(null);
  const finalRef = useRef('');
  const interimRef = useRef('');

  const nativeAvailable = isSpeechRecognitionAvailable();
  const usingInjected = speechFactory !== createBrowserSpeechRecognition;

  const stop = () => {
    // onEnd clears listening / sessionRef after the engine finishes.
    sessionRef.current?.stop();
  };

  const start = () => {
    setError(null);
    finalRef.current = '';
    interimRef.current = '';
    setInterim('');

    const session = speechFactory({
      onResult: (result) => {
        if (result.isFinal) {
          finalRef.current = `${finalRef.current} ${result.transcript}`.trim();
          interimRef.current = finalRef.current;
          setInterim(finalRef.current);
        } else {
          const text =
            `${finalRef.current} ${result.transcript}`.trim() ||
            result.transcript;
          interimRef.current = text;
          setInterim(text);
        }
      },
      onError: (message) => {
        setError(message);
        setListening(false);
        sessionRef.current = null;
      },
      onEnd: () => {
        setListening(false);
        sessionRef.current = null;
        const text = (finalRef.current || interimRef.current).trim();
        if (!text) return;
        // Draft only — parent must confirm before logCatch.
        onDraft(parseCatchUtterance(text));
      },
    });

    if (!session) {
      setError('Voice logging needs a browser with speech recognition.');
      return;
    }

    sessionRef.current = session;
    setListening(true);
    try {
      session.start();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'could not start mic');
      setListening(false);
      sessionRef.current = null;
    }
  };

  if (!nativeAvailable && !usingInjected) {
    return (
      <p className="font-ui text-xs text-hairline/60">
        Voice logging unavailable in this browser — type the catch instead.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2" aria-label="Voice catch logging">
      <button
        type="button"
        className={`min-h-hit w-full rounded-chart border px-4 font-ui text-base ${
          listening
            ? 'border-caution bg-land text-caution'
            : 'border-hairline bg-deep text-hairline'
        }`}
        aria-pressed={listening}
        data-testid="voice-log-button"
        onClick={() => {
          if (listening) stop();
          else start();
        }}
      >
        {listening ? 'Stop listening' : 'Voice log'}
      </button>
      {interim && (
        <p
          className="font-ui text-sm text-hairline/80"
          data-testid="voice-interim"
        >
          “{interim}”
        </p>
      )}
      {error && (
        <p className="font-ui text-sm text-caution" role="alert">
          {error}
        </p>
      )}
      <p className="font-ui text-xs text-hairline/60">
        Parses to a draft — you confirm before it is logged. Never auto-submits.
      </p>
    </div>
  );
}
