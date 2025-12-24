import { type ReactNode } from 'react';

type Variant = 'ok' | 'warning' | 'danger' | 'neutral' | 'unknown';

export type ControlTileProps = {
  title: string;
  label?: string;
  icon: ReactNode;
  variant: Variant;
  disabled?: boolean;
  sending?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
  style?: React.CSSProperties;
};

const variantClasses: Record<Variant, string> = {
  ok: 'bg-emerald-600 text-white dark:bg-emerald-600',
  warning: 'bg-amber-600 text-white dark:bg-amber-600',
  danger: 'bg-rose-600 text-white dark:bg-rose-600',
  neutral: 'bg-slate-600 text-white dark:bg-slate-600',
  // Unknown status is lighter grey than "off"
  unknown: 'bg-slate-500 text-white dark:bg-slate-500'
};

export function ControlTile({
  title,
  label,
  icon,
  variant,
  disabled,
  sending,
  onClick,
  ariaLabel,
  style
}: ControlTileProps) {
  return (
    <button
      className={`tile w-full ${variantClasses[variant]} transition-transform active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 shadow-md active:shadow-sm`}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel ?? title}
      aria-busy={sending ? 'true' : 'false'}
      style={style}
    >
      <div className="tile-content">
        <div className="h-10 w-10 sm:h-12 sm:w-12" aria-hidden="true">{icon}</div>
        <div className="text-lg font-semibold">{title}</div>
        {label ? <div className="text-sm/5 opacity-90">{label}</div> : null}
        {sending ? <div className="text-xs opacity-90">Sending…</div> : null}
      </div>
    </button>
  );
}
