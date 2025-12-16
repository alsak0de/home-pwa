import { type ReactNode } from 'react';

type Variant = 'ok' | 'warning' | 'danger' | 'neutral';

export type ControlTileProps = {
  title: string;
  label?: string;
  icon: ReactNode;
  variant: Variant;
  disabled?: boolean;
  sending?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
};

const variantClasses: Record<Variant, string> = {
  ok: 'bg-emerald-50 text-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-200',
  warning: 'bg-amber-50 text-amber-900 dark:bg-amber-900/20 dark:text-amber-200',
  danger: 'bg-rose-50 text-rose-900 dark:bg-rose-900/20 dark:text-rose-200',
  neutral: 'bg-slate-50 text-slate-900 dark:bg-slate-800/50 dark:text-slate-200'
};

export function ControlTile({
  title,
  label,
  icon,
  variant,
  disabled,
  sending,
  onClick,
  ariaLabel
}: ControlTileProps) {
  return (
    <button
      className={`tile w-full ${variantClasses[variant]}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel ?? title}
      aria-busy={sending ? 'true' : 'false'}
    >
      <div className="tile-content">
        <div className="h-10 w-10 sm:h-12 sm:w-12">{icon}</div>
        <div className="text-lg font-semibold">{title}</div>
        {label ? <div className="text-sm opacity-80">{label}</div> : null}
        {sending ? <div className="text-xs opacity-80">Sending…</div> : null}
      </div>
    </button>
  );
}
