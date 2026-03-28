import { afterEach, describe, expect, it } from 'vitest';
import { assertTrustedIpcSender } from '../../electron/ipc/security';

function createEvent(url: string) {
  return {
    senderFrame: { url },
    sender: {
      getURL: () => url,
    },
  } as any;
}

describe('ipc security', () => {
  afterEach(() => {
    delete process.env.VITE_DEV_SERVER_URL;
  });

  it('accepts file:// senders when not using dev server', () => {
    expect(() => assertTrustedIpcSender(createEvent('file://index.html'))).not.toThrow();
  });

  it('rejects non-file senders when not using dev server', () => {
    expect(() => assertTrustedIpcSender(createEvent('https://evil.example'))).toThrow(
      'Unauthorized IPC sender.'
    );
  });

  it('accepts senders from the configured dev server origin', () => {
    process.env.VITE_DEV_SERVER_URL = 'http://localhost:5173';
    expect(() => assertTrustedIpcSender(createEvent('http://localhost:5173/app'))).not.toThrow();
  });

  it('rejects senders with a different dev server origin', () => {
    process.env.VITE_DEV_SERVER_URL = 'http://localhost:5173';
    expect(() => assertTrustedIpcSender(createEvent('http://localhost:4173/app'))).toThrow(
      'Unauthorized IPC sender.'
    );
  });
});
