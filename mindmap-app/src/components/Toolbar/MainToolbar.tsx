import { useMindmapStore } from '../../stores/mindmap-store';
import { useCanvasStore } from '../../stores/canvas-store';
import { useUiStore } from '../../stores/ui-store';
import { useFileOperations } from '../../hooks/useFileOperations';
import { TOOLBAR_TEXT } from '../../constants/ui-text';

export function MainToolbar() {
  const addNode = useMindmapStore((s) => s.addNode);
  const undo = useMindmapStore((s) => s.undo);
  const redo = useMindmapStore((s) => s.redo);
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const toggleExportDialog = useUiStore((s) => s.toggleExportDialog);
  const { handleNew, handleOpen, handleSave } = useFileOperations({ bindShortcuts: false });

  return (
    <div className="app-toolbar glass-surface" data-testid="main-toolbar">
      <div className="toolbar-group">
        <button
          onClick={() => void handleNew()}
          title={TOOLBAR_TEXT.title.new}
          className="ui-button ui-button--secondary"
        >
          {TOOLBAR_TEXT.new}
        </button>
        <button
          onClick={() => void handleOpen()}
          title={TOOLBAR_TEXT.title.open}
          className="ui-button ui-button--secondary"
        >
          {TOOLBAR_TEXT.open}
        </button>
        <button
          onClick={() => void handleSave()}
          title={TOOLBAR_TEXT.title.save}
          className="ui-button ui-button--secondary"
        >
          {TOOLBAR_TEXT.save}
        </button>
        <button
          onClick={undo}
          title={TOOLBAR_TEXT.title.undo}
          className="ui-button ui-button--secondary"
        >
          {TOOLBAR_TEXT.undo}
        </button>
        <button
          onClick={redo}
          title={TOOLBAR_TEXT.title.redo}
          className="ui-button ui-button--secondary"
        >
          {TOOLBAR_TEXT.redo}
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <button
          onClick={() => selectedNodeId && addNode(selectedNodeId, TOOLBAR_TEXT.newNodeDefaultText)}
          title={TOOLBAR_TEXT.title.addChild}
          disabled={!selectedNodeId}
          className="ui-button ui-button--secondary"
        >
          + {TOOLBAR_TEXT.addChild}
        </button>
      </div>

      <div className="toolbar-spacer" />

      <div className="toolbar-group">
        <button
          onClick={toggleSidebar}
          title={TOOLBAR_TEXT.title.toggleSidebar}
          className="ui-button ui-button--ghost"
        >
          {TOOLBAR_TEXT.toggleSidebar}
        </button>
        <button
          onClick={toggleExportDialog}
          title={TOOLBAR_TEXT.title.export}
          className="ui-button ui-button--primary"
        >
          {TOOLBAR_TEXT.export}
        </button>
      </div>
    </div>
  );
}
