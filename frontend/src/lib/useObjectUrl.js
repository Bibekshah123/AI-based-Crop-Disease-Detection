import { useEffect, useRef, useState, useCallback } from "react";

/* Creates object URLs for File/Blob previews and revokes them automatically
   to avoid memory leaks. Returns [url, setFile, clear]. */
export function useObjectUrl() {
  const [url, setUrl] = useState(null);
  const current = useRef(null);

  const revoke = useCallback(() => {
    if (current.current) {
      URL.revokeObjectURL(current.current);
      current.current = null;
    }
  }, []);

  const setFile = useCallback(
    (file) => {
      revoke();
      if (file) {
        const next = URL.createObjectURL(file);
        current.current = next;
        setUrl(next);
      } else {
        setUrl(null);
      }
    },
    [revoke]
  );

  const clear = useCallback(() => {
    revoke();
    setUrl(null);
  }, [revoke]);

  useEffect(() => revoke, [revoke]);

  return [url, setFile, clear];
}
