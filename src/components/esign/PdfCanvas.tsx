import { useEffect, useRef, useState, type ReactNode } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { Loader2 } from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

interface Props {
  /** URL or raw bytes of the PDF */
  src: string | ArrayBuffer;
  /** Rendered on top of each page — receives the 1-based page number */
  overlay?: (pageNumber: number) => ReactNode;
  /** Click position on a page, expressed as fractions of the page size */
  onPageClick?: (pageNumber: number, xPct: number, yPct: number) => void;
  width?: number;
}

interface PageBitmap {
  pageNumber: number;
  dataUrl: string;
  width: number;
  height: number;
}

export function PdfCanvas({ src, overlay, onPageClick, width = 760 }: Props) {
  const [pages, setPages] = useState<PageBitmap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    setLoading(true);
    setError(null);
    setPages([]);

    (async () => {
      try {
        const task = pdfjsLib.getDocument(
          typeof src === 'string' ? { url: src } : { data: new Uint8Array(src.slice(0)) },
        );
        const pdf = await task.promise;
        const out: PageBitmap[] = [];
        for (let n = 1; n <= pdf.numPages; n++) {
          const page = await pdf.getPage(n);
          const base = page.getViewport({ scale: 1 });
          const scale = (width * (window.devicePixelRatio > 1 ? 2 : 1.5)) / base.width;
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement('canvas');
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          const ctx = canvas.getContext('2d')!;
          await page.render({ canvasContext: ctx, viewport }).promise;
          out.push({
            pageNumber: n,
            dataUrl: canvas.toDataURL('image/jpeg', 0.85),
            width: base.width,
            height: base.height,
          });
        }
        if (mounted.current) { setPages(out); setLoading(false); }
      } catch (e) {
        if (mounted.current) { setError((e as Error).message || 'Could not open this PDF'); setLoading(false); }
      }
    })();

    return () => { mounted.current = false; };
  }, [src, width]);

  if (loading) {
    return (
      <div className="py-16 flex justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error) {
    return <p className="text-sm text-muted-foreground py-8 text-center">{error}</p>;
  }

  return (
    <div className="space-y-4">
      {pages.map(p => (
        <div
          key={p.pageNumber}
          className="relative mx-auto shadow-sm border rounded-md overflow-hidden bg-white"
          style={{ width, aspectRatio: `${p.width} / ${p.height}` }}
          onClick={e => {
            if (!onPageClick) return;
            const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
            onPageClick(p.pageNumber, (e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height);
          }}
        >
          <img src={p.dataUrl} alt={`Page ${p.pageNumber}`} className="w-full h-full block select-none" draggable={false} />
          {overlay?.(p.pageNumber)}
          <span className="absolute bottom-1 right-2 text-[10px] text-muted-foreground bg-white/80 px-1 rounded">
            {p.pageNumber} / {pages.length}
          </span>
        </div>
      ))}
    </div>
  );
}
