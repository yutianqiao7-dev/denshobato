import { useEffect, useState } from 'react';
import { AppState as RNAppState } from 'react-native';

/** 一定間隔で現在時刻を返す。復帰時にもすぐ追いつく */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    const sub = RNAppState.addEventListener('change', (s) => {
      if (s === 'active') setNow(Date.now());
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [intervalMs]);

  return now;
}
