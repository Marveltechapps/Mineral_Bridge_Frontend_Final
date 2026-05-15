/**
 * Central API service for Mineral Bridge backend.
 * All backend/DB endpoints used by the Expo app.
 */
import { getApiBase, fetchWithAuth, fetchMultipart, fetchPublic } from './api';
import { Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// —— Auth (no token)
export async function sendOtp(body) {
  const res = await fetchPublic('/api/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to send OTP');
  return data;
}

export async function verifyOtp(body) {
  const res = await fetchPublic('/api/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Invalid OTP');
  return data;
}

export async function registerOrLogin(body) {
  const res = await fetchPublic('/api/auth/register-or-login', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Login failed');
  return data;
}

// —— File uploads (multipart → S3)

/** Upload avatar image via multipart. `uri` is the local file URI from ImagePicker. */
export async function uploadAvatar(uri, mimeType = 'image/jpeg') {
  try {
    const ext = mimeType === 'image/png' ? '.png' : '.jpg';
    const form = new FormData();
    form.append('avatar', { uri, name: `avatar${ext}`, type: mimeType });
    const res = await fetchMultipart('/api/users/me/profile', form, 'PATCH');
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed to upload avatar');
    return data;
  } catch (err) {
    if (err.message === 'Network request failed' || err.name === 'TypeError') {
      throw new Error('Network error. Please check your connection and try again.');
    }
    throw err;
  }
}

/**
 * Upload KYC document images via multipart.
 * Pass file URIs (from ImagePicker) for front/back/selfie. Null fields are skipped.
 */
export async function uploadKycDocuments(idType, { frontUri, backUri, selfieUri } = {}) {
  const form = new FormData();
  form.append('idType', idType);
  if (frontUri) {
    form.append('front', { uri: frontUri, name: 'front.jpg', type: 'image/jpeg' });
  }
  if (backUri) {
    form.append('back', { uri: backUri, name: 'back.jpg', type: 'image/jpeg' });
  }
  if (selfieUri) {
    form.append('selfie', { uri: selfieUri, name: 'selfie.jpg', type: 'image/jpeg' });
  }
  try {
    const res = await fetchMultipart('/api/kyc/documents', form, 'POST');
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || 'Failed to upload KYC documents');
      if (data.code) err.code = data.code;
      throw err;
    }
    return data;
  } catch (err) {
    if (err.message === 'Network request failed' || err.name === 'TypeError') {
      throw new Error('Network error. Please check your connection and try again.');
    }
    throw err;
  }
}

/**
 * Upload a single file to S3 via backend. Uses plan: module/category/userId/unique_filename.ext
 * @param {string} uri - Local file URI (from ImagePicker or DocumentPicker).
 * @param {string} mimeType - e.g. 'image/jpeg', 'application/pdf'.
 * @param {object} options - { module, folder (category), subfolder?, title? }
 *   module: 'home'|'buy'|'sell'|'more' (default 'more' for user uploads)
 *   folder (category): 'address-proofs'|'documents'|'photos'|'ids'|'certifications'|'licence'|'avatars'|'kyc'|'listings'|'emergency-evidence'|'images'
 *   Use: Buy Delivery -> { module: 'buy', folder: 'address-proofs' }; Sell Logistics -> { module: 'sell', folder: 'address-proofs' };
 *   More Addresses -> { module: 'more', folder: 'address-proofs' }; Artisanal licence -> { module: 'more', folder: 'licence' }; Listing photo -> { module: 'sell', folder: 'photos' }
 * @returns {Promise<{ url: string, key: string }>}
 */
export async function uploadFileToS3(uri, mimeType, options = {}) {
  const folder = options.folder || 'documents';
  const module = options.module || 'more';
  const ext = mimeType === 'application/pdf' ? '.pdf' : mimeType === 'image/png' ? '.png' : '.jpg';
  const form = new FormData();
  form.append('file', { uri, name: `file${ext}`, type: mimeType });
  form.append('folder', folder);
  form.append('category', folder);
  form.append('module', module);
  form.append('scope', 'user');
  if (options.subfolder) form.append('subfolder', options.subfolder);
  if (options.title) form.append('title', options.title);
  try {
    const res = await fetchMultipart('/api/upload', form, 'POST');
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || data.message || 'Upload failed');
    return { url: data.url, key: data.key };
  } catch (err) {
    if (err.message === 'Network request failed' || err.name === 'TypeError') {
      throw new Error('Network error. Please check your connection and try again.');
    }
    throw err;
  }
}

