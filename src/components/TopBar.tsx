import { RefreshCw } from 'lucide-react';

type TopBarProps = {
  onRefresh: () => void;
  refreshing?: boolean;
  pageName?: string; // When set, show breadcrumb after Home
  onHomeClick?: () => void; // Clickable "Sagarra's 🏠" to go Home
};

export function TopBar({ onRefresh, refreshing, pageName, onHomeClick }: TopBarProps) {
  return (
    <div className="topbar">
      <div className="mx-auto max-w-md px-4 h-14 flex items-center justify-between">
        <div className="font-semibold">
          {onHomeClick ? (
            <button
              className="btn btn-ghost px-1 py-0"
              onClick={onHomeClick}
              aria-label="Go to Home panel"
            >
              Sagarra&apos;s 🏠
            </button>
          ) : (
            <span>Sagarra&apos;s 🏠</span>
          )}
          {pageName ? <span className="opacity-80"> &gt; {pageName}</span> : null}
        </div>
        <button
          className="btn btn-ghost"
          onClick={onRefresh}
          aria-label="Refresh status"
          aria-busy={refreshing ? 'true' : 'false'}
          disabled={refreshing}
        >
          <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>
    </div>
  );
}



