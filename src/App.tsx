import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { ControlTile } from './components/ControlTile';
import { TopBar } from './components/TopBar';
import { ApiError, getStatus, postAction } from './api/api';
import type { ActionRequest, StatusResponse, Targets } from './types';
import { Car, DoorClosed, DoorOpen, Lock as LockIcon, Shield, ShieldOff, Unlock } from 'lucide-react';

type AppState = {
  loading: boolean;
  unauthenticated: boolean;
  status: StatusResponse | null;
  sending: Record<Targets, boolean>;
  toast?: { message: string; kind: 'success' | 'error' };
};

type Action =
  | { type: 'LOAD_START' }
  | { type: 'LOAD_SUCCESS'; status: StatusResponse }
  | { type: 'LOAD_UNAUTH' }
  | { type: 'LOAD_ERROR' }
  | { type: 'SEND_START'; target: Targets }
  | { type: 'SEND_END'; target: Targets }
  | { type: 'SET_STATUS'; status: StatusResponse }
  | { type: 'TOAST'; message?: string; kind?: 'success' | 'error' };

const initialState: AppState = {
  loading: true,
  unauthenticated: false,
  status: null,
  sending: { alarm: false, lock: false, garage: false, driveway: false }
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOAD_START':
      return { ...state, loading: true, unauthenticated: false };
    case 'LOAD_SUCCESS':
      return { ...state, loading: false, unauthenticated: false, status: action.status };
    case 'LOAD_UNAUTH':
      return { ...state, loading: false, unauthenticated: true };
    case 'LOAD_ERROR':
      return { ...state, loading: false };
    case 'SEND_START':
      return { ...state, sending: { ...state.sending, [action.target]: true } };
    case 'SEND_END':
      return { ...state, sending: { ...state.sending, [action.target]: false } };
    case 'SET_STATUS':
      return { ...state, status: action.status };
    case 'TOAST':
      return action.message ? { ...state, toast: { message: action.message, kind: action.kind ?? 'success' } } : { ...state, toast: undefined };
    default:
      return state;
  }
}