// —— Users & Profile (auth)
export async function getMe() {
  const res = await fetchWithAuth('/api/users/me');
  if (!res.ok) throw new Error('Failed to load profile');
  return res.json();
}

export async function updateMe(payload) {
  const res = await fetchWithAuth('/api/users/me', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Update failed');
  return res.json();
}

/** Form drafts: existing user (same mobile) gets last-used form data for auto-fill. New user gets null. */
export async function getFormDrafts() {
  const res = await fetchWithAuth('/api/users/me/form-drafts');
  if (res.status === 401) return null;
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  return data && typeof data === 'object' ? data : null;
}

/** Save last-used form data for current user (so next time form is auto-filled). flow: 'buyQuantity' | 'sellDetails' | 'buyDelivery' | etc. */
export async function saveFormDraft(flow, data) {
  const res = await fetchWithAuth('/api/users/me/form-drafts', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ flow, data }),
  });
  if (!res.ok) return;
  return res.json().catch(() => null);
}

// —— Minerals (public GET; create/update require auth for dashboard)
export async function getMinerals(query = {}) {
  const q = new URLSearchParams(query).toString();
  const path = q ? `${getApiBase()}/api/minerals?${q}` : `${getApiBase()}/api/minerals`;
  const res = await fetch(path);
  if (!res.ok) throw new Error('Failed to load minerals');
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

// —— Orders contact summary (for Awaiting Team Contact in app order detail)
export async function getOrderContactSummary(orderId) {
  if (!orderId) throw new Error('orderId required');
  const res = await fetchWithAuth(`/api/orders/${orderId}/contact-summary`);
  if (!res.ok) {
    // If backend does not support or returns 404, just return null so UI can hide block
    return null;
  }
  return res.json();
}

/** Category order for Buy/Sell: Precious Metal, Gemstone, Industrial Mineral, Critical Mineral, Energy Mineral (matches catalog). */
const MINERAL_CATEGORY_ORDER = ['Precious metals', 'Gemstone', 'Industrial mineral', 'Critical mineral', 'Energy mineral'];
const MINERAL_CATEGORY_ORDER_VARIANTS = [
  ['Precious metals', 'Precious metal', 'Precious Metal'],
  ['Gemstone', 'Gemstones'],
  ['Industrial mineral', 'Industrial Mineral', 'Industrial minerals'],
  ['Critical mineral', 'Critical Mineral', 'Critical minerals'],
  ['Energy mineral', 'Energy Mineral', 'Energy minerals'],
];

/** Canonical display names for categories (matches catalog: Precious Metal → Gold/Platinum/Silver, Gemstone → Diamond/Emerald/etc.). */
const CATEGORY_DISPLAY_NAMES = {
  'Precious metals': 'Precious Metal',
  'Precious metal': 'Precious Metal',
  'Precious Metal': 'Precious Metal',
  'Gemstone': 'Gemstone',
  'Gemstones': 'Gemstone',
  'Industrial mineral': 'Industrial Mineral',
  'Industrial Mineral': 'Industrial Mineral',
  'Industrial minerals': 'Industrial Mineral',
  'Critical mineral': 'Critical Mineral',
  'Critical Mineral': 'Critical Mineral',
  'Critical minerals': 'Critical Mineral',
  'Energy mineral': 'Energy Mineral',
  'Energy Mineral': 'Energy Mineral',
  'Energy minerals': 'Energy Mineral',
};

/** Returns display label for a category (e.g. "Precious Metal") for use in Buy/Sell screens. */
export function getCategoryDisplayName(category) {
  if (!category) return '';
  const key = String(category).trim();
  if (CATEGORY_DISPLAY_NAMES[key]) return CATEGORY_DISPLAY_NAMES[key];
  const lower = key.toLowerCase();
  const entry = Object.entries(CATEGORY_DISPLAY_NAMES).find(([k]) => k.toLowerCase() === lower);
  return entry ? entry[1] : key;
}

/** Canonical key for grouping (Gemstones + Gemstone → "Gemstone"). Use when building category groups so Gemstone always appears. */
export function getCanonicalCategoryKey(category) {
  const name = getCategoryDisplayName(category);
  if (!name) return (category || '').trim() || 'Other';
  return name;
}

/** Default category artwork when API omits URL or dashboard saved empty string (merged keys must not blank tiles). */
const DEFAULT_BUY_CATEGORY_IMAGE_URLS = {
  'Precious Metal':
    'https://d28izrv1rzt34w.cloudfront.net/website/Category%20folder/Precoius%20meta_%20-%20Category.png?w=400&q=60',
  Gemstone:
    'https://d28izrv1rzt34w.cloudfront.net/website/Category%20folder/Gemstone.png?w=400&q=60',
  'Industrial Mineral':
    'https://d28izrv1rzt34w.cloudfront.net/website/Category%20folder/Industrial%20material%20category.png?w=400&q=60',
  'Critical Mineral':
    'https://d28izrv1rzt34w.cloudfront.net/website/Category%20folder/Crtical%20Minerals%20-%20category.png?w=400&q=60',
  'Energy Mineral':
    'https://d28izrv1rzt34w.cloudfront.net/website/Category%20folder/Energy%20Mineral.png?w=400&q=60',
};

/** CDN object key must match S3 filename exactly (sheet uses double space before "sub"). Wrong path → 403. */
const DEFAULT_CRITICAL_LITHIUM_TILE =
  'https://d28izrv1rzt34w.cloudfront.net/website/Subcategory%20folder/Critical%20mineral/Lithium%20%20sub%20category.png?w=400&q=60';

/** Fallback when API omits a Critical Mineral sub row (must match Category display Image sheet). */
const DEFAULT_CRITICAL_SUBCATEGORY_URLS = {
  Lithium: DEFAULT_CRITICAL_LITHIUM_TILE,
  Copper:
    'https://d28izrv1rzt34w.cloudfront.net/website/Subcategory%20folder/Critical%20mineral/Copper%20-%20sub%20category.png?w=400&q=60',
};

/** Previous app defaults used wrong filenames (403). Replace only exact legacy URLs. */
const LEGACY_CRITICAL_SUB_IMAGE_FIXES = {
  'https://d28izrv1rzt34w.cloudfront.net/website/Subcategory%20folder/Critical%20mineral/Lithium%20sub%20category.png?w=400&q=60':
    DEFAULT_CRITICAL_SUBCATEGORY_URLS.Lithium,
  'https://d28izrv1rzt34w.cloudfront.net/website/Subcategory%20folder/Critical%20mineral/Copper-%20sub%20category.png?w=400&q=60':
    DEFAULT_CRITICAL_SUBCATEGORY_URLS.Copper,
};

function nonEmptyUrl(val) {
  if (val == null) return '';
  const s = String(val).trim();
  return s !== '' ? s : '';
}

function rawUrl(val) {
  if (val == null) return '';
  return String(val);
}

function normalizeUrlForLooseMatch(url) {
  const raw = nonEmptyUrl(url);
  if (!raw) return '';
  // Normalize for safe comparisons:
  // - strip query/hash
  // - lowercase
  // - treat '+' as space
  // - collapse whitespace
  const base = raw.split('#')[0].split('?')[0];
  const decoded = (() => {
    try {
      return decodeURIComponent(base.replace(/\+/g, '%20'));
    } catch {
      return base;
    }
  })();
  return decoded.toLowerCase().replace(/\s+/g, ' ').trim();
}

function stripCloudfrontUnsupportedParams(url) {
  // Requirement: do NOT rewrite master-sheet CloudFront URLs.
  return rawUrl(url);
}

function isBarePlaceholder(uri) {
  if (!uri || typeof uri !== 'string') return true;
  const u = uri.trim().toLowerCase();
  return u.includes('unsplash.com') || u.includes('placeholder');
}

function appendContentVersion(url, contentVersion) {
  // Requirement: do NOT append cache-busters or rewrite URLs.
  return rawUrl(url);
}

/** Width of one tile in a 2-column category grid (matches Sell/Buy horizontal padding 12 + gap 10). */
export function getCategoryGridTileWidth(contentWidth) {
  const w = Number(contentWidth);
  if (!Number.isFinite(w) || w <= 0) return 160;
  const pad = 12;
  const gap = 10;
  return (w - pad * 2 - gap) / 2;
}

/** Buy home category strip: image URL from buyContent.buyCategoryImages by canonical label (Precious Metal, Gemstone, …). */
export function getBuyCategoryTileImageUrl(buyContent, canonicalCategory) {
  const canon = String(canonicalCategory || '').trim();
  if (!canon) return '';
  const map = buyContent?.buyCategoryImages;
  let url = '';
  if (map && typeof map === 'object') {
    url = rawUrl(map[canon]);
    if (!url) url = rawUrl(map[getCategoryDisplayName(canon)]);
    if (!url) {
      const hit = Object.keys(map).find((k) => k.toLowerCase() === canon.toLowerCase());
      if (hit) url = rawUrl(map[hit]);
    }
  }
  if (!url || isBarePlaceholder(url)) {
    const display = getCategoryDisplayName(canon);
    url =
      rawUrl(DEFAULT_BUY_CATEGORY_IMAGE_URLS[display]) ||
      rawUrl(DEFAULT_BUY_CATEGORY_IMAGE_URLS[canon]) ||
      '';
    if (!url) {
      const altKey = Object.keys(DEFAULT_BUY_CATEGORY_IMAGE_URLS).find(
        (k) => k.toLowerCase() === canon.toLowerCase(),
      );
      if (altKey) url = rawUrl(DEFAULT_BUY_CATEGORY_IMAGE_URLS[altKey]);
    }
  }
  if ((!url || isBarePlaceholder(url)) && getCanonicalCategoryKey(canon) === 'Critical Mineral') {
    const subMap = buyContent?.buySubCategoryImages?.['Critical Mineral'];
    let lith = rawUrl(subMap?.Lithium);
    url = lith || DEFAULT_CRITICAL_LITHIUM_TILE;
  }
  url = url && !isBarePlaceholder(url) ? url : '';
  return appendContentVersion(url, buyContent?.contentVersion);
}

/**
 * Buy home sub-category tile: URL from buyContent.buySubCategoryImages[canonical][subLabel].
 * When subCategory is General, sectionTitle is the label (e.g. Gold).
 */
export function getBuySubCategoryTileImageUrl(buyContent, canonicalCategory, sectionTitle, subCategory) {
  const mapRoot = buyContent?.buySubCategoryImages;
  const canonKey = getCanonicalCategoryKey(canonicalCategory || '') || canonicalCategory;
  const labelRaw = subCategory === 'General' ? sectionTitle : subCategory;
  const lab = String(labelRaw || '').trim();
  if (!lab) return '';

  const repairCriticalUrl = (url) => url;

  const fallbackCritical = () => {
    if (canonKey !== 'Critical Mineral') return '';
    const hit =
      DEFAULT_CRITICAL_SUBCATEGORY_URLS[lab] ||
      Object.entries(DEFAULT_CRITICAL_SUBCATEGORY_URLS).find(([k]) => k.toLowerCase() === lab.toLowerCase())?.[1];
    return nonEmptyUrl(hit);
  };

  if (!mapRoot || typeof mapRoot !== 'object') return fallbackCritical();
  let group = mapRoot[canonKey];
  if (!group || typeof group !== 'object') {
    const entry = Object.entries(mapRoot).find(([k]) => String(k).toLowerCase() === String(canonKey || '').toLowerCase());
    group = entry?.[1];
  }
  if (!group || typeof group !== 'object') return fallbackCritical();
  const exactRaw = rawUrl(group[lab]);
  const exact = repairCriticalUrl(exactRaw);
  if (exact) return appendContentVersion(exact, buyContent?.contentVersion);
  const fuzzyKey = Object.keys(group).find((k) => k.toLowerCase() === lab.toLowerCase());
  const fuzzyRaw = fuzzyKey ? rawUrl(group[fuzzyKey]) : '';
  const fuzzy = repairCriticalUrl(fuzzyRaw);
  if (fuzzy) return appendContentVersion(fuzzy, buyContent?.contentVersion);
  return appendContentVersion(fallbackCritical(), buyContent?.contentVersion);
}

/**
 * Section header image for Buy/Sell: when category/section is Gold, use image of mineral "Gold Bullion Bars";
 * Platinum -> "platinum bar"; Silver -> "silver bar". Searches in list then optionally in allMinerals.
 * @param {string} sectionTitle - e.g. "Gold", "Platinum", "Silver"
 * @param {string} category - raw category from API
 * @param {Array} list - minerals in this section
 * @param {Array} [allMinerals] - all minerals (for Buy screen when section list might not contain the bar)
 * @returns {string|null} image URL or null
 */
export function getSectionHeaderImageForCategory(sectionTitle, category, list, allMinerals = []) {
  const title = (sectionTitle || '').toLowerCase();
  const cat = (category || '').toLowerCase();
  const searchIn = Array.isArray(list) && list.length ? list : [];
  const fallback = Array.isArray(allMinerals) ? allMinerals : [];
  const toSearch = [...searchIn];
  fallback.forEach((m) => { if (m && !toSearch.find((x) => x?.id === m?.id || x?._id === m?._id)) toSearch.push(m); });
  const byName = (name) => (m) => (m?.name && String(m.name).toLowerCase().includes(name));
  if (title.includes('gold') || cat.includes('gold')) {
    const m = toSearch.find(byName('gold bullion bars'));
    if (m && (m.image || m.imageUrl)) return m.image || m.imageUrl;
  }
  if (title.includes('platinum') || cat.includes('platinum')) {
    const m = toSearch.find(byName('platinum bar'));
    if (m && (m.image || m.imageUrl)) return m.image || m.imageUrl;
  }
  if (title.includes('silver') || cat.includes('silver')) {
    const m = toSearch.find(byName('silver bar'));
    if (m && (m.image || m.imageUrl)) return m.image || m.imageUrl;
  }
  return null;
}

/** Returns category names in display order (same as dashboard Buy Management). */
export function sortMineralCategories(categoryNames) {
  const arr = Array.isArray(categoryNames) ? [...categoryNames] : [];
  const ordered = [];
  const seen = new Set();
  MINERAL_CATEGORY_ORDER_VARIANTS.forEach((variants) => {
    const found = arr.find((c) => variants.some((v) => v.toLowerCase() === (c || '').toLowerCase()) && !seen.has(c));
    if (found) { ordered.push(found); seen.add(found); }
  });
  MINERAL_CATEGORY_ORDER.forEach((fixed) => {
    const actual = arr.find((c) => (c || '').toLowerCase() === fixed.toLowerCase() && !seen.has(c));
    if (actual) { ordered.push(actual); seen.add(actual); }
  });
  arr.forEach((c) => { if (c != null && c !== '' && !seen.has(c)) ordered.push(c); });
  return ordered;
}

export async function getMineralById(id) {
  const res = await fetch(`${getApiBase()}/api/minerals/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error('Mineral not found');
  return res.json();
}

/** Create mineral (auth). Payload: { name, category?, imageUrl?, priceDisplay?, description?, origin?, purity?, unit?, ... } */
export async function createMineral(payload) {
  const res = await fetchWithAuth('/api/minerals', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to create mineral');
  return data;
}

/** Update mineral (auth). Payload: same fields as create, all optional. */
export async function updateMineral(id, payload) {
  const res = await fetchWithAuth(`/api/minerals/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),

  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to update mineral');
  return data;
}

// —— Content (banners, videos – dashboard-driven; public GET)
const _bannerCache = new Map();
const _bannerInflight = new Map();
const BANNER_CACHE_TTL_MS = 60 * 1000;
const BANNER_DISK_STALE_MS = 24 * 60 * 60 * 1000; // 24h
const BANNER_DISK_KEY_PREFIX = '@mineral_bridge_banners_';
const BANNER_VERSION_KEY = '@mineral_bridge_banner_version';
const _bannerStorageKeys = new Set();

function getBannerCacheKey(targetPage) {
  const key = targetPage ? String(targetPage) : '__all__';
  return { key, storageKey: `${BANNER_DISK_KEY_PREFIX}${key}` };
}

async function fetchBannersFromNetwork(targetPage, key, storageKey) {
  const qs = targetPage ? `?targetPage=${encodeURIComponent(targetPage)}` : '';
  const res = await fetch(`${getApiBase()}/api/content/banners${qs}`);
  if (!res.ok) return [];
  const data = await res.json();
  const out = Array.isArray(data) ? data : [];
  const serverVersion = res.headers?.get?.('x-banner-version');
  if (serverVersion) AsyncStorage.setItem(BANNER_VERSION_KEY, String(serverVersion)).catch(() => {});
  _bannerCache.set(key, { data: out, expiresAt: Date.now() + BANNER_CACHE_TTL_MS });
  _bannerStorageKeys.add(storageKey);
  AsyncStorage.setItem(storageKey, JSON.stringify({ data: out, savedAt: Date.now() })).catch(() => {});
  return out;
}
/** GET /api/content/banners – all 9 app banners. Optional: ?targetPage=splash|onboarding|homepage|buy|sell|artisanal */
export async function getBanners(targetPage) {
  const { key, storageKey } = getBannerCacheKey(targetPage);
  const now = Date.now();
  const cached = _bannerCache.get(key);
  if (cached && cached.expiresAt > now) return cached.data;
  if (_bannerInflight.has(key)) return _bannerInflight.get(key);
  const p = (async () => {
    // 1) Fast path: serve previous banners from local disk cache instantly.
    try {
      const raw = await AsyncStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        const localData = Array.isArray(parsed?.data) ? parsed.data : null;
        const savedAt = Number(parsed?.savedAt || 0);
        if (localData && localData.length > 0 && (now - savedAt) < BANNER_DISK_STALE_MS) {
          _bannerCache.set(key, { data: localData, expiresAt: Date.now() + BANNER_CACHE_TTL_MS });
          // Refresh in background so first render is instant but data stays fresh.
          fetchBannersFromNetwork(targetPage, key, storageKey).catch(() => {});
          return localData;
        }
      }
    } catch (_) { /* ignore disk cache errors */ }
    // 2) No valid local cache, go network.
    return fetchBannersFromNetwork(targetPage, key, storageKey);
  })()
    .finally(() => _bannerInflight.delete(key));
  _bannerInflight.set(key, p);
  return p;
}

