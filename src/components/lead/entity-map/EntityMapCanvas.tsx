import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  ENTITY_TONE, ENTITY_TYPE_LABELS, FLOW_LABELS,
  type LeadEntity, type LeadEntityFlow, type LeadEntityRole,
} from '@/lib/entityMap/types';
import { formatMoney, structuralEdges, LAYOUT } from '@/lib/entityMap/servicing';
import { Button } from '@/components/ui/button';
import { Minus, Plus, Maximize2, Landmark, Building2, User, Users, PiggyBank, Scale } from 'lucide-react';

const NODE_W = LAYOUT.nodeW;
const NODE_H = LAYOUT.nodeH;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2.5;

const ENTITY_ICON = {
  individual: User,
  company: Building2,
  discretionary_trust: Landmark,
  unit_trust: Landmark,
  partnership: Users,
  smsf: PiggyBank,
} as const;

interface Props {
  entities: LeadEntity[];
  flows: LeadEntityFlow[];
  roles: LeadEntityRole[];
  highlight?: { entityIds: Set<string>; flowIds: Set<string> } | null;
  readOnly?: boolean;
  onNodeClick: (entity: LeadEntity) => void;
  onNodeMoved: (id: string, x: number, y: number) => void;
  onFlowClick: (flow: LeadEntityFlow) => void;
  onAutoLayout: () => void;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function EntityMapCanvas({
  entities, flows, roles, highlight, readOnly, onNodeClick, onNodeMoved, onFlowClick, onAutoLayout,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const drag = useRef<{ id: string | null; startX: number; startY: number; origX: number; origY: number; panning: boolean; moved: boolean } | null>(null);

  useEffect(() => {
    setPositions(Object.fromEntries(entities.map(e => [e.id, { x: e.position_x, y: e.position_y }])));
  }, [entities]);

  const pos = useCallback(
    (id: string) => positions[id] ?? { x: 0, y: 0 },
    [positions],
  );

  /** Fit the whole structure into view. */
  const fitToView = useCallback(() => {
    const el = containerRef.current;
    const list = entities.map(e => positions[e.id]).filter(Boolean) as { x: number; y: number }[];
    if (!el || !list.length) return;
    const minX = Math.min(...list.map(p => p.x));
    const maxX = Math.max(...list.map(p => p.x)) + NODE_W;
    const minY = Math.min(...list.map(p => p.y));
    const maxY = Math.max(...list.map(p => p.y)) + NODE_H;
    const pad = 32;
    const z = clamp(
      Math.min((el.clientWidth - pad * 2) / (maxX - minX), (el.clientHeight - pad * 2) / (maxY - minY), 1),
      MIN_ZOOM, MAX_ZOOM,
    );
    setZoom(z);
    setOffset({
      x: (el.clientWidth - (maxX - minX) * z) / 2 - minX * z,
      y: (el.clientHeight - (maxY - minY) * z) / 2 - minY * z,
    });
  }, [entities, positions]);

  const fitted = useRef('');
  useEffect(() => {
    const key = entities.map(e => `${e.id}:${e.position_x}:${e.position_y}`).join('|');
    if (!key || key === fitted.current || !Object.keys(positions).length) return;
    fitted.current = key;
    fitToView();
  }, [entities, positions, fitToView]);

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
    drag.current = { id, startX: e.clientX, startY: e.clientY, origX: p.x, origY: p.y, panning: !id, moved: false };
  };

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) d.moved = true;
    if (d.panning) {
      setOffset({ x: d.origX + dx, y: d.origY + dy });
    } else if (d.id) {
      setPositions(prev => ({ ...prev, [d.id!]: { x: d.origX + dx / zoom, y: d.origY + dy / zoom } }));
    }
  }, [zoom]);

  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (d?.id && d.moved) {
      const p = pos(d.id);
      fitted.current = `${fitted.current}#`;
      onNodeMoved(d.id, Math.round(p.x), Math.round(p.y));
    }
  };

  /** Money arrows: entity bottom -> entity top, with an amount pill placed clear of the nodes. */
  const edges = flows.map(f => {
    const a = pos(f.from_entity_id);
    const b = pos(f.to_entity_id);
    const x1 = a.x + NODE_W / 2, y1 = a.y + NODE_H;
    const x2 = b.x + NODE_W / 2, y2 = b.y - 6;
    const midY = (y1 + y2) / 2;
    const dim = highlight && !highlight.flowIds.has(f.id);
    return {
      flow: f,
      d: `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`,
      lx: x1 + (x2 - x1) * 0.78,
      ly: y1 + (y2 - y1) * 0.62,
      dim,
    };
  });

  /**
   * Dashed control / ownership lines (who runs what).
   * Lines that travel upward (a director who is also paid by the trust) are routed
   * down the side of the chart so they never cross the entity cards.
   */
  const controlEdges = structuralEdges(roles, entities, flows).map((e, i) => {
    const a = pos(e.from);
    const b = pos(e.to);
    const dim = !!highlight;
    if (b.y > a.y + NODE_H / 2) {
      const x1 = a.x + NODE_W / 2, y1 = a.y + NODE_H;
      const x2 = b.x + NODE_W / 2, y2 = b.y - 6;
      const midY = (y1 + y2) / 2;
      return {
        ...e, dim,
        d: `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`,
        lx: x1 + (x2 - x1) * 0.72, ly: y1 + (y2 - y1) * 0.5,
      };
    }
    const lane = Math.max(a.x, b.x) + NODE_W + 70 + i * 34;
    const sx = a.x + NODE_W, sy = a.y + NODE_H / 2;
    const tx = b.x + NODE_W + 6, ty = b.y + NODE_H / 2;
    return {
      ...e, dim,
      d: `M ${sx} ${sy} C ${lane} ${sy}, ${lane} ${ty}, ${tx} ${ty}`,
      lx: lane, ly: (sy + ty) / 2 + i * 24,
    };
  });


  return (
    <div className="relative">
      <div className="absolute right-2 top-2 z-10 flex gap-1">
        <Button variant="outline" size="icon" className="h-7 w-7 bg-background" onClick={() => zoomBy(1 / 1.25)} aria-label="Zoom out"><Minus className="w-3.5 h-3.5" /></Button>
        <Button variant="outline" size="icon" className="h-7 w-7 bg-background" onClick={() => zoomBy(1.25)} aria-label="Zoom in"><Plus className="w-3.5 h-3.5" /></Button>
        <Button variant="outline" size="sm" className="h-7 bg-background" onClick={fitToView}>Fit</Button>
        {!readOnly && (
          <Button variant="outline" size="sm" className="h-7 bg-background" onClick={onAutoLayout}>
            <Maximize2 className="w-3.5 h-3.5 mr-1" /> Tidy up
          </Button>
        )}
      </div>

      <div
        ref={containerRef}
        className="relative h-[520px] overflow-hidden rounded-xl border bg-[radial-gradient(hsl(var(--muted-foreground)/0.18)_1px,transparent_1px)] [background-size:22px_22px] touch-none cursor-grab active:cursor-grabbing"
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
              <marker id="em-arrow-money" markerWidth="9" markerHeight="9" refX="7" refY="3.2" orient="auto">
                <path d="M0,0 L7,3.2 L0,6.4 z" className="fill-success" />
              </marker>
              <marker id="em-arrow-control" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 z" className="fill-muted-foreground" />
              </marker>
            </defs>

            {controlEdges.map(e => (
              <g key={e.id} className={cn(e.dim && 'opacity-20')}>
                <path d={e.d} fill="none" strokeWidth={1.5} strokeDasharray="5 5"
                  markerEnd="url(#em-arrow-control)" className="stroke-muted-foreground/70" />
                <rect x={e.lx - 44} y={e.ly - 9} width={88} height={18} rx={9} className="fill-background stroke-border" />
                <text x={e.lx} y={e.ly + 4} textAnchor="middle" className="fill-muted-foreground text-[10px]">{e.label}</text>
              </g>
            ))}

            {edges.map(e => (
              <g key={e.flow.id} className={cn('pointer-events-auto cursor-pointer', e.dim && 'opacity-20')} onClick={() => onFlowClick(e.flow)}>
                <path d={e.d} fill="none" strokeWidth={2.5} markerEnd="url(#em-arrow-money)"
                  className={e.flow.use_for_servicing ? 'stroke-success' : 'stroke-muted-foreground'} />
                <rect
                  x={e.lx - 78} y={e.ly - 15} width={156} height={30} rx={15}
                  className={cn('stroke-[1.5]', e.flow.use_for_servicing ? 'fill-success/10 stroke-success/50' : 'fill-muted stroke-border')}
                />
                <text x={e.lx} y={e.ly - 2} textAnchor="middle" className="fill-foreground text-[12px] font-semibold">
                  {formatMoney(e.flow.amount)}
                </text>
                <text x={e.lx} y={e.ly + 10} textAnchor="middle" className="fill-muted-foreground text-[9px] uppercase tracking-wide">
                  {FLOW_LABELS[e.flow.flow_type]}
                </text>
              </g>
            ))}
          </svg>

          {entities.map(en => {
            const p = pos(en.id);
            const tone = ENTITY_TONE[en.entity_type] ?? ENTITY_TONE.company;
            const dim = highlight && !highlight.entityIds.has(en.id);
            const Icon = ENTITY_ICON[en.entity_type] ?? Scale;
            const trustee = en.trustee_entity_id ? entities.find(e => e.id === en.trustee_entity_id) : null;
            return (
              <div
                key={en.id}
                onPointerDown={e => { e.stopPropagation(); onPointerDown(e, en.id); }}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onClick={() => { if (!drag.current?.moved) onNodeClick(en); }}
                style={{ left: p.x, top: p.y, width: NODE_W, height: NODE_H }}
                className={cn(
                  'absolute overflow-hidden rounded-xl border-2 bg-background p-2.5 shadow-md select-none transition-shadow hover:shadow-lg',
                  readOnly ? 'cursor-pointer' : 'cursor-move',
                  tone.box,
                  en.is_applicant && 'ring-2 ring-primary/40',
                  dim && 'opacity-20',
                )}

              >
                <div className="flex items-start gap-2">
                  <div className={cn('w-6 h-6 rounded-md flex items-center justify-center shrink-0', tone.chip)}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold leading-tight line-clamp-2">{en.name}</div>
                    <div className="text-[10px] text-muted-foreground leading-tight">{ENTITY_TYPE_LABELS[en.entity_type]}</div>
                  </div>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1">
                  {en.is_applicant && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground font-medium">On the loan</span>
                  )}
                  {trustee && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground truncate max-w-[170px]">
                      Trustee: {trustee.name}
                    </span>
                  )}
                  {en.abn && <span className="text-[10px] text-muted-foreground">ABN {en.abn}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend — plain English so a junior can read the map */}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <svg width="26" height="8"><line x1="0" y1="4" x2="26" y2="4" strokeWidth="2.5" className="stroke-success" /></svg>
          Money paid or distributed
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="26" height="8"><line x1="0" y1="4" x2="26" y2="4" strokeWidth="1.5" strokeDasharray="4 4" className="stroke-muted-foreground" /></svg>
          Controls / is appointed to
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm ring-2 ring-primary/40 bg-background" /> Applicant on the loan
        </span>
        <span>Click a person to trace where their income came from · drag to rearrange · scroll to zoom</span>
      </div>
    </div>
  );
}
