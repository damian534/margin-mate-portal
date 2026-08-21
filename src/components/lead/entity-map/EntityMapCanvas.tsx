import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { ENTITY_TONE, ENTITY_TYPE_LABELS, FLOW_LABELS, type LeadEntity, type LeadEntityFlow } from '@/lib/entityMap/types';
import { formatMoney } from '@/lib/entityMap/servicing';
import { Button } from '@/components/ui/button';
import { Minus, Plus, Maximize2 } from 'lucide-react';

const NODE_W = 200;
const NODE_H = 78;
const MIN_ZOOM = 0.35;
const MAX_ZOOM = 2.5;

interface Props {
  entities: LeadEntity[];
  flows: LeadEntityFlow[];
  highlight?: { entityIds: Set<string>; flowIds: Set<string> } | null;
  readOnly?: boolean;
  onNodeClick: (entity: LeadEntity) => void;
  onNodeMoved: (id: string, x: number, y: number) => void;
  onFlowClick: (flow: LeadEntityFlow) => void;
  onAutoLayout: () => void;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function EntityMapCanvas({
  entities, flows, highlight, readOnly, onNodeClick, onNodeMoved, onFlowClick, onAutoLayout,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const drag = useRef<{ id: string | null; startX: number; startY: number; origX: number; origY: number; panning: boolean } | null>(null);

  useEffect(() => {
    setPositions(Object.fromEntries(entities.map(e => [e.id, { x: e.position_x, y: e.position_y }])));
  }, [entities]);

  const pos = (id: string) => positions[id] ?? { x: 0, y: 0 };

  // Native non-passive wheel listener (React's onWheel is passive)
  const wheelRef = useRef<(e: WheelEvent) => void>(() => {});
  wheelRef.current = (e: WheelEvent) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
    setZoom(prevZoom => {
      const next = clamp(prevZoom * Math.exp(-dy * 0.0015), MIN_ZOOM, MAX_ZOOM);
      const k = next / prevZoom;
      setOffset(prev => ({ x: px - (px - prev.x) * k, y: py - (py - prev.y) * k }));
      return next;
    });
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => { e.preventDefault(); wheelRef.current(e); };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const zoomBy = (factor: number) => {
    const el = containerRef.current;
    const cx = (el?.clientWidth ?? 0) / 2;
    const cy = (el?.clientHeight ?? 0) / 2;
    setZoom(prev => {
      const next = clamp(prev * factor, MIN_ZOOM, MAX_ZOOM);
      const k = next / prev;
      setOffset(o => ({ x: cx - (cx - o.x) * k, y: cy - (cy - o.y) * k }));
      return next;
    });
  };

  const onPointerDown = (e: React.PointerEvent, id: string | null) => {
    if (id && readOnly) return;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    const p = id ? pos(id) : { x: offset.x, y: offset.y };
    drag.current = { id, startX: e.clientX, startY: e.clientY, origX: p.x, origY: p.y, panning: !id };
  };

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (d.panning) {
      setOffset({ x: d.origX + dx, y: d.origY + dy });
    } else if (d.id) {
      setPositions(prev => ({ ...prev, [d.id!]: { x: d.origX + dx / zoom, y: d.origY + dy / zoom } }));
    }
  }, [zoom]);

  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (d?.id) {
      const p = pos(d.id);
      onNodeMoved(d.id, Math.round(p.x), Math.round(p.y));
    }
  };

  const edges = flows.map(f => {
    const a = pos(f.from_entity_id);
    const b = pos(f.to_entity_id);
    const x1 = a.x + NODE_W / 2, y1 = a.y + NODE_H;
    const x2 = b.x + NODE_W / 2, y2 = b.y;
    const midY = (y1 + y2) / 2;
    const dim = highlight && !highlight.flowIds.has(f.id);
    return {
      flow: f,
      d: `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`,
      lx: (x1 + x2) / 2,
      ly: midY,
      dim,
    };
  });

  return (
    <div className="relative">
      <div className="absolute right-2 top-2 z-10 flex gap-1">
        <Button variant="outline" size="icon" className="h-7 w-7 bg-background" onClick={() => zoomBy(1 / 1.25)}><Minus className="w-3.5 h-3.5" /></Button>
        <Button variant="outline" size="icon" className="h-7 w-7 bg-background" onClick={() => zoomBy(1.25)}><Plus className="w-3.5 h-3.5" /></Button>
        {!readOnly && (
          <Button variant="outline" size="sm" className="h-7 bg-background" onClick={onAutoLayout}>
            <Maximize2 className="w-3.5 h-3.5 mr-1" /> Tidy up
          </Button>
        )}
      </div>
      <div
        ref={containerRef}
        className="relative h-[440px] overflow-hidden rounded-md border bg-muted/20 touch-none cursor-grab active:cursor-grabbing"
        onPointerDown={e => { if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.canvas) onPointerDown(e, null); }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <div data-canvas="1" className="absolute inset-0" />
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}
        >
          <svg className="absolute left-0 top-0 overflow-visible pointer-events-none" width={1} height={1}>
            <defs>
              <marker id="em-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 z" className="fill-muted-foreground" />
              </marker>
            </defs>
            {edges.map(e => (
              <g key={e.flow.id} className={cn('pointer-events-auto cursor-pointer', e.dim && 'opacity-25')} onClick={() => onFlowClick(e.flow)}>
                <path d={e.d} fill="none" strokeWidth={2} markerEnd="url(#em-arrow)"
                  className={e.flow.use_for_servicing ? 'stroke-success' : 'stroke-muted-foreground'} />
                <rect x={e.lx - 62} y={e.ly - 12} width={124} height={24} rx={12} className="fill-background stroke-border" />
                <text x={e.lx} y={e.ly + 4} textAnchor="middle" className="fill-foreground text-[11px]">
                  {formatMoney(e.flow.amount)} · {FLOW_LABELS[e.flow.flow_type]?.split(' ')[0]}
                </text>
              </g>
            ))}
          </svg>

          {entities.map(en => {
            const p = pos(en.id);
            const tone = ENTITY_TONE[en.entity_type] ?? ENTITY_TONE.company;
            const dim = highlight && !highlight.entityIds.has(en.id);
            return (
              <div
                key={en.id}
                onPointerDown={e => { e.stopPropagation(); onPointerDown(e, en.id); }}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onClick={() => onNodeClick(en)}
                style={{ left: p.x, top: p.y, width: NODE_W, height: NODE_H }}
                className={cn(
                  'absolute rounded-lg border p-2.5 shadow-sm select-none',
                  readOnly ? 'cursor-pointer' : 'cursor-move',
                  tone.box,
                  dim && 'opacity-25',
                )}
              >
                <div className="text-sm font-medium leading-tight truncate">{en.name}</div>
                <div className="mt-1 flex items-center gap-1 flex-wrap">
                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full', tone.chip)}>
                    {ENTITY_TYPE_LABELS[en.entity_type]}
                  </span>
                  {en.is_applicant && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">Applicant</span>
                  )}
                </div>
                {en.abn && <div className="mt-1 text-[10px] text-muted-foreground truncate">ABN {en.abn}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
