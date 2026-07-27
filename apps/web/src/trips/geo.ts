import type { GeoPositionSource, PositionSample } from './types.js';

function toSample(pos: GeolocationPosition): PositionSample {
  const { coords, timestamp } = pos;
  const sample: PositionSample = {
    tMs: timestamp,
    lon: coords.longitude,
    lat: coords.latitude,
  };

  const withSpeed =
    coords.speed != null && Number.isFinite(coords.speed)
      ? { ...sample, sogMs: coords.speed }
      : sample;

  const withCourse =
    coords.heading != null && Number.isFinite(coords.heading)
      ? {
          ...withSpeed,
          cogRad: (coords.heading * Math.PI) / 180,
          headingRad: (coords.heading * Math.PI) / 180,
        }
      : withSpeed;

  return withCourse;
}

/** Browser geolocation adapter. Keeps watching even when the document is hidden. */
export function createBrowserGeoSource(): GeoPositionSource {
  return {
    watch(onSample, onError) {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        onError(new Error('geolocation unavailable'));
        return { clear: () => undefined };
      }

      const id = navigator.geolocation.watchPosition(
        (pos) => onSample(toSample(pos)),
        (err) => onError(new Error(err.message)),
        {
          enableHighAccuracy: true,
          maximumAge: 1000,
          timeout: 15_000,
        },
      );

      return {
        clear: () => navigator.geolocation.clearWatch(id),
      };
    },
  };
}

export function createBrowserClock(): import('./types.js').Clock {
  return {
    now: () => Date.now(),
    setInterval: (fn, ms) => {
      const id = globalThis.setInterval(fn, ms);
      return { clear: () => globalThis.clearInterval(id) };
    },
  };
}

export function createBrowserVisibility(): import('./types.js').VisibilityApi {
  return {
    isHidden: () =>
      typeof document !== 'undefined' ? document.visibilityState === 'hidden' : false,
    addListener: (fn) => {
      if (typeof document === 'undefined') return () => undefined;
      const handler = () => fn();
      document.addEventListener('visibilitychange', handler);
      window.addEventListener('pagehide', handler);
      return () => {
        document.removeEventListener('visibilitychange', handler);
        window.removeEventListener('pagehide', handler);
      };
    },
  };
}
