import { useEffect, useRef } from 'react';
import { useMindmapStore } from '../stores/mindmap-store';
import { normalizeNodeTextTree } from '../utils/node-text';

const AUTO_SAVE_INTERVAL = 30000;

export function useAutoSave() {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(async () => {
      const { nodes, metadata, filePath, setNodes } = useMindmapStore.getState();
      if (!filePath || !metadata) return;
      try {
        const sanitizedNodes = normalizeNodeTextTree(nodes);
        setNodes(sanitizedNodes);
        await window.electronAPI.file.save(filePath, { nodes: sanitizedNodes, metadata });
        console.log('Auto-saved at', new Date().toLocaleTimeString());
      } catch (err) {
        console.error('Auto-save failed:', err);
      }
    }, AUTO_SAVE_INTERVAL);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);
}
