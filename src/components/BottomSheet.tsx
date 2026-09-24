"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export type SnapPoint = "collapsed" | "half" | "expanded";

type Props = {
  children: ReactNode;
  defaultSnap?: SnapPoint;
  onSnapChange?: (snap: SnapPoint) => void;
  fullScreen?: boolean;
  toolbarRef?: React.RefObject<HTMLElement>;
};

const SNAP_CONFIG = {
  collapsed: 120,
  half: "50vh",
  expanded: "90vh",
};

export function BottomSheet({ children, defaultSnap = "collapsed", onSnapChange, fullScreen = false, toolbarRef }: Props) {
  const [snap, setSnap] = useState<SnapPoint>(defaultSnap);
  const [isDragging, setIsDragging] = useState(false);
  const [translateY, setTranslateY] = useState(0);
  const [savedSnap, setSavedSnap] = useState<SnapPoint>(defaultSnap);
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const startTranslateRef = useRef(0);
  const snapHeightsRef = useRef<Record<SnapPoint, number>>({ collapsed: 120, half: 300, expanded: 600 });

  const updateSnapHeights = () => {
    if (!containerRef.current) return;
    const vh = window.innerHeight;
    let toolbarBottom = 0;
    
    if (toolbarRef?.current) {
      const rect = toolbarRef.current.getBoundingClientRect();
      toolbarBottom = rect.bottom;
    }
    
    snapHeightsRef.current = {
      collapsed: 120,
      half: vh * 0.5,
      expanded: toolbarBottom > 0 ? vh - toolbarBottom - 8 : vh * 0.85,
    };
  };

  const getTranslateForSnap = (s: SnapPoint): number => {
    if (!containerRef.current) return 0;
    const vh = window.innerHeight;
    const h = snapHeightsRef.current[s];
    return vh - h;
  };

  const snapTo = (s: SnapPoint) => {
    setSnap(s);
    const newTranslateY = getTranslateForSnap(s);
    setTranslateY(newTranslateY);
    
    const vh = window.innerHeight;
    const sheetHeight = vh - newTranslateY;
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--sheet-h', `${sheetHeight}px`);
    }
    
    onSnapChange?.(s);
  };

  useEffect(() => {
    updateSnapHeights();
    snapTo(defaultSnap);
    
    const handleResize = () => {
      updateSnapHeights();
      snapTo(snap);
    };
    
    let resizeObserver: ResizeObserver | null = null;
    if (toolbarRef?.current) {
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(toolbarRef.current);
    }
    
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      resizeObserver?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolbarRef]);

  useEffect(() => {
    if (fullScreen) {
      setSavedSnap(snap);
      const vh = window.innerHeight;
      setTranslateY(vh);
      if (typeof document !== 'undefined') {
        document.documentElement.style.setProperty('--sheet-h', '0px');
      }
    } else if (savedSnap) {
      snapTo(savedSnap);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullScreen]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (fullScreen) return;
    if (!handleRef.current?.contains(e.target as Node)) return;
    e.preventDefault();
    setIsDragging(true);
    startYRef.current = e.clientY;
    startTranslateRef.current = translateY;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const delta = e.clientY - startYRef.current;
    const newTranslate = Math.max(0, Math.min(window.innerHeight - 60, startTranslateRef.current + delta));
    setTranslateY(newTranslate);
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const vh = window.innerHeight;
    const currentHeight = vh - translateY;
    const { collapsed, half, expanded } = snapHeightsRef.current;

    const distToCollapsed = Math.abs(currentHeight - collapsed);
    const distToHalf = Math.abs(currentHeight - half);
    const distToExpanded = Math.abs(currentHeight - expanded);

    const minDist = Math.min(distToCollapsed, distToHalf, distToExpanded);
    let target: SnapPoint = "collapsed";
    if (minDist === distToHalf) target = "half";
    else if (minDist === distToExpanded) target = "expanded";

    snapTo(target);
  };

  const cycleSnap = () => {
    if (fullScreen) return;
    const order: SnapPoint[] = ["collapsed", "half", "expanded"];
    const idx = order.indexOf(snap);
    const next = order[(idx + 1) % order.length];
    snapTo(next);
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-x-0 bottom-0 z-30 flex flex-col bg-white border-t border-slate-200 shadow-2xl rounded-t-2xl overflow-hidden"
      style={{
        transform: `translateY(${translateY}px)`,
        transition: isDragging ? "none" : "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
        height: "100vh",
        touchAction: "none",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div
        ref={handleRef}
        className="flex shrink-0 items-center justify-center py-3 cursor-grab active:cursor-grabbing"
        onClick={cycleSnap}
      >
        <div className="h-1 w-12 rounded-full bg-slate-300" />
      </div>
      <div
        ref={contentRef}
        className="flex-1 overflow-y-auto"
        style={{ overscrollBehavior: "contain" }}
        onTouchStart={(e) => {
          if (snap !== "expanded") return;
          const content = contentRef.current;
          if (!content) return;
          const isAtTop = content.scrollTop === 0;
          if (isAtTop && e.touches[0].clientY > startYRef.current) {
            e.preventDefault();
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}
