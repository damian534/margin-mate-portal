import { useEffect, useMemo, useRef, useState } from 'react';
import { PdfCanvas } from './PdfCanvas';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type FieldType = 'signature' | 'initials' | 'date' | 'text';

export interface PlacedField {
  id: string;
  signerIndex: number;
  type: FieldType;
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

const SIGNER_COLOURS = [
  'border-blue-500 bg-blue-500/15 text-blue-700',
  'border-emerald-600 bg-emerald-600/15 text-emerald-700',
  'border-amber-600 bg-amber-600/15 text-amber-700',
  'border-fuchsia-600 bg-fuchsia-600/15 text-fuchsia-700',
];

const DEFAULT_SIZE: Record<FieldType, { w: number; h: number }> = {
  signature: { w: 0.24, h: 0.055 },
  initials: { w: 0.09, h: 0.045 },
  date: { w: 0.16, h: 0.035 },
  text: { w: 0.22, h: 0.035 },
};

const TYPE_LABELS: Record<FieldType, string> = {
  signature: 'Signature',
  initials: 'Initials',
  date: 'Date',
  text: 'Text',
};

interface Props {
  file: File;
  signers: { name: string; email: string }[];
  fields: PlacedField[];
  onChange: (fields: PlacedField[]) => void;
}

export function FieldPlacer({ file, signers, fields, onChange }: Props) {
  const [bytes, setBytes] = useState<ArrayBuffer | null>(null);
  const [signerIndex, setSignerIndex] = useState(0);
  const [type, setType] = useState<FieldType>('signature');
  const dragging = useRef<{ id: string; dx: number; dy: number } | null>(null);

  useEffect(() => { file.arrayBuffer().then(setBytes); }, [file]);

  useEffect(() => {
    if (signerIndex > signers.length - 1) setSignerIndex(0);
  }, [signers.length, signerIndex]);

  const byPage = useMemo(() => {
    const map = new Map<number, PlacedField[]>();
    fields.forEach(f => map.set(f.page, [...(map.get(f.page) || []), f]));
    return map;
  }, [fields]);

  const addField = (page: number, x: number, y: number) => {
    if (dragging.current) return;
    const size = DEFAULT_SIZE[type];
    onChange([
      ...fields,
      {
        id: crypto.randomUUID(),
        signerIndex,
        type,
        page,
        x: Math.max(0, Math.min(1 - size.w, x - size.w / 2)),
        y: Math.max(0, Math.min(1 - size.h, y - size.h / 2)),
        w: size.w,
        h: size.h,
      },
    ]);
  };

  if (!bytes) return <p className="text-sm text-muted-foreground py-8 text-center">Opening document…</p>;

  return (
    <div className="space-y-3">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border rounded-lg p-2 space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground mr-1">Placing for:</span>
          {signers.map((s, i) => (
            <Button
              key={i}
              type="button"
              size="sm"
              variant={i === signerIndex ? 'default' : 'outline'}
              className="h-7 text-xs"
              onClick={() => setSignerIndex(i)}
            >
              {s.name || `Signer ${i + 1}`}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground mr-1">Field:</span>
          {(Object.keys(TYPE_LABELS) as FieldType[]).map(t => (
            <Button
              key={t}
              type="button"
              size="sm"
              variant={t === type ? 'secondary' : 'ghost'}
              className="h-7 text-xs"
              onClick={() => setType(t)}
            >
              {TYPE_LABELS[t]}
            </Button>
          ))}
          <Badge variant="outline" className="ml-auto text-[10px]">
            {fields.length} field{fields.length === 1 ? '' : 's'} placed
          </Badge>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Click on the document to drop a field. Drag a field to move it, or use the ✕ to remove it.
        </p>
      </div>

      <PdfCanvas
        src={bytes}
        width={700}
        onPageClick={addField}
        overlay={page => (
          <>
            {(byPage.get(page) || []).map(f => (
              <div
                key={f.id}
                className={cn(
                  'absolute border-2 border-dashed rounded flex items-center justify-center text-[10px] font-medium cursor-move select-none',
                  SIGNER_COLOURS[f.signerIndex % SIGNER_COLOURS.length],
                )}
                style={{ left: `${f.x * 100}%`, top: `${f.y * 100}%`, width: `${f.w * 100}%`, height: `${f.h * 100}%` }}
                onClick={e => e.stopPropagation()}
                onMouseDown={e => {
                  e.stopPropagation();
                  const parent = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                  const startX = e.clientX, startY = e.clientY;
                  const origX = f.x, origY = f.y;
                  dragging.current = { id: f.id, dx: 0, dy: 0 };
                  const move = (ev: MouseEvent) => {
                    const nx = Math.max(0, Math.min(1 - f.w, origX + (ev.clientX - startX) / parent.width));
                    const ny = Math.max(0, Math.min(1 - f.h, origY + (ev.clientY - startY) / parent.height));
                    onChange(fields.map(x => (x.id === f.id ? { ...x, x: nx, y: ny } : x)));
                  };
                  const up = () => {
                    window.removeEventListener('mousemove', move);
                    window.removeEventListener('mouseup', up);
                    setTimeout(() => { dragging.current = null; }, 0);
                  };
                  window.addEventListener('mousemove', move);
                  window.addEventListener('mouseup', up);
                }}
              >
                <span className="truncate px-1">
                  {TYPE_LABELS[f.type]} · {signers[f.signerIndex]?.name?.split(' ')[0] || `S${f.signerIndex + 1}`}
                </span>
                <button
                  type="button"
                  className="absolute -top-2 -right-2 bg-white border rounded-full p-0.5 shadow"
                  onClick={e => { e.stopPropagation(); onChange(fields.filter(x => x.id !== f.id)); }}
                  onMouseDown={e => e.stopPropagation()}
                >
                  <X className="w-3 h-3 text-destructive" />
                </button>
              </div>
            ))}
          </>
        )}
      />
    </div>
  );
}
