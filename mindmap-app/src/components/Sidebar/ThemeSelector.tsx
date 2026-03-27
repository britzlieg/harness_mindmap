import { useMindmapStore } from '../../stores/mindmap-store';
import { normalizeThemeName, themes } from '../../themes';
import { getThemeDisplayName, THEME_TEXT } from '../../constants/ui-text';

export function ThemeSelector() {
  const metadata = useMindmapStore((s) => s.metadata);
  const setMetadata = useMindmapStore((s) => s.setMetadata);
  const currentTheme = normalizeThemeName(metadata?.theme);

  return (
    <div className="panel-stack">
      <label className="panel-section-title">{THEME_TEXT.title}</label>
      <div className="ui-theme-grid">
        {Object.entries(themes).map(([key, theme]) => (
          <button
            key={key}
            onClick={() => {
              if (!metadata) return;
              setMetadata({ ...metadata, theme: key });
            }}
            className={`ui-theme-card ${currentTheme === key ? 'ui-theme-card--active' : ''}`}
          >
            <div className="flex gap-1 mb-1">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: theme.rootNode.backgroundColor }} />
              <div className="w-4 h-4 rounded" style={{ backgroundColor: theme.branchNode.backgroundColor }} />
              <div className="w-4 h-4 rounded" style={{ backgroundColor: theme.leafNode.backgroundColor }} />
            </div>
            <span className="text-xs ui-text-muted">{getThemeDisplayName(key, theme.name)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
