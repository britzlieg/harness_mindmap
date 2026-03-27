import { useMemo, useState } from 'react';
import { useUiStore } from '../../stores/ui-store';
import { useMindmapStore } from '../../stores/mindmap-store';
import { EXPORT_TEXT } from '../../constants/ui-text';
import { normalizeNodeTextTree } from '../../utils/node-text';
import type { ExportFormat } from '../../types';

const formats = [
  { key: 'markdown', label: EXPORT_TEXT.formats.markdown, ext: '.md' },
  { key: 'svg', label: EXPORT_TEXT.formats.svg, ext: '.svg' },
  { key: 'png', label: EXPORT_TEXT.formats.png, ext: '.png' },
] as const satisfies ReadonlyArray<{ key: ExportFormat; label: string; ext: string }>;

const PNG_SCALE_PERCENT_DEFAULT = 100;
const PNG_SCALE_PERCENT_MIN = 50;
const PNG_SCALE_PERCENT_MAX = 400;
const PNG_SCALE_INPUT_PATTERN = /^\d+$/;

function waitForRenderReady(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => resolve());
      });
      return;
    }
    window.setTimeout(resolve, 16);
  });
}

export function ExportDialog() {
  const { exportDialogOpen, toggleExportDialog } = useUiStore();
  const setNodes = useMindmapStore((s) => s.setNodes);
  useMindmapStore((s) => s.nodes);
  useMindmapStore((s) => s.metadata);
  const [pngScaleInput, setPngScaleInput] = useState(String(PNG_SCALE_PERCENT_DEFAULT));
  const [pngScaleError, setPngScaleError] = useState('');

  const pngScaleHint = useMemo(
    () => `${EXPORT_TEXT.pngScaleHintPrefix} ${PNG_SCALE_PERCENT_MIN}-${PNG_SCALE_PERCENT_MAX}%`,
    []
  );

  if (!exportDialogOpen) return null;

  const handleExport = async (format: ExportFormat) => {
    try {
      await waitForRenderReady();
      const { nodes, metadata } = useMindmapStore.getState();
      if (!metadata) {
        throw new Error('Current document metadata is missing, cannot export.');
      }

      const sanitizedNodes = normalizeNodeTextTree(nodes);
      setNodes(sanitizedNodes);

      let pngScalePercent = PNG_SCALE_PERCENT_DEFAULT;
      if (format === 'png') {
        const normalizedInput = pngScaleInput.trim();
        if (!PNG_SCALE_INPUT_PATTERN.test(normalizedInput)) {
          setPngScaleError(EXPORT_TEXT.pngScaleInvalid);
          return;
        }
        const parsed = Number(normalizedInput);
        if (!Number.isInteger(parsed) || parsed < PNG_SCALE_PERCENT_MIN || parsed > PNG_SCALE_PERCENT_MAX) {
          setPngScaleError(EXPORT_TEXT.pngScaleInvalid);
          return;
        }
        pngScalePercent = parsed;
      }
      setPngScaleError('');

      const filePath = await window.electronAPI.export.saveAs(
        { nodes: sanitizedNodes, metadata },
        format,
        format === 'png' ? { scalePercent: pngScalePercent } : undefined
      );
      if (filePath) {
        console.log('Export complete:', filePath);
        toggleExportDialog();
      }
    } catch (error) {
      console.error('Export failed:', error);
      if (format === 'png') {
        setPngScaleError(error instanceof Error ? error.message : EXPORT_TEXT.pngScaleInvalid);
      }
    }
  };

  return (
    <div className="dialog-overlay" onClick={toggleExportDialog}>
      <div className="dialog-shell glass-surface-strong" onClick={(e) => e.stopPropagation()}>
        <h2 className="dialog-title">{EXPORT_TEXT.title}</h2>
        <div className="ui-form-group">
          <label htmlFor="png-scale-input" className="ui-text-muted text-xs">{EXPORT_TEXT.pngScaleLabel}</label>
          <input
            id="png-scale-input"
            data-testid="png-scale-input"
            className="ui-input mt-1"
            value={pngScaleInput}
            onChange={(e) => {
              setPngScaleInput(e.target.value);
              if (pngScaleError) {
                setPngScaleError('');
              }
            }}
            inputMode="numeric"
            placeholder={String(PNG_SCALE_PERCENT_DEFAULT)}
          />
          <p className="ui-text-muted text-xs mt-1">{pngScaleHint}</p>
          {pngScaleError && <p className="ui-text-error text-xs mt-1">{pngScaleError}</p>}
        </div>
        {formats.map(({ key, label, ext }) => (
          <button key={key} onClick={() => void handleExport(key)} className="ui-format-option">
            <div className="font-medium text-sm">{label} <span className="ui-text-muted">{ext}</span></div>
          </button>
        ))}
        <button onClick={toggleExportDialog} className="ui-button ui-button--secondary w-full mt-2">{EXPORT_TEXT.cancel}</button>
      </div>
    </div>
  );
}
