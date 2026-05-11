import { useEffect, useRef, useState, ReactNode, CSSProperties } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * Wraps a horizontally scrolling row and adds a synced scrollbar at the top
 * so users don't have to scroll to the bottom of the board to scroll left/right.
 */
export function HorizontalScrollWithTopBar({ children, className, style }: Props) {
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [contentWidth, setContentWidth] = useState(0);
  const syncing = useRef<'top' | 'bottom' | null>(null);

  useEffect(() => {
    if (!innerRef.current) return;
    const el = innerRef.current;
    const update = () => setContentWidth(el.scrollWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    const mo = new MutationObserver(update);
    mo.observe(el, { childList: true, subtree: true, attributes: true });
    return () => { ro.disconnect(); mo.disconnect(); };
  }, []);

  const onTopScroll = () => {
    if (syncing.current === 'bottom') { syncing.current = null; return; }
    if (topRef.current && bottomRef.current) {
      syncing.current = 'top';
      bottomRef.current.scrollLeft = topRef.current.scrollLeft;
    }
  };
  const onBottomScroll = () => {
    if (syncing.current === 'top') { syncing.current = null; return; }
    if (topRef.current && bottomRef.current) {
      syncing.current = 'bottom';
      topRef.current.scrollLeft = bottomRef.current.scrollLeft;
    }
  };

  return (
    <div className="min-w-0">
      <div
        ref={topRef}
        onScroll={onTopScroll}
        className="overflow-x-auto overflow-y-hidden"
        style={{ height: 12 }}
      >
        <div style={{ width: contentWidth, height: 1 }} />
      </div>
      <div
        ref={bottomRef}
        onScroll={onBottomScroll}
        className={`overflow-x-auto ${className ?? ''}`}
        style={style}
      >
        <div ref={innerRef} className="inline-block min-w-full">
          {children}
        </div>
      </div>
    </div>
  );
}
