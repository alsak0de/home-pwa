const queryHasDebug = typeof window !== 'undefined' && window.location.search.includes('debug=1');
const localStorageDebug = (() => {
  try {
    return typeof window !== 'undefined' && window.localStorage.getItem('debug') === '1';
  } catch {
    return false;
  }
})();

export const DEBUG_ENABLED: boolean = import.meta.env.DEV || queryHasDebug || localStorageDebug;

export function debugLog(...args: unknown[]) {
  if (DEBUG_ENABLED) {
    // eslint-disable-next-line no-console
    console.log('[home-pwa]', ...args);
  }
}



