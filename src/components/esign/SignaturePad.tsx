import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface Props {
  fullName: string;
  onFullNameChange: (v: string) => void;
  onChange: (dataUrl: string | null, type: 'drawn' | 'typed') => void;
}

/** Draw-or-type signature capture that emits a PNG data URL. */
export function SignaturePad({ fullName, onFullNameChange, onChange }: Props) {
  const [mode, setMode] = useState<'drawn' | 'typed'>('drawn');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const hasInk = useRef(false);

  const ctx = () => canvasRef.current?.getContext('2d') ?? null;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const c = canvas.getContext('2d');
    if (!c) return;
    c.scale(ratio, ratio);
    c.lineWidth = 2.2;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.strokeStyle = '#111827';
  }, [mode]);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const c = ctx();
    if (!c) return;
    const { x, y } = pos(e);
    c.beginPath();
    c.moveTo(x, y);
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const c = ctx();
    if (!c) return;
    const { x, y } = pos(e);
    c.lineTo(x, y);
    c.stroke();
    hasInk.current = true;
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    emit();
  };

  const emit = () => {
    if (mode === 'drawn') {
      onChange(hasInk.current ? canvasRef.current?.toDataURL('image/png') ?? null : null, 'drawn');
    } else {
      onChange(fullName.trim() ? renderTyped(fullName.trim()) : null, 'typed');
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const c = ctx();
    if (canvas && c) c.clearRect(0, 0, canvas.width, canvas.height);
    hasInk.current = false;
    onChange(null, 'drawn');
  };

  const renderTyped = (name: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 160;
    const c = canvas.getContext('2d')!;
    c.fillStyle = '#111827';
    c.font = 'italic 64px "Brush Script MT", "Segoe Script", cursive';
    c.textBaseline = 'middle';
    c.fillText(name, 20, 90);
    return canvas.toDataURL('image/png');
  };

  useEffect(() => {
    if (mode === 'typed') onChange(fullName.trim() ? renderTyped(fullName.trim()) : null, 'typed');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullName, mode]);

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="signer-full-name">Your full name</Label>
        <Input
          id="signer-full-name"
          value={fullName}
          onChange={e => onFullNameChange(e.target.value)}
          placeholder="e.g. Jane Citizen"
        />
      </div>

      <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
        {(['drawn', 'typed'] as const).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); if (m === 'drawn') clear(); }}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
              mode === m ? 'bg-background shadow-sm' : 'text-muted-foreground'
            )}
          >
            {m === 'drawn' ? 'Draw signature' : 'Type signature'}
          </button>
        ))}
      </div>

      {mode === 'drawn' ? (
        <div className="space-y-2">
          <canvas
            ref={canvasRef}
            className="w-full h-40 rounded-lg border-2 border-dashed bg-background touch-none"
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={end}
            onPointerLeave={end}
          />
          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">Sign with your finger, stylus or mouse.</p>
            <Button type="button" variant="ghost" size="sm" onClick={clear}>Clear</Button>
          </div>
        </div>
      ) : (
        <div className="h-40 rounded-lg border-2 border-dashed bg-background flex items-center justify-center px-4">
          <span className="text-4xl italic truncate" style={{ fontFamily: '"Brush Script MT","Segoe Script",cursive' }}>
            {fullName.trim() || 'Your name'}
          </span>
        </div>
      )}
    </div>
  );
}
