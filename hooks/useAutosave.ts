import { useEffect, useRef, useState } from "react";

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function useAutosave<T>(
  data: T,
  saveFn: (data: T) => Promise<void>,
  debounceMs = 2000,
) {
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [isSaving, setIsSaving] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const latestDataRef = useRef(data);
  const saveFnRef = useRef(saveFn);

  useEffect(() => {
    saveFnRef.current = saveFn;
  }, [saveFn]);

  useEffect(() => {
    latestDataRef.current = data;
    const delay = Math.max(0, debounceMs ?? 0);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(async () => {
      setIsSaving(true);
      setSaveStatus("saving");

      try {
        await saveFnRef.current(latestDataRef.current);
        if (!mountedRef.current) return;
        setLastSavedAt(new Date());
        setSaveStatus("saved");
      } catch (error) {
        if (!mountedRef.current) return;
        console.error("Autosave failed", error);
        setSaveStatus("error");
      } finally {
        if (mountedRef.current) {
          setIsSaving(false);
        }
      }
    }, delay);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [data, debounceMs]);

  useEffect(
    () => () => {
      mountedRef.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    },
    [],
  );

  return { lastSavedAt, isSaving, saveStatus };
}