export function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const apiBase: string = (import.meta.env.VITE_API_BASE_URL as string) || '';
  const hasApiBase = apiBase.trim().length > 0;

  const load = useCallback(async () => {
    dispatch({ type: 'LOAD_START' });
    try {
      const s = await getStatus();
      dispatch({ type: 'LOAD_SUCCESS', status: s });
    } catch (e) {
      if (e instanceof ApiError && e.unauthenticated) {
        dispatch({ type: 'LOAD_UNAUTH' });
      } else {
        // Network/CORS errors appear as TypeError and won't include auth signals.
        // Show the sign-in UI to allow Access login, then user can Retry.
        dispatch({ type: 'LOAD_ERROR' });
        if (hasApiBase) {
          dispatch({ type: 'LOAD_UNAUTH' });
        } else {
          dispatch({ type: 'TOAST', message: 'Failed to load status', kind: 'error' });
        }
      }
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSignIn = useCallback(() => {
    const base = apiBase.replace(/\/+$/, '');
    if (!base) {
      return;
    }
    let origin = '';
    try {
      origin = new URL(base).origin;
    } catch {
      origin = '';
    }
    const redirectUrl = encodeURIComponent(`${base}/v1/status`);
    const loginUrl = `${origin}/cdn-cgi/access/login?redirect_url=${redirectUrl}`;
    // Navigate in the same tab to avoid popup blockers in local dev
    window.location.href = loginUrl;
  }, [apiBase]);

  const handleAction = useCallback(
    async (req: ActionRequest) => {
      dispatch({ type: 'SEND_START', target: req.target });
      try {
        const res = await postAction(req);
        if (res.status) {
          dispatch({ type: 'SET_STATUS', status: res.status });
        } else {
          // Fallback: refresh immediately
          const s = await getStatus();
          dispatch({ type: 'SET_STATUS', status: s });
        }
        dispatch({ type: 'TOAST', message: 'Done', kind: 'success' });
      } catch (e) {
        if (e instanceof ApiError && e.unauthenticated) {
          dispatch({ type: 'LOAD_UNAUTH' });
          dispatch({ type: 'TOAST', message: 'You must sign in with Google', kind: 'error' });
        } else {
          dispatch({ type: 'TOAST', message: 'Action failed', kind: 'error' });
        }
      } finally {
        dispatch({ type: 'SEND_END', target: req.target });
      }
    },
    []
  );

  const alarm = state.status?.alarm;
  const garage = state.status?.garage;
  const driveway = state.status?.driveway;
  const lock = state.status?.lock;

  const tiles = useMemo(() => {
    const items: Array<{
      key: Targets;
      title: string;
      label?: string;
      variant: 'ok' | 'warning' | 'danger' | 'neutral';
      icon: JSX.Element;
      onClick: () => void;
    }> = [];

    // Alarm
    items.push({
      key: 'alarm',
      title: 'Alarm',
      label: alarm ? (alarm.armed ? 'Armed' : 'Disarmed') : undefined,
      variant: alarm ? (alarm.armed ? 'danger' : 'neutral') : 'neutral',
      icon: alarm && alarm.armed ? <Shield className="h-full w-full" /> : <ShieldOff className="h-full w-full" />,
      onClick: () => {
        const command = alarm?.armed ? 'disarm' : 'arm';
        void handleAction({ target: 'alarm', command });
      }
    });

    // Garage
    items.push({
      key: 'garage',
      title: 'Garage',
      label: garage ? (garage.open ? 'Open' : 'Closed') : undefined,
      variant: garage ? (garage.open ? 'warning' : 'ok') : 'neutral',
      icon: garage && garage.open ? <DoorOpen className="h-full w-full" /> : <DoorClosed className="h-full w-full" />,
      onClick: () => {
        const command = garage?.open ? 'close' : 'open';
        void handleAction({ target: 'garage', command });
      }
    });

    // Driveway
    items.push({
      key: 'driveway',
      title: 'Driveway',
      label: driveway ? (driveway.open ? 'Open' : 'Closed') : undefined,
      variant: driveway ? (driveway.open ? 'warning' : 'ok') : 'neutral',
      icon: <Car className="h-full w-full" />,
      onClick: () => {
        const command = driveway?.open ? 'close' : 'open';
        void handleAction({ target: 'driveway', command });
      }
    });

    // Lock
    items.push({
      key: 'lock',
      title: 'Lock',
      label: lock ? (lock.locked ? 'Locked' : 'Unlocked') : 'Tap to toggle',
      variant: lock ? (lock.locked ? 'ok' : 'warning') : 'neutral',
      icon: lock ? (lock.locked ? <LockIcon className="h-full w-full" /> : <Unlock className="h-full w-full" />) : <LockIcon className="h-full w-full" />,
      onClick: () => {
        // If state exists, toggle lock/unlock; otherwise generic toggle
        const command: ActionRequest['command'] = lock ? (lock.locked ? 'unlock' : 'lock') : 'toggle';
        void handleAction({ target: 'lock', command });
      }
    });

    return items;
  }, [alarm, garage, driveway, lock, handleAction]);

  return (
    <div className="min-h-full">
      <TopBar onRefresh={load} refreshing={state.loading} />

      <main className="mx-auto max-w-md px-4 py-4">
        {/* Auth gate */}
        {state.unauthenticated ? (
          <div className="mt-8 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 p-4 text-amber-900 dark:text-amber-100">
            <div className="font-semibold mb-1">You must sign in with Google to use the controls</div>
            <div className="flex gap-2 mt-2">
              <button className="btn btn-ghost" onClick={handleSignIn} aria-label="Open Google sign-in" disabled={!hasApiBase}>
                Sign in
              </button>
              <button className="btn btn-ghost" onClick={load} aria-label="Retry fetching status">Retry</button>
            </div>
            <div className="text-xs opacity-80 mt-2">
              A login tab will open. After signing in, return here and tap Retry.
            </div>
            {!hasApiBase ? (
              <div className="text-xs opacity-80 mt-2">
                Set <code>VITE_API_BASE_URL</code> in a <code>.env</code> file (e.g., <code>VITE_API_BASE_URL=https://api.&lt;MY_DOMAIN&gt;</code>) and restart the dev server.
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Initial loader */}
        {state.loading && !state.status ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="tile bg-slate-100 dark:bg-slate-800 animate-pulse h-28 sm:h-36" />
            ))}
          </div>
        ) : null}

        {/* Tiles */}
        {state.status ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-4">
            {tiles.map((t) => (
              <ControlTile
                key={t.key}
                title={t.title}
                label={t.label}
                variant={t.variant}
                icon={t.icon}
                onClick={t.onClick}
                sending={state.sending[t.key]}
                disabled={state.sending[t.key] || state.loading || state.unauthenticated}
                ariaLabel={`${t.title} control`}
              />
            ))}
          </div>
        ) : null}
      </main>

      {/* Toast */}
      {state.toast ? <div role="status" aria-live="polite" className="toast">{state.toast.message}</div> : null}
    </div>
  );
}


