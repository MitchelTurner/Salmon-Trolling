/**
 * Thin adapter over the Web Speech API.
 * Injectable for tests — the parser never depends on the mic.
 */

export type SpeechRecognitionResultLike = {
  readonly transcript: string;
  readonly isFinal: boolean;
};

export type SpeechSession = {
  start: () => void;
  stop: () => void;
  abort: () => void;
};

export type SpeechRecognitionFactory = (handlers: {
  onResult: (result: SpeechRecognitionResultLike) => void;
  onError: (message: string) => void;
  onEnd: () => void;
}) => SpeechSession | null;

type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((ev: {
    results: ArrayLike<{
      isFinal: boolean;
      0: { transcript: string };
    }>;
    resultIndex: number;
  }) => void) | null;
  onerror: ((ev: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechCtor = new () => BrowserSpeechRecognition;

function getBrowserCtor(): SpeechCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechCtor;
    webkitSpeechRecognition?: SpeechCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionAvailable(): boolean {
  return getBrowserCtor() !== null;
}

/** Default factory using the browser SpeechRecognition implementation. */
export const createBrowserSpeechRecognition: SpeechRecognitionFactory = (
  handlers,
) => {
  const Ctor = getBrowserCtor();
  if (!Ctor) return null;

  const recognition = new Ctor();
  recognition.lang = 'en-US';
  recognition.continuous = false;
  recognition.interimResults = true;

  recognition.onresult = (ev) => {
    for (let i = ev.resultIndex; i < ev.results.length; i += 1) {
      const row = ev.results[i];
      if (!row) continue;
      const alt = row[0];
      if (!alt) continue;
      handlers.onResult({
        transcript: alt.transcript,
        isFinal: row.isFinal,
      });
    }
  };
  recognition.onerror = (ev) => {
    handlers.onError(ev.error ?? 'speech recognition error');
  };
  recognition.onend = () => {
    handlers.onEnd();
  };

  return {
    start: () => recognition.start(),
    stop: () => recognition.stop(),
    abort: () => recognition.abort(),
  };
};
