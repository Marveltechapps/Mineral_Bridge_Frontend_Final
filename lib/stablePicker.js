/**
 * Stable image and document pickers that prevent app refresh/exit during upload flow.
 * - Uses InteractionManager to defer work until after native picker closes.
 * - Copies files to cache for stable URIs (avoids invalid URIs when app returns from background).
 * - Defers callbacks until app is active + short delay (fixes reload on production/Play Store when
 *   returning from camera/gallery).
 * - bumpPickerFocusGrace / shouldSkipFocusRefetchForMediaPicker: returning from camera/gallery/docs
 *   re-triggers useFocusEffect on other screens; screens skip refetch while grace is active.
 * - Export checkPendingImageResult() for Android: call on mount in picker screens to recover
 *   result if the activity was recreated (e.g. after opening camera/gallery).
 * - Custom native pickers: call bumpPickerFocusGrace() before/after opening them.
 */
import { InteractionManager, AppState } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

/**
 * After camera / gallery / document picker, React Navigation often fires useFocusEffect again when
 * the app resumes. That refetch sets loading states and feels like a full "reload". Extend this
 * window whenever a native picker opens or returns so screens can skip focus refetches.
 */
const PICKER_FOCUS_GRACE_MS = 5000;
let pickerFocusGraceUntil = 0;

/** Extend the no-refetch window (call when opening or closing pickers, and when app becomes active). */
export function bumpPickerFocusGrace() {
  pickerFocusGraceUntil = Date.now() + PICKER_FOCUS_GRACE_MS;
}

/**
 * Use inside useFocusEffect before calling load()/refetch. Returns true right after media/document pick.
 * Pull-to-refresh still works (user gesture), only auto focus refetch is skipped.
 */
export function shouldSkipFocusRefetchForMediaPicker() {
  return Date.now() < pickerFocusGraceUntil;
}

/** Delay (ms) after app is active before running pick callback. Reduces reload on production devices. */
const RESUME_DELAY_MS = 800;

/**
 * Copy a file URI to a stable cache path. Ensures the URI remains valid after
 * the app returns from the native picker (which can cause temp URIs to be invalidated).
 */
async function copyToStableCache(uri, extension = 'jpg') {
  const safeExt = extension.replace(/[^a-z0-9]/gi, '') || 'jpg';
  const filename = `pick_${Date.now()}_${Math.random().toString(36).slice(2)}.${safeExt}`;
  const dest = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.copyAsync({ from: uri, to: dest });
  return dest;
}

/**
 * Run a callback only after the app is in foreground and a short delay.
 * Prevents state updates during resume transition (stops "reload" on production builds).
 * Uses requestAnimationFrame before setTimeout to avoid setState in the same tick as resume.
 */
function runWhenAppActive(callback) {
  const run = () => {
    bumpPickerFocusGrace();
    requestAnimationFrame(() => {
      setTimeout(callback, RESUME_DELAY_MS);
    });
  };
  if (AppState.currentState === 'active') {
    run();
  } else {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        sub.remove();
        run();
      }
    });
  }
}

/**
 * Process image pick result: copy to cache and call onPicked/onError.
 * Defers onPicked with InteractionManager so setState runs after interactions (reduces reload on Sell/camera flow).
 */
function processImageResult(asset, onPicked, onError) {
  const uri = asset.uri;
  const ext = uri?.match(/\.(jpe?g|png|webp|heic)$/i)?.[1] || 'jpg';
  const dimensions = (asset.width != null && asset.height != null) ? { width: asset.width, height: asset.height } : undefined;
  copyToStableCache(uri, ext)
    .then((stableUri) => {
      InteractionManager.runAfterInteractions(() => {
        onPicked?.(stableUri, dimensions);
      });
    })
    .catch((err) => { onError?.(err?.message || 'Could not process image'); });
}

/**
 * Pick an image from the library. Copies to stable cache and defers setState
 * via InteractionManager to prevent app refresh when returning from picker.
 * By default returns FULL WIDTH AND HEIGHT (original image); no resize or crop.
 * Pass crop: true (or allowsEditing: true) for optional crop; then aspect is used.
 * For document uploads use { quality: 1 } to preserve full resolution.
 * @param {Object} options - crop / allowsEditing, aspect (only when cropping), quality (1 = full res)
 * @param {function(string, {width?: number, height?: number})} onPicked - Callback with stable URI and optional dimensions
 * @param {function(string)} onError - Callback on error
 * @param {function()} onCancel - Callback when user cancels
 * @returns {Promise<void>}
 */
