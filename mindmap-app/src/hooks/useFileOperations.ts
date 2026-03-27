import { useEffect, useCallback } from 'react';
import { useMindmapStore } from '../stores/mindmap-store';
import { normalizeNodeTextTree } from '../utils/node-text';

interface UseFileOperationsOptions {
  bindShortcuts?: boolean;
}

export function useFileOperations(
  options: UseFileOperationsOptions = {}
): { handleNew: () => Promise<void>; handleOpen: () => Promise<void>; handleSave: () => Promise<void> } {
  const { bindShortcuts = true } = options;

  const handleNew = useCallback(async () => {
    try {
      const result = await window.electronAPI.file.create();
      if (result) {
        const store = useMindmapStore.getState();
        store.setFilePath(result.filePath);
        store.setMetadata(result.metadata);
        store.setNodes(normalizeNodeTextTree(result.nodes));
        if (result.nodes.length === 0) {
          store.createRootNode();
        }
      }
    } catch (error) {
      console.error('Failed to create file:', error);
    }
  }, []);

  const handleOpen = useCallback(async () => {
    try {
      const result = await window.electronAPI.file.open();
      if (!result) return;
      if (!result.filePath || !result.metadata || !Array.isArray(result.nodes)) {
        throw new Error('Open file returned an invalid payload.');
      }

      useMindmapStore.setState({
        filePath: result.filePath,
        metadata: result.metadata,
        nodes: normalizeNodeTextTree(result.nodes),
      });
    } catch (error) {
      console.error('Failed to open file:', error);
    }
  }, []);

  const handleSave = useCallback(async () => {
    try {
      const store = useMindmapStore.getState();
      let { filePath, nodes, metadata } = store;
      if (!metadata) return;
      nodes = normalizeNodeTextTree(nodes);
      store.setNodes(nodes);

      if (!filePath) {
        const selectedPath = await window.electronAPI.file.saveAs({ nodes, metadata });
        if (!selectedPath) return;
        filePath = selectedPath;
        store.setFilePath(selectedPath);
      }

      await window.electronAPI.file.save(filePath, { nodes, metadata });
    } catch (error) {
      console.error('Failed to save file:', error);
    }
  }, []);

  useEffect(() => {
    if (!bindShortcuts) return undefined;

    const onKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (isCtrl && key === 'n') { e.preventDefault(); void handleNew(); }
      if (isCtrl && key === 'o') { e.preventDefault(); void handleOpen(); }
      if (isCtrl && key === 's') { e.preventDefault(); void handleSave(); }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [bindShortcuts, handleNew, handleOpen, handleSave]);

  return { handleNew, handleOpen, handleSave };
}
