import { useEffect, useState } from "react";

const useStateSyncDebounce = <T = unknown>(
  relayState: T,
  delay: number
): [T, boolean] => {
  const [state, setState] = useState<T>(relayState);
  const [debouncing, setDebouncing] = useState(false);

  useEffect(() => {
    setDebouncing(true);
    const handler = setTimeout(() => {
      setState(relayState);
      setDebouncing(false);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [relayState, delay]);

  return [state, debouncing];
};

export { useStateSyncDebounce };
