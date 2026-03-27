import { useUiStore } from '../../stores/ui-store';
import { SHORTCUTS_TEXT } from '../../constants/ui-text';

const shortcuts = SHORTCUTS_TEXT.items;

export function ShortcutsHelp() {
  const { shortcutsHelpOpen, toggleShortcutsHelp } = useUiStore();
  if (!shortcutsHelpOpen) return null;

  return (
    <div className="dialog-overlay" onClick={toggleShortcutsHelp}>
      <div className="dialog-shell glass-surface-strong" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <h2 className="dialog-title">{SHORTCUTS_TEXT.title}</h2>
        <table className="ui-shortcut-table">
          <tbody>
            {shortcuts.map(({ key, desc }) => (
              <tr key={key}>
                <td className="ui-shortcut-key">{key}</td>
                <td>{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={toggleShortcutsHelp} className="ui-button ui-button--primary mt-4">{SHORTCUTS_TEXT.close}</button>
      </div>
    </div>
  );
}