/** Prefetch remote image URLs into native image cache. */
export async function prefetchImageUrls(urls = []) {
  const list = Array.from(new Set(
    (Array.isArray(urls) ? urls : [])
      .map((u) => (typeof u === 'string' ? u.trim() : ''))
      .filter(Boolean)
  ));
  if (list.length === 0) return [];
  return Promise.all(
    list.map((url) => Image.prefetch(url).catch(() => false))
  );
}

/** Warm banner JSON + banner images for the provided pages. */
export async function prefetchBannersForTargets(targetPages = []) {
  const pages = Array.from(new Set(
    (Array.isArray(targetPages) ? targetPages : [])
      .map((p) => (typeof p === 'string' ? p.trim() : ''))
      .filter(Boolean)
  ));
  if (pages.length === 0) return;
  const all = await Promise.all(pages.map((p) => getBanners(p).catch(() => [])));
  const urls = all.flatMap((banners) =>
    (Array.isArray(banners) ? banners : [])
      .map((b) => (b?.imageUrl ? String(b.imageUrl).trim() : ''))
      .filter(Boolean)
  );
  await prefetchImageUrls(urls);
}

export async function syncBannerCacheVersion() {
  const res = await fetch(`${getApiBase()}/api/content/banners/version`);
  if (!res.ok) return false;
  const data = await res.json().catch(() => ({}));
  const serverVersion = data?.version ? String(data.version) : '';
  if (!serverVersion) return false;
  const localVersion = await AsyncStorage.getItem(BANNER_VERSION_KEY);
  if (localVersion && localVersion === serverVersion) return false;
  _bannerCache.clear();
  const knownStorageKeys = ['__all__', 'splash', 'onboarding', 'home', 'homepage', 'buy', 'sell', 'artisanal', 'onboarding_1', 'onboarding_2', 'onboarding_3']
    .map((k) => `${BANNER_DISK_KEY_PREFIX}${k}`);
  const storageKeys = Array.from(new Set([...knownStorageKeys, ...Array.from(_bannerStorageKeys)]));
  if (storageKeys.length) {
    await AsyncStorage.multiRemove(storageKeys).catch(() => {});
  }
  await AsyncStorage.setItem(BANNER_VERSION_KEY, serverVersion).catch(() => {});
  return true;
}

