import { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { colors } from '../lib/theme';
import { CATEGORY_TILE_IMAGE_ASPECT_RATIO } from '../lib/categoryTileDimensions';
import { normalizeRemoteImageUri } from '../lib/remoteImageUri';

function isPlaceholderImage(uri) {
  if (!uri || typeof uri !== 'string') return true;
  const u = uri.trim().toLowerCase();
  return u.includes('unsplash.com') || u.includes('placeholder');
}

/** Same chrome as imageCard: white fill, hairline border, soft shadow */
const TILE_CARD_SHADOW = {
  backgroundColor: colors.white,
  borderWidth: 1,
  borderColor: colors.border,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.06,
  shadowRadius: 4,
  elevation: 2,
};

/**
 * Sell/Buy category tile: image on top in a white card frame; label below uses the same white card treatment (no mixed glass vs solid).
 * Optional `subtitle` (e.g. availability) for product grids.
 * `skipPlaceholderDetection` — when true, show any non-empty URL (e.g. Sell fallback stock photo).
 */
export function CategoryHeroTile({ width, imageUri, label, onPress, subtitle, skipPlaceholderDetection }) {
  const uri = imageUri != null ? normalizeRemoteImageUri(imageUri) : '';
  const show = uri && (skipPlaceholderDetection ? true : !isPlaceholderImage(uri));
  const sub = subtitle != null && String(subtitle).trim() !== '' ? String(subtitle).trim() : '';

  const [failed, setFailed] = useState(false);

  const resolvedUri = useMemo(() => {
    return uri || '';
  }, [uri]);

  const shouldShow = show && !failed && !!resolvedUri;
  return (
    <TouchableOpacity
      style={[styles.tileRoot, { width }]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={sub ? `${label}. ${sub}` : label}
    >
      <View style={[styles.imageCard, TILE_CARD_SHADOW]}>
        <View style={styles.hero}>
          {shouldShow ? (
            <Image
              source={{ uri: String(resolvedUri) }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
              onLoad={() => console.log('IMG_LOADED', resolvedUri)}
              onError={(e) => {
                console.log('IMG_ERROR', e?.nativeEvent, resolvedUri);
                setFailed(true);
              }}
            />
          ) : (
            <View style={styles.placeholder} />
          )}
        </View>
      </View>
      <View style={[styles.labelBar, TILE_CARD_SHADOW]}>
        <Text style={styles.label} numberOfLines={2}>
          {label}
        </Text>
        {sub ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tileRoot: {
    alignSelf: 'flex-start',
  },
  imageCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  hero: {
    width: '100%',
    aspectRatio: CATEGORY_TILE_IMAGE_ASPECT_RATIO,
    backgroundColor: '#0f172a',
    overflow: 'hidden',
  },
  placeholder: { ...StyleSheet.absoluteFillObject, backgroundColor: '#E5E7EB' },
  labelBar: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
});
