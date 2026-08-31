import { useLayoutEffect, useRef, useState } from 'react';

/** Measure the full command row, including commands moved into the menu. */
export function useToolbarOverflow() {
  const ref = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);
  useLayoutEffect(() => {
    const row = ref.current;
    if (!row) return;
    const measure = () => {
      const children = [...row.children].filter((child) =>
        !child.matches('[data-toolbar-spacer], [data-toolbar-overflow], [popover]'));
      const width = children.reduce((sum, child) => {
        const css = getComputedStyle(child);
        const title = child.hasAttribute('data-toolbar-title');
        return sum + (title ? parseFloat(css.minWidth) : child.getBoundingClientRect().width)
          + parseFloat(css.marginLeft) + parseFloat(css.marginRight);
      }, 0) + children.length * parseFloat(getComputedStyle(row).columnGap);
      setCompact(width > row.clientWidth);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    [...row.children].forEach((child) => observer.observe(child));
    measure();
    return () => observer.disconnect();
  }, []);
  return { ref, compact };
}
