import logoWordmark from '@/assets/logo-wordmark.png';
import logoIcon from '@/assets/logo-icon.png';

export function Logo({ className = "h-8", variant = "full" }: { className?: string; variant?: "full" | "icon" }) {
  if (variant === "icon") {
    return <img src={logoIcon} alt="Margin Finance" className={className} />;
  }
  return <img src={logoWordmark} alt="Margin Finance" className={className} />;
}
