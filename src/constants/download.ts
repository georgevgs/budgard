// How long a download's object URL outlives the click that started it.
//
// Revoking it straight after `click()` is the obvious cleanup, but the click
// only starts the download: Safari — and so every installed iOS PWA — reads
// the blob after the handler returns, and a revoked URL cancels the file or
// opens a blank page. A minute is long past any read, and the blob is small.
const REVOKE_AFTER_MS = 60_000;

/** Hands the browser a file to save. */
export const downloadBlob = (filename: string, blob: Blob): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), REVOKE_AFTER_MS);
};
