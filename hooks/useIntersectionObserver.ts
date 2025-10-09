import { useEffect, useRef } from 'react';

export function useIntersectionObserver(
  callback: () => void,
  options?: IntersectionObserverInit
) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!elementRef.current) return;

    observerRef.current = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        callback();
      }
    }, options);

    observerRef.current.observe(elementRef.current);

    return () => observerRef.current?.disconnect();
  }, [callback, options]);

  return elementRef;
}

