import { useUiStore } from '../../stores/ui-store';
import { NodeEditor } from './NodeEditor';
import { ThemeSelector } from './ThemeSelector';
import { LayoutSelector } from './LayoutSelector';
import { SIDEBAR_TEXT } from '../../constants/ui-text';

const tabs = [
  { key: 'editor' as const, label: SIDEBAR_TEXT.tabs.editor },
  { key: 'theme' as const, label: SIDEBAR_TEXT.tabs.theme },
  { key: 'layout' as const, label: SIDEBAR_TEXT.tabs.layout },
];

export function Sidebar() {
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const sidebarTab = useUiStore((s) => s.sidebarTab);
  const setSidebarTab = useUiStore((s) => s.setSidebarTab);

  if (!sidebarOpen) return null;

  return (
    <div className="app-sidebar glass-surface">
      <div className="app-sidebar-tabs">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSidebarTab(key)}
            className={`app-sidebar-tab ${sidebarTab === key ? 'app-sidebar-tab--active' : ''}`}
          >{label}</button>
        ))}
      </div>
      <div className="app-sidebar-content">
        {sidebarTab === 'editor' && <NodeEditor />}
        {sidebarTab === 'theme' && <ThemeSelector />}
        {sidebarTab === 'layout' && <LayoutSelector />}
      </div>
    </div>
  );
}
