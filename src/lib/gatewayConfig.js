/**
 * Centralized Remote Azure Load Balancer Gateway configuration.
 * Uses the online Azure LB-VM (20.244.34.101:5000 / Priv: 172.16.0.4) by default.
 * On HTTPS origins (e.g. Vercel / Netlify), automatically routes plain-HTTP Azure
 * endpoints through same-origin proxy paths (/lb-api and /vm-api/*) to avoid Mixed Content blocks.
 */

export const PROXY_GATEWAY_PATH = '/lb-api';

const RAW_DEFAULT_GATEWAY_URL = normalizeGatewayUrl(
  import.meta.env.VITE_API_BASE_URL || 'http://20.244.34.101:5000'
);

export const DEFAULT_GATEWAY_URL = RAW_DEFAULT_GATEWAY_URL;
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

function isHttpsPage() {
  return typeof window !== 'undefined' && window.location?.protocol === 'https:';
}

function getDefaultHostLabel() {
  try {
    return new URL(RAW_DEFAULT_GATEWAY_URL).host;
  } catch {
    return '20.244.34.101:5000';
  }
}

function resolveGatewayForOrigin(url) {
  const normalized = normalizeGatewayUrl(url);
  if (!normalized) return isHttpsPage() ? PROXY_GATEWAY_PATH : RAW_DEFAULT_GATEWAY_URL;

  // On HTTPS deployments, rewrite plain-HTTP requests targeting the default Azure LB-VM
  // (or an explicit /lb-api path) through the same-origin /lb-api reverse proxy.
  if (isHttpsPage() && /^http:\/\//i.test(normalized)) {
    try {
      const targetHost = new URL(normalized).host;
      if (targetHost === getDefaultHostLabel() || targetHost === '20.244.34.101:5000') {
        return PROXY_GATEWAY_PATH;
      }
    } catch {
      // keep normalized URL if parsing fails
    }
  }

  return normalized;
}

export function normalizeGatewayUrl(raw) {
  if (!raw || typeof raw !== 'string') return '';
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  if (trimmed.startsWith('/')) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `http://${trimmed}`;
}

export function getGatewayUrl() {
  if (typeof window === 'undefined') return RAW_DEFAULT_GATEWAY_URL;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const normalized = normalizeGatewayUrl(saved);
      if (normalized && !LEGACY_LOCAL_URLS.has(normalized)) {
        return resolveGatewayForOrigin(normalized);
      }
    }
  } catch {
    // ignore storage access issues
  }
  return resolveGatewayForOrigin(RAW_DEFAULT_GATEWAY_URL);
}

/**
 * Returns the base URL for direct backend VM HTTP calls (used by Direct Probe & No-LB Crash tests).
 * Routes via same-origin /vm-api/<id> when running on HTTPS to avoid Mixed Content blocks.
 */
export function getVmBaseUrl(vmOrId) {
  const vm =
    typeof vmOrId === 'string'
      ? KNOWN_VMS[vmOrId] || { id: vmOrId, pub: vmOrId }
      : vmOrId || KNOWN_VMS['server-1'];

  if (isHttpsPage() && vm?.id && Object.prototype.hasOwnProperty.call(KNOWN_VMS, vm.id)) {
    return `/vm-api/${vm.id}`;
  }

  return normalizeGatewayUrl(vm?.pub) || 'http://52.172.229.225:5001';
}

export function setGatewayUrl(nextUrl) {
  const normalized = normalizeGatewayUrl(nextUrl) || RAW_DEFAULT_GATEWAY_URL;
  const effective = resolveGatewayForOrigin(normalized);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, normalized);
    } catch {
      // ignore storage write issues
    }
    window.dispatchEvent(
      new CustomEvent('bifrost-gateway-change', { detail: { url: effective } })
    );
  }
  return effective;
}

export function resetGatewayUrl() {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    const effective = resolveGatewayForOrigin(RAW_DEFAULT_GATEWAY_URL);
    window.dispatchEvent(
      new CustomEvent('bifrost-gateway-change', { detail: { url: effective } })
    );
    return effective;
  }
  return RAW_DEFAULT_GATEWAY_URL;
}

export function getGatewayHost(url = getGatewayUrl()) {
  if (!url || url === PROXY_GATEWAY_PATH || url.startsWith(`${PROXY_GATEWAY_PATH}/`)) {
    return getDefaultHostLabel();
  }
  try {
    const parsed = new URL(url);
    return parsed.host;
  } catch {
    return url.replace(/^https?:\/\//i, '').replace(/\/+$/, '') || getDefaultHostLabel();
  }
}

export function subscribeGatewayChange(callback) {
  if (typeof window === 'undefined') return () => {};
  const handler = (e) => callback(e.detail?.url || getGatewayUrl());
  window.addEventListener('bifrost-gateway-change', handler);
  return () => window.removeEventListener('bifrost-gateway-change', handler);
}
