import { useMindmapStore } from '../../stores/mindmap-store';
import type { LayoutType } from '../../types';
import { LAYOUT_TEXT } from '../../constants/ui-text';

const layouts: Array<{ type: LayoutType; label: string }> = [
  { type: 'mindmap', label: LAYOUT_TEXT.labels.mindmap },
  { type: 'logic', label: LAYOUT_TEXT.labels.logic },
  { type: 'org', label: LAYOUT_TEXT.labels.org },
  { type: 'tree-right', label: LAYOUT_TEXT.labels['tree-right'] },
  { type: 'tree-left', label: LAYOUT_TEXT.labels['tree-left'] },
];

export function LayoutSelector() {
  const metadata = useMindmapStore((s) => s.metadata);
  const setMetadata = useMindmapStore((s) => s.setMetadata);
  const current = metadata?.layoutType || 'mindmap';

  return (
    <div className="panel-stack">
      <label className="panel-section-title">{LAYOUT_TEXT.title}</label>
      <div className="ui-option-list">
        {layouts.map(({ type, label }) => (
          <button
            key={type}
            onClick={() => {
              if (!metadata) return;
              setMetadata({ ...metadata, layoutType: type });
            }}
            className={`ui-option ${current === type ? 'ui-option--active' : ''}`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
