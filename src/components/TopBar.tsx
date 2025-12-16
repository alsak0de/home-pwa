import { RefreshCw } from 'lucide-react';

type TopBarProps = {
  onRefresh: () => void;
  refreshing?: boolean;
};

export function TopBar({ onRefresh, refreshing }: TopBarProps) {
  return (
    <div className="topbar">
      <div className="mx-auto max-w-md px-4 h-14 flex items-center justify-between">
        <div className="font-semibold">Home Controls</div>
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