/**
 * Convert dashboard banner image controls into ExpoImage props.
 * Defaults keep legacy banner behavior unchanged.
 */
export function getBannerImageLayout(banner) {
  const fitMode = banner?.fitMode === 'contain' ? 'contain' : 'cover';
  const toNum = (v, fallback) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };
  const offsetX = Math.max(-100, Math.min(100, toNum(banner?.offsetX, 0)));
  const offsetY = Math.max(-100, Math.min(100, toNum(banner?.offsetY, 0)));
  const zoom = Math.max(0.5, Math.min(3, toNum(banner?.zoom, 1)));
  return {
    contentFit: fitMode,
    contentPosition: {
      left: `${50 + offsetX / 2}%`,
      top: `${50 + offsetY / 2}%`,
    },
    transform: [{ scale: zoom }],
  };
}

/** GET /api/content/videos – training videos (e.g. Artisanal page). */
export async function getVideos() {
  const res = await fetch(`${getApiBase()}/api/content/videos`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

// —— Content (Buy module: copy, images, options – dashboard-driven; public GET)
/** GET /api/content/buy – text, image URLs, quantity/delivery options. Use for Buy screens when wired to dashboard. */
export async function getBuyContent() {
  const res = await fetch(`${getApiBase()}/api/content/buy`);
  if (!res.ok) throw new Error('Failed to load buy content');
  return res.json();
}

/** POST /api/content/buy/buyer-categories – add a new institutional buyer category (e.g. when user selects "Others"). Returns updated buy content. */
export async function addBuyerCategory(buyerCategory) {
  const res = await fetch(`${getApiBase()}/api/content/buy/buyer-categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ buyerCategory: String(buyerCategory).trim() }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to add buyer category');
  return data;
}

/** PATCH /api/content/buy (auth). Dashboard: update buy module content. */
export async function updateBuyContent(payload) {
  const res = await fetchWithAuth('/api/content/buy', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to update buy content');
  return data;
}

/** GET /api/content/sell – Sell module copy/options. Dashboard-driven; app uses for step labels, accept formats, compliance. */
export async function getSellContent() {
  const res = await fetch(`${getApiBase()}/api/content/sell`);
  if (!res.ok) throw new Error('Failed to load sell content');
  return res.json();
}

// —— Orders (auth)
export async function getOrders(query = {}) {
  const q = new URLSearchParams(query).toString();
  const path = q ? `/api/orders?${q}` : '/api/orders';
  const res = await fetchWithAuth(path);
  if (!res.ok) throw new Error('Failed to load orders');
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function getOrderById(id) {
  const res = await fetchWithAuth(`/api/orders/${id}`);
  if (!res.ok) throw new Error('Order not found');
  return res.json();
}

export async function createOrder(payload) {
  const res = await fetchWithAuth('/api/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to place order');
  return data;
}

// —— Addresses (auth)
export async function getAddresses() {
  const res = await fetchWithAuth('/api/addresses');
  if (!res.ok) throw new Error('Failed to load addresses');
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function createAddress(payload) {
  const res = await fetchWithAuth('/api/addresses', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to add address');
  return data;
}

export async function updateAddress(id, payload) {
  const res = await fetchWithAuth(`/api/addresses/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to update address');
  return res.json();
}

export async function deleteAddress(id) {
  const res = await fetchWithAuth(`/api/addresses/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete address');
}

// —— KYC (auth)
export async function getKycStatus() {
  const res = await fetchWithAuth('/api/kyc/status');
  if (!res.ok) throw new Error('Failed to load KYC status');
  return res.json();
}

export async function submitKyc(payload) {
  const res = await fetchWithAuth('/api/kyc/submit', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'KYC submit failed');
  return data;
}

// —— Listings (auth)
export async function getListings(query = {}) {
  const q = new URLSearchParams(query).toString();
  const path = q ? `/api/listings?${q}` : '/api/listings';
  const res = await fetchWithAuth(path);
  if (!res.ok) throw new Error('Failed to load listings');
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function createListing(payload) {
  const res = await fetchWithAuth('/api/listings', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to create listing');
  return data;
}

// —— Push token (register for real-time notifications from dashboard)
export async function registerPushToken(expoPushToken) {
  const res = await fetchWithAuth('/api/push-token', {
    method: 'POST',
    body: JSON.stringify({ expoPushToken }),
  });
  if (!res.ok) throw new Error('Failed to register push token');
  return res.json();
}

// —— Notifications (auth)
export async function getNotifications(unreadOnly = false) {
  const path = unreadOnly ? '/api/notifications?unreadOnly=1' : '/api/notifications';
  const res = await fetchWithAuth(path);
  if (!res.ok) throw new Error('Failed to load notifications');
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function getUnreadNotificationCount() {
  const res = await fetchWithAuth('/api/notifications/unread-count');
  if (!res.ok) return 0;
  const data = await res.json().catch(() => ({}));
  return typeof data.unreadCount === 'number' ? data.unreadCount : 0;
}

export async function markNotificationRead(id) {
  const res = await fetchWithAuth(`/api/notifications/${id}/read`, {
    method: 'PATCH',
    body: JSON.stringify({}),
  });
  return res.ok;
}

export async function markAllNotificationsRead() {
  const res = await fetchWithAuth('/api/notifications/read-all', {
    method: 'PATCH',
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error('Failed to mark all read');
  return res.json();
}

export async function deleteNotification(id) {
  const res = await fetchWithAuth(`/api/notifications/${id}`, { method: 'DELETE' });
  return res.ok;
}

// —— Market insights (public for dashboard)
export async function getMarketInsights() {
  const res = await fetch(`${getApiBase()}/api/market-insights`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

// —— Activity feed (auth) – user's own activity
export async function getActivity() {
  const res = await fetchWithAuth('/api/activity');
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

// —— Recent activity (dashboard-managed; shown on Home). Public.
export async function getRecentActivity() {
  const res = await fetch(`${getApiBase()}/api/content/recent-activity`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

// —— Artisanal (auth)
/** Check if logged-in user can access artisanal screens (African country verified from phone at login). */
export async function getArtisanalCanAccess() {
  const res = await fetchWithAuth('/api/artisanal/can-access');
  if (!res.ok) return { canAccess: false, country: null };
  return res.json();
}

export async function getArtisanalProfile() {
  const res = await fetchWithAuth('/api/artisanal/profile');
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to load artisanal profile');
  return res.json();
}

export async function saveArtisanalProfile(payload) {
  const res = await fetchWithAuth('/api/artisanal/profile', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to save profile');
  return data;
}

// —— Payment methods (auth)
export async function getPaymentMethods() {
  const res = await fetchWithAuth('/api/payment-methods');
  if (!res.ok) throw new Error('Failed to load payment methods');
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

// —— Transactions (auth)
export async function getTransactions() {
  const res = await fetchWithAuth('/api/transactions');
  if (!res.ok) throw new Error('Failed to load transactions');
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

// —— App settings (auth)
export async function getAppSettings() {
  const res = await fetchWithAuth('/api/app-settings');
  if (!res.ok) throw new Error('Failed to load settings');
  return res.json();
}

export async function updateAppSettings(payload) {
  const res = await fetchWithAuth('/api/app-settings', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to update settings');
  return res.json();
}

// —— Help (auth optional)
export async function getFaqs() {
  const res = await fetch(`${getApiBase()}/api/help/faqs`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function submitSupportRequest(payload) {
  const res = await fetchWithAuth('/api/help/contact', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to submit');
  return data;
}
