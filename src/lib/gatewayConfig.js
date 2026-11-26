/**
 * Centralized Remote Azure Load Balancer Gateway configuration.
 * Uses the online Azure LB-VM (20.244.34.101:5000 / Priv: 172.16.0.4) by default
 * and supports live runtime override from the browser UI without CLI scripts.
 */

export const DEFAULT_GATEWAY_URL = normalizeGatewayUrl(
  import.meta.env.VITE_API_BASE_URL || 'http://20.244.34.101:5000'
);

export const DEFAULT_GATEWAY_PRIVATE_IP = '172.16.0.4';
export const DEFAULT_GATEWAY_VNET = 'vnet-centralindia-2 / snet-centralindia-1';

const STORAGE_KEY = 'bifrost-gateway-url';

export const KNOWN_VMS = {
  'server-1': { id: 'server-1', name: 'Server A', pub: '52.172.229.225:5001', priv: '10.0.1.10' },
  'server-2': { id: 'server-2', name: 'Server B', pub: '20.193.245.71:5001', priv: '10.0.1.11' },
  'server-3': { id: 'server-3', name: 'Server C', pub: '52.172.255.132:5001', priv: '10.0.1.12' },
};

const LEGACY_LOCAL_URLS = new Set([
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'localhost:5000',
  '127.0.0.1:5000',
]);

export function normalizeGatewayUrl(raw) {
  if (!raw || typeof raw !== 'string') return '';
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `http://${trimmed}`;
}

export function getGatewayUrl() {
  if (typeof window === 'undefined') return DEFAULT_GATEWAY_URL;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const normalized = normalizeGatewayUrl(saved);
      if (normalized && !LEGACY_LOCAL_URLS.has(normalized)) {
        return normalized;
      }
    }
  } catch {
    // ignore storage access issues
  }
  return DEFAULT_GATEWAY_URL;
}

export function setGatewayUrl(nextUrl) {
  const normalized = normalizeGatewayUrl(nextUrl) || DEFAULT_GATEWAY_URL;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, normalized);
    } catch {
      // ignore storage write issues
    }
    window.dispatchEvent(
      new CustomEvent('bifrost-gateway-change', { detail: { url: normalized } })
    );
  }
  return normalized;
}

export function resetGatewayUrl() {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    window.dispatchEvent(
      new CustomEvent('bifrost-gateway-change', { detail: { url: DEFAULT_GATEWAY_URL } })
    );
  }
  return DEFAULT_GATEWAY_URL;
}

export function getGatewayHost(url = getGatewayUrl()) {
  try {
    const parsed = new URL(url);
    return parsed.host;
  } catch {
    return url.replace(/^https?:\/\//i, '').replace(/\/+$/, '') || '20.244.34.101:5000';
  }
}

export function subscribeGatewayChange(callback) {
  if (typeof window === 'undefined') return () => {};
  const handler = (e) => callback(e.detail?.url || getGatewayUrl());
  window.addEventListener('bifrost-gateway-change', handler);
  return () => window.removeEventListener('bifrost-gateway-change', handler);
}
