import { useState, useCallback, useRef } from 'react';

export function useAnimatedFields() {
  const [highlightingFields, setHighlightingFields] = useState<string[]>([]);
  const queueRef = useRef<string[]>([]);
  const processingRef = useRef(false);

  const queueFields = useCallback((fieldNames: string[]) => {
    queueRef.current = [...queueRef.current, ...fieldNames];
    if (processingRef.current) return;

    processingRef.current = true;
    const runNext = () => {
      const field = queueRef.current.shift();
      if (!field) {
        processingRef.current = false;
        return;
      }

      setHighlightingFields(prev => [...prev, field]);
      setTimeout(() => {
        setHighlightingFields(prev => prev.filter(f => f !== field));
        runNext();
      }, 700);
    };

    runNext();
  }, []);

  const clearHighlighting = useCallback(() => {
    queueRef.current = [];
    setHighlightingFields([]);
    processingRef.current = false;
  }, []);

  return { highlightingFields, queueFields, clearHighlighting };
}
