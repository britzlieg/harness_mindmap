import { ipcMain } from 'electron';
import { computeLayout } from '../shared/utils/layout-algorithms';
import { assertTrustedIpcSender } from './security';
import { assertNodeArray, parseLayoutType } from './validators';

export function registerLayoutHandlers(): void {
  ipcMain.handle('layout:compute', async (event, nodes: unknown, type: unknown) => {
    assertTrustedIpcSender(event);
    assertNodeArray(nodes, 'Layout nodes payload must be an array.');
    const parsedType = parseLayoutType(type);
    const positions = computeLayout(nodes, parsedType);
    return Object.fromEntries(positions);
  });
}
