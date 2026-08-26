import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Eye, X } from 'lucide-react';
import { getBrandPreview, clearBrandPreview, onBrandPreviewChange, BrandPreview } from '@/lib/brandPreview';

/** Floating reminder that the app is showing a demo brand, with a one-click exit. */
export function BrandPreviewBar() {
  const [preview, setPreview] = useState<BrandPreview | null>(getBrandPreview());

  useEffect(() => onBrandPreviewChange(() => setPreview(getBrandPreview())), []);

  if (!preview) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 rounded-full border border-border bg-card/95 backdrop-blur px-4 py-2 shadow-lg">
      <Eye className="w-4 h-4 text-primary" />
      <span className="text-sm">
        Demo branding: <span className="font-semibold">{preview.name || 'Preview brand'}</span>
      </span>
      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={clearBrandPreview}>
        <X className="w-4 h-4 mr-1" /> Exit
      </Button>
    </div>
  );
}
