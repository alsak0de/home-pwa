import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { ControlTile } from './components/ControlTile';
import { TopBar } from './components/TopBar';
import { ApiError, getStatus, postAction } from './api/api';
import type { ActionRequest, StatusResponse, Targets } from './types';
import { Car, DoorClosed, DoorOpen, Shield, ShieldOff, Lightbulb, Sun, Waves, Trees, Lock, Home } from 'lucide-react';
import { DEBUG_ENABLED, debugLog } from './utils/debug';

type AppState = {
  loading: boolean;
  unauthenticated: boolean;
  status: StatusResponse | null;
  sending: Record<Targets, boolean>;
  toast?: { message: string; kind: 'success' | 'error' };
  page: 'home' | 'garden' | 'ground' | "pati's" | "pablo's" | "lara's" | 'master';
};

type Action =
  | { type: 'LOAD_START' }
  | { type: 'LOAD_SUCCESS'; status: StatusResponse }
  | { type: 'LOAD_UNAUTH' }
  | { type: 'LOAD_ERROR' }
  | { type: 'SEND_START'; target: Targets }
  | { type: 'SEND_END'; target: Targets }
  | { type: 'SET_STATUS'; status: StatusResponse }
  | { type: 'TOAST'; message?: string; kind?: 'success' | 'error' }
  | { type: 'NAVIGATE'; page: AppState['page'] };

const initialState: AppState = {
  loading: true,
  unauthenticated: false,
  status: null,
  page: 'home',
  sending: {
    alarm: false,
    lock: false,
    garage: false,
    driveway: false,
    pool: false,
    garden: false,
    porch: false,
    backyard: false
  }
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
    case 'NAVIGATE':
      return { ...state, page: action.page };
    default:
      return state;
  }
}