export async function pickImageStable(options = {}, onPicked, onError, onCancel) {
  bumpPickerFocusGrace();
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      onError?.('Permission needed');
      return;
    }
    const wantsCrop = options.crop === true || options.allowsEditing === true;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: wantsCrop,
      aspect: wantsCrop ? (options.aspect || [4, 3]) : undefined,
      quality: options.quality != null ? options.quality : (wantsCrop ? 0.8 : 1),
    });
    bumpPickerFocusGrace();
    if (result.canceled || !result.assets?.[0]) {
      onCancel?.();
      return;
    }
    const asset = result.assets[0];

    InteractionManager.runAfterInteractions(() => {
      runWhenAppActive(() => {
        processImageResult(asset, onPicked, onError);
      });
    });
  } catch (err) {
    onError?.(err.message || 'Could not open gallery');
  }
}

/**
 * Pick a photo from camera. Copies to stable cache and defers via InteractionManager.
 * Full image by default; set allowsEditing: true / crop: true for optional crop.
 * @param {Object} options - { allowsEditing, crop, aspect, quality }
 * @param {function(string, {width?: number, height?: number})} onPicked - Callback with stable URI and optional dimensions
 * @param {function(string)} onError - Callback on error
 * @param {function()} onCancel - Callback when user cancels
 */
export async function pickCameraStable(options = {}, onPicked, onError, onCancel) {
  bumpPickerFocusGrace();
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      onError?.('Permission needed');
      return;
    }
    const wantsCrop = options.crop === true || options.allowsEditing === true;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images',
      allowsEditing: wantsCrop,
      aspect: wantsCrop ? (options.aspect || [1, 1]) : undefined,
      quality: options.quality ?? 0.8,
      cameraType: options.cameraType ?? ImagePicker.CameraType?.back ?? 'back',
    });
    bumpPickerFocusGrace();
    if (result.canceled || !result.assets?.[0]) {
      onCancel?.();
      return;
    }
    const asset = result.assets[0];

    InteractionManager.runAfterInteractions(() => {
      runWhenAppActive(() => {
        processImageResult(asset, onPicked, onError);
      });
    });
  } catch (err) {
    onError?.(err.message || 'Could not open camera');
  }
}

/**
 * Pick a document. Uses copyToCacheDirectory and InteractionManager.
 * @param {Object} options - DocumentPicker options (type, multiple, maxBytes)
 * @param {function(Object|Object[])} onPicked - Callback with { uri, name, mimeType, size } or array when multiple
 * @param {function(string)} onError - Callback on error
 * @param {function()} onCancel - Callback when user cancels
 */
export async function pickDocumentStable(options = {}, onPicked, onError, onCancel) {
  bumpPickerFocusGrace();
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: options.type || ['image/*', 'application/pdf'],
      copyToCacheDirectory: true,
      multiple: options.multiple ?? false,
    });
    bumpPickerFocusGrace();
    if (result.canceled || !result.assets?.length) {
      onCancel?.();
      return;
    }
    const assets = result.assets;
    for (const file of assets) {
      if (options.maxBytes && file.size != null && file.size > options.maxBytes) {
        onError?.('File too large');
        return;
      }
    }

    InteractionManager.runAfterInteractions(() => {
      runWhenAppActive(() => {
        const files = assets.map((f) => ({ uri: f.uri, name: f.name, mimeType: f.mimeType, size: f.size }));
        InteractionManager.runAfterInteractions(() => {
          onPicked?.(options.multiple ? files : files[0]);
        });
      });
    });
  } catch (err) {
    onError?.(err.message || 'Could not pick document');
  }
}

/**
 * Android: when the activity was recreated after opening camera/gallery, the pick result
 * can be retrieved with getPendingResultAsync. Call this from screens that use the image
 * picker (e.g. in useEffect on mount) to recover the result and update UI.
 * @param {function(string, {width?: number, height?: number})} onPicked - called with (stableUri, dimensions) if a result exists
 * @returns {Promise<boolean>} - true if a pending result was found and handled
 */
export async function checkPendingImageResult(onPicked) {
  if (typeof ImagePicker.getPendingResultAsync !== 'function') return false;
  try {
    const result = await ImagePicker.getPendingResultAsync();
    bumpPickerFocusGrace();
    if (!result || result.canceled || !result.assets?.[0]) return false;
    const asset = result.assets[0];
    runWhenAppActive(() => {
      processImageResult(asset, onPicked, () => {});
    });
    return true;
  } catch {
    return false;
  }
}
