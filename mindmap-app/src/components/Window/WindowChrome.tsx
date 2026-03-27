import { useCallback, useEffect, useState } from 'react';
import { WINDOW_TEXT } from '../../constants/ui-text';

export function WindowChrome() {
  const windowApi = typeof window !== 'undefined' ? window.electronAPI?.window : undefined;
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    let active = true;
    if (!windowApi) {
      return () => {
        active = false;
      };
    }

    void windowApi.isMaximized()
      .then((value) => {
        if (active) {
          setMaximized(value);
        }
      })
      .catch(() => {
        if (active) {
          setMaximized(false);
        }
      });

    return () => {
      active = false;
    };
  }, [windowApi]);

  const handleToggleMaximize = useCallback(async () => {
    if (!windowApi) return;
    try {
      const nextState = await windowApi.toggleMaximize();
      setMaximized(nextState);
    } catch {
      // Keep UI responsive even if host window state cannot be queried.
    }
  }, [windowApi]);

  if (!windowApi) {
    return null;
  }

  return (
    <div className="app-window-chrome glass-surface" data-testid="window-chrome">
      <div className="app-window-chrome__title">{WINDOW_TEXT.title}</div>
      <div className="app-window-controls">
        <button
          type="button"
          className="window-control-button"
          title={WINDOW_TEXT.minimize}
          aria-label={WINDOW_TEXT.minimize}
          onClick={() => void windowApi.minimize()}
        >
          -
        </button>
        <button
          type="button"
          className="window-control-button"
          title={maximized ? WINDOW_TEXT.restore : WINDOW_TEXT.maximize}
          aria-label={maximized ? WINDOW_TEXT.restore : WINDOW_TEXT.maximize}
          onClick={() => void handleToggleMaximize()}
        >
          {maximized ? '[]' : '[ ]'}
        </button>
        <button
          type="button"
          className="window-control-button window-control-button--close"
          title={WINDOW_TEXT.close}
          aria-label={WINDOW_TEXT.close}
          onClick={() => void windowApi.close()}
        >
          X
        </button>
      </div>
    </div>
  );
}
