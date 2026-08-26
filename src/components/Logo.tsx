import marginIconTm from '@/assets/margin-icon-tm.png';
import { useTenant } from '@/hooks/useTenant';

export function Logo({ className = "h-8", variant = "full" }: { className?: string; variant?: "full" | "icon" }) {
  const { tenant } = useTenant();
  const src =
    (variant === 'icon' ? tenant?.icon_url : tenant?.logo_url) ||
    tenant?.logo_url ||
    marginIconTm;
  return <img src={src} alt={tenant?.name ?? 'Margin Finance'} className={`${className} object-contain`} />;
}
