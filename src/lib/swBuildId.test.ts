import { describe, it, expect } from 'vitest';
import { compareBuildIds, requestWaitingBuildId } from '@/lib/swBuildId';

// A ServiceWorker stand-in that lets each test script the worker's reply.
const fakeWorker = (
  onMessage: (message: unknown, transfer: Transferable[]) => void,
): ServiceWorker => ({ postMessage: onMessage }) as unknown as ServiceWorker;

const replyPortFrom = (transfer: Transferable[]): MessagePort =>
  transfer[0] as MessagePort;

describe('requestWaitingBuildId', () => {
  it('resolves with the id the worker replies with', async () => {
    const worker = fakeWorker((_message, transfer) => {
      replyPortFrom(transfer).postMessage('abc123');
    });

    await expect(requestWaitingBuildId(worker)).resolves.toBe('abc123');
  });

  it('resolves null when the worker replies with a non-string', async () => {
    const worker = fakeWorker((_message, transfer) => {
      replyPortFrom(transfer).postMessage({ unexpected: true });
    });

    await expect(requestWaitingBuildId(worker)).resolves.toBeNull();
  });

  it('resolves null when the worker never replies (pre-handshake worker)', async () => {
    const worker = fakeWorker(() => {
      // Old deployed workers have no GET_BUILD_ID handler — silence.
    });

    await expect(requestWaitingBuildId(worker, 20)).resolves.toBeNull();
  });

  it('resolves null when messaging the worker throws (redundant worker)', async () => {
    const worker = fakeWorker(() => {
      throw new DOMException('worker is redundant', 'InvalidStateError');
    });

    await expect(requestWaitingBuildId(worker)).resolves.toBeNull();
  });

  it('sends a GET_BUILD_ID message with a reply port', async () => {
    let received: unknown;
    let ports: Transferable[] = [];
    const worker = fakeWorker((message, transfer) => {
      received = message;
      ports = transfer;
      replyPortFrom(transfer).postMessage('any');
    });

    await requestWaitingBuildId(worker);

    expect(received).toEqual({ type: 'GET_BUILD_ID' });
    expect(ports[0]).toBeInstanceOf(MessagePort);
  });
});

describe('compareBuildIds', () => {
  it('matches only when both ids are known and equal', () => {
    expect(compareBuildIds('sha-1', 'sha-1')).toBe(true);
    expect(compareBuildIds('sha-1', 'sha-2')).toBe(false);
  });

  it('fails open when either id is unknown', () => {
    expect(compareBuildIds(null, 'sha-1')).toBe(false);
    expect(compareBuildIds('sha-1', null)).toBe(false);
    expect(compareBuildIds(null, null)).toBe(false);
  });

  it('fails open on empty ids', () => {
    expect(compareBuildIds('', '')).toBe(false);
  });

  it('never treats two unstamped dev builds as the same version', () => {
    expect(compareBuildIds('dev', 'dev')).toBe(false);
  });
});