export function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const apiBase: string = (import.meta.env.VITE_API_BASE_URL as string) || '';
  const hasApiBase = apiBase.trim().length > 0;
  const statusPath: string = (import.meta.env.VITE_STATUS_PATH as string) || '/v1/status';
  const actionPath: string = (import.meta.env.VITE_ACTION_PATH as string) || '/v1/action';
  const cfTeamDomain: string = (import.meta.env.VITE_CF_TEAM_DOMAIN as string) || '';
  const authCompletePath: string = (() => {
    const suffix = '/status';
    if (statusPath.endsWith(suffix)) {
      return statusPath.slice(0, -suffix.length) + '/auth-complete';
    }
    const trimmed = statusPath.replace(/\/+$/, '');
    return `${trimmed}/auth-complete`;
  })();

  const load = useCallback(async () => {
    DEBUG_ENABLED && debugLog('LOAD_START');
    dispatch({ type: 'LOAD_START' });
    try {
      const s = await getStatus();
      DEBUG_ENABLED && debugLog('LOAD_SUCCESS', s);
      dispatch({ type: 'LOAD_SUCCESS', status: s });
    } catch (e) {
      if (e instanceof ApiError && e.unauthenticated) {
        DEBUG_ENABLED && debugLog('LOAD_UNAUTH');
        dispatch({ type: 'LOAD_UNAUTH' });
      } else {
        // Treat network/CORS failures as unauthenticated too (Access redirects)
        dispatch({ type: 'LOAD_ERROR' });
        dispatch({ type: 'LOAD_UNAUTH' });
        DEBUG_ENABLED && debugLog('LOAD_ERROR (network/CORS)', e);
        dispatch({ type: 'TOAST', message: 'Failed to load status', kind: 'error' });
      }
    }
  }, []);

  useEffect(() => {
    DEBUG_ENABLED && debugLog('App mount', { apiBase, statusPath, actionPath });
    // Initialize page from hash without adding history entries
    const hash = (location.hash || '').replace(/^#\/?/, '').toLowerCase();
    const allowedPages = ['home', 'garden', 'ground', "pati's", "pablo's", "lara's", 'master'] as const;
    const initialPage = (allowedPages as readonly string[]).includes(hash) ? (hash as AppState['page']) : 'home';
    if (initialPage !== 'home') {
      dispatch({ type: 'NAVIGATE', page: initialPage });
    }
    const onHashChange = () => {
      const h = (location.hash || '').replace(/^#\/?/, '').toLowerCase();
      if ((allowedPages as readonly string[]).includes(h)) {
        dispatch({ type: 'NAVIGATE', page: h as AppState['page'] });
      }
    };
    window.addEventListener('hashchange', onHashChange);
    // Listen for auth completion message from API auth-complete page
    const allowedOrigin = (() => {
      try {
        return new URL(apiBase).origin;
      } catch {
        return '';
      }
    })();
    const onMessage = (e: MessageEvent) => {
      try {
        if (e.data === 'auth-ok' && (!allowedOrigin || e.origin === allowedOrigin)) {
          DEBUG_ENABLED && debugLog('Received auth-ok message from', e.origin);
          // Poll the API for up to ~45s to allow the cookie to be minted,
          // then update UI automatically without manual refresh.
          dispatch({ type: 'TOAST', message: 'Signing in…', kind: 'success' });
          const started = Date.now();
          const poll = async () => {
            while (Date.now() - started < 45000) {
              try {
                const s = await getStatus();
                dispatch({ type: 'LOAD_SUCCESS', status: s });
                dispatch({ type: 'TOAST' }); // clear toast
                return;
              } catch {
                await new Promise((r) => setTimeout(r, 1500));
              }
            }
            dispatch({ type: 'TOAST', message: 'Still waiting for sign-in. Tap Retry.', kind: 'error' });
          };
          void poll();
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener('message', onMessage);
    void load();
    return () => {
      window.removeEventListener('message', onMessage);
      window.removeEventListener('hashchange', onHashChange);
    };
  }, [load, apiBase, statusPath, actionPath]);

  // If user returns focus to the panel (e.g., after closing the login tab),
  // try loading again to avoid requiring a manual refresh.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && state.unauthenticated) {
        DEBUG_ENABLED && debugLog('Visibilitychange → retry load');
        void load();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [state.unauthenticated, load]);

  const handleSignIn = useCallback(() => {
    const base = apiBase.replace(/\/+$/, '');
    if (!base) {
      DEBUG_ENABLED && debugLog('handleSignIn: missing api base');
      return;
    }
    // Always open the protected API resource; Access will 302 to the correct team login URL (with kid/meta),
    // and upon success redirect back to /auth-complete to signal the panel.
    const loginUrl = `${base}${authCompletePath}`;
    DEBUG_ENABLED && debugLog('handleSignIn → open protected resource', loginUrl);
    // Important: do NOT use 'noopener' because we rely on window.opener postMessage
    window.open(loginUrl, '_blank');
    // Fallback: poll the API in case postMessage is blocked (e.g., some iOS cases)
    dispatch({ type: 'TOAST', message: 'Waiting for sign-in…', kind: 'success' });
    const started = Date.now();
    (async () => {
      while (Date.now() - started < 45000) {
        try {
          const s = await getStatus();
          dispatch({ type: 'LOAD_SUCCESS', status: s });
          dispatch({ type: 'TOAST' }); // clear
          return;
        } catch {
          await new Promise((r) => setTimeout(r, 1500));
        }
      }
      dispatch({ type: 'TOAST', message: 'Still waiting for sign-in. Tap Retry.', kind: 'error' });
    })();
  }, [apiBase, authCompletePath, cfTeamDomain]);

  const handleAction = useCallback(
    async (req: ActionRequest) => {
      DEBUG_ENABLED && debugLog('SEND_START', req);
      // light haptic feedback on press (non-blocking)
      try {
        if ('vibrate' in navigator) {
          navigator.vibrate?.(8);
        }
      } catch {
        // ignore
      }
      dispatch({ type: 'SEND_START', target: req.target });
      try {
        const res = await postAction(req);
        if (res.status) {
          DEBUG_ENABLED && debugLog('SET_STATUS (from action response)', res.status);
          dispatch({ type: 'SET_STATUS', status: res.status });
        } else {
          // Fallback: refresh immediately
          const s = await getStatus();
          DEBUG_ENABLED && debugLog('SET_STATUS (from refetch)', s);
          dispatch({ type: 'SET_STATUS', status: s });
        }
        dispatch({ type: 'TOAST', message: 'Done', kind: 'success' });
      } catch (e) {
        if (e instanceof ApiError && e.unauthenticated) {
          DEBUG_ENABLED && debugLog('SEND unauthenticated');
          dispatch({ type: 'LOAD_UNAUTH' });
          dispatch({ type: 'TOAST', message: 'You must sign in', kind: 'error' });
        } else {
          DEBUG_ENABLED && debugLog('SEND error', e);
          dispatch({ type: 'TOAST', message: 'Action failed', kind: 'error' });
        }
      } finally {
        DEBUG_ENABLED && debugLog('SEND_END', req.target);
        dispatch({ type: 'SEND_END', target: req.target });
      }
    },
    []
  );

  const alarm = state.status?.alarm; // 'armed' | 'disarmed'
  const garage = state.status?.garage; // 'open' | 'closed'
  const driveway = state.status?.driveway; // 'open' | 'closed'
  const pool = state.status?.pool; // 'on' | 'off'
  const garden = state.status?.garden; // 'on' | 'off'
  const porch = state.status?.porch; // 'on' | 'off'
  const backyard = state.status?.backyard; // 'on' | 'off'
  const lockStatus = state.status?.lock; // 'open' | 'closed'

  const tiles = useMemo(() => {
    const items: Array<{
      key: string;
      isAction: boolean;
      title: string;
      label?: string;
      variant: 'ok' | 'warning' | 'danger' | 'neutral';
      icon: JSX.Element;
      onClick: () => void;
    }> = [];

    const navigate = (page: AppState['page']) => {
      // Update state
      dispatch({ type: 'NAVIGATE', page });
      // Update URL without adding a back entry
      const targetHash = page === 'home' ? '' : `#${page}`;
      const newUrl = `${location.pathname}${targetHash}`;
      location.replace(newUrl);
    };

    if (state.page === 'home') {
      // Action tiles
      items.push({
        key: 'lock',
        isAction: true,
        title: 'Leave & Lock',
        label: 'Tap to lock',
        variant: lockStatus ? (lockStatus === 'open' ? 'danger' : 'ok') : 'neutral',
        icon: (
          <span className="relative block h-full w-full" aria-hidden="true">
            <Home className="h-full w-full" />
            <Lock className="absolute -bottom-1 -right-1 h-[50%] w-[50%]" />
          </span>
        ),
        onClick: () => void handleAction({ button: 'lock' })
      });
      items.push({
        key: 'alarm',
        isAction: true,
        title: 'Alarm',
        label: alarm ? (alarm === 'armed' ? 'Enabled' : 'Disabled') : undefined,
        variant: alarm ? (alarm === 'armed' ? 'danger' : 'neutral') : 'neutral',
        icon: alarm && alarm === 'armed' ? <Shield className="h-full w-full" /> : <ShieldOff className="h-full w-full" />,
        onClick: () => void handleAction({ button: 'alarm' })
      });
      // Link tiles to subpages (dummy icons for now)
      items.push({
        key: 'nav:garden',
        isAction: false,
        title: 'Garden',
        variant: 'neutral',
        icon: <Trees className="h-full w-full" />,
        onClick: () => navigate('garden')
      });
      items.push({
        key: 'nav:ground',
        isAction: false,
        title: 'Ground',
        variant: 'neutral',
        icon: <Lightbulb className="h-full w-full" />,
        onClick: () => navigate('ground')
      });
      items.push({
        key: "nav:pati's",
        isAction: false,
        title: "Pati's",
        variant: 'neutral',
        icon: <Lightbulb className="h-full w-full" />,
        onClick: () => navigate("pati's")
      });
      items.push({
        key: "nav:pablo's",
        isAction: false,
        title: "Pablo's",
        variant: 'neutral',
        icon: <Lightbulb className="h-full w-full" />,
        onClick: () => navigate("pablo's")
      });
      items.push({
        key: "nav:lara's",
        isAction: false,
        title: "Lara's",
        variant: 'neutral',
        icon: <Lightbulb className="h-full w-full" />,
        onClick: () => navigate("lara's")
      });
      items.push({
        key: 'nav:master',
        isAction: false,
        title: 'Master',
        variant: 'neutral',
        icon: <Lightbulb className="h-full w-full" />,
        onClick: () => navigate('master')
      });
    } else if (state.page === 'garden') {
      // Driveway
      items.push({
        key: 'driveway',
        isAction: true,
        title: 'Driveway',
        label: driveway ? (driveway === 'open' ? 'Open' : 'Closed') : undefined,
        variant: driveway ? (driveway === 'open' ? 'danger' : 'ok') : 'neutral',
        icon: <Car className="h-full w-full" />,
        onClick: () => void handleAction({ button: 'driveway' })
      });
      // Garage
      items.push({
        key: 'garage',
        isAction: true,
        title: 'Garage',
        label: garage ? (garage === 'open' ? 'Open' : 'Closed') : undefined,
        variant: garage ? (garage === 'open' ? 'danger' : 'ok') : 'neutral',
        icon: garage && garage === 'open' ? <DoorOpen className="h-full w-full" /> : <DoorClosed className="h-full w-full" />,
        onClick: () => void handleAction({ button: 'garage' })
      });
      // Pool
      items.push({
        key: 'pool',
        isAction: true,
        title: 'Pool',
        label: pool ? (pool === 'on' ? 'On' : 'Off') : undefined,
        variant: pool ? (pool === 'on' ? 'warning' : 'neutral') : 'neutral',
        icon: <Waves className="h-full w-full" />,
        onClick: () => void handleAction({ button: 'pool' })
      });
      // Garden
      items.push({
        key: 'garden',
        isAction: true,
        title: 'Garden',
        label: garden ? (garden === 'on' ? 'On' : 'Off') : undefined,
        variant: garden ? (garden === 'on' ? 'warning' : 'neutral') : 'neutral',
        icon: <Sun className="h-full w-full" />,
        onClick: () => void handleAction({ button: 'garden' })
      });
      // Porch
      items.push({
        key: 'porch',
        isAction: true,
        title: 'Porch',
        label: porch ? (porch === 'on' ? 'On' : 'Off') : undefined,
        variant: porch ? (porch === 'on' ? 'warning' : 'neutral') : 'neutral',
        icon: <Lightbulb className="h-full w-full" />,
        onClick: () => void handleAction({ button: 'porch' })
      });
      // Backyard
      items.push({
        key: 'backyard',
        isAction: true,
        title: 'Backyard',
        label: backyard ? (backyard === 'on' ? 'On' : 'Off') : undefined,
        variant: backyard ? (backyard === 'on' ? 'warning' : 'neutral') : 'neutral',
        icon: <Trees className="h-full w-full" />,
        onClick: () => void handleAction({ button: 'backyard' })
      });
    } else {
      // Other subpages (placeholders for now)
      items.push({
        key: 'placeholder-1',
        isAction: false,
        title: 'Coming soon',
        variant: 'neutral',
        icon: <Lightbulb className="h-full w-full" />,
        onClick: () => {}
      });
    }

    return items;
  }, [alarm, garage, driveway, pool, garden, porch, backyard, lockStatus, handleAction, state.page, dispatch]);

  return (
    <div className="min-h-full">
      <TopBar
        onRefresh={load}
        refreshing={state.loading}
        pageName={state.page !== 'home' ? (state.page.charAt(0).toUpperCase() + state.page.slice(1)) : undefined}
        onHomeClick={state.page !== 'home' ? () => {
          dispatch({ type: 'NAVIGATE', page: 'home' });
          location.replace(location.pathname);
        } : undefined}
      />

      <main className="mx-auto max-w-md px-4 py-4">
        {/* Auth gate */}
        {state.unauthenticated ? (
          <div className="mt-8 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 p-4 text-amber-900 dark:text-amber-100">
            <div className="font-semibold mb-1">You must sign in to use the controls</div>
            <div className="flex gap-2 mt-2">
              <button className="btn btn-ghost" onClick={handleSignIn} aria-label="Open Google sign-in" disabled={!hasApiBase}>
                Sign in
              </button>
              <button className="btn btn-ghost" onClick={load} aria-label="Retry fetching status">Retry</button>
            </div>
            <div className="text-xs opacity-80 mt-2">
              A login tab will open. After signing in, this page will refresh automatically or you can tap Retry.
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
                sending={t.isAction ? state.sending[t.key as Targets] : false}
                disabled={(t.isAction ? state.sending[t.key as Targets] : false) || state.loading || state.unauthenticated}
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


