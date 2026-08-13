import { useEffect, useRef, useState } from 'react';

export function useIntersectionObserver<T extends Element>(
  options: IntersectionObserverInit = { root: null, rootMargin: '100px', threshold: 0 }
) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const elementRef = useRef<T | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [options.root, options.rootMargin, options.threshold]);

  return [elementRef, isIntersecting] as const;
}
