import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";

/** Minimal data hook: GET a path, expose loading/error and a reload function */
export function useFetch<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [error, setError] = useState<string | null>(null);
  const reqId = useRef(0);

  const load = useCallback(async () => {
    if (!path) return;
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<T>(path);
      if (id === reqId.current) setData(result);
    } catch (e) {
      if (id === reqId.current) setError((e as Error).message);
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, setData, loading, error, reload: load };
}
