/**
 * Open external URL in system's default browser (via Tauri command or window.open fallback)
 */
export async function openExternalUrl(url: string): Promise<void> {
  let targetUrl = (url || '').trim();
  if (!targetUrl) return;

  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = 'https://' + targetUrl;
  }

  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('open_url', { url: targetUrl });
  } catch (err) {
    console.warn('Tauri open_url command invoke failed or not in Tauri environment, falling back to window.open', err);
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  }
}
