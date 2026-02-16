import marginIconTm from '@/assets/margin-icon-tm.png';

export function Logo({ className = "h-8", variant = "full" }: { className?: string; variant?: "full" | "icon" }) {
  return <img src={marginIconTm} alt="Margin Finance" className={className} />;
}
