import type { IpcMainInvokeEvent } from 'electron';

function isTrustedUrl(url: string): boolean {
  if (!url) {
    return false;
  }

  if (process.env.VITE_DEV_SERVER_URL) {
    try {
      const trustedOrigin = new URL(process.env.VITE_DEV_SERVER_URL).origin;
      return new URL(url).origin === trustedOrigin;
    } catch {
      return false;
    }
  }

  return url.startsWith('file://');
}

export function assertTrustedIpcSender(event: IpcMainInvokeEvent): void {
  const senderUrl = event.senderFrame?.url ?? event.sender.getURL();
  if (!isTrustedUrl(senderUrl)) {
    throw new Error('Unauthorized IPC sender.');
  }
}
