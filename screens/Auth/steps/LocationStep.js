import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { Icon } from '../../../lib/icons';
import { authStyles } from '../authStyles';

const styles = authStyles;

export default function LocationStep({
  loading,
  error,
  onEnableLocation,
  onSkip,
}) {
  return (
    <View style={styles.locationContainer}>
      <ScrollView contentContainerStyle={styles.locationScroll} style={styles.locationScrollView}>
        <View style={styles.signInHeader}>
          <View style={styles.signInHeaderInner}>
            <View style={styles.signInLogoBox}>
              <View style={styles.signInLogoIcon}>
                <Icon name="shieldCheck" size={21} color="#1F2A44" />
              </View>
            </View>
            <Text style={styles.signInBrandText}>Mineral Bridge</Text>
          </View>
        </View>
        <View style={styles.locationMain}>
          <View style={styles.locationIconBlock}>
            <View style={styles.locationIconOuter}>
              <View style={styles.locationIconInner}>
                <Icon name="location" size={56} color="#1F2A44" />
              </View>
            </View>
          </View>
          <View style={styles.locationCopyBlock}>
            <Text style={styles.locationTitle}>Enable Location Access</Text>
            <Text style={styles.locationParagraph}>
              We use your location to ensure regulatory compliance and improve logistics.
            </Text>
          </View>
          <View style={styles.locationButtonsBlock}>
            {error ? <Text style={styles.locationErrorText}>{error}</Text> : null}
            <TouchableOpacity
              style={[styles.locationButtonPrimary, loading && styles.locationButtonDisabled]}
              onPress={onEnableLocation}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.locationButtonPrimaryText}>Enable Location</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.locationButtonSecondary}
              onPress={onSkip}
              disabled={loading}
            >
              <Text style={styles.locationButtonSecondaryText}>Skip for now</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.locationFooter}>
            <Icon name="lock" size={14} color="#99A1AF" />
            <Text style={styles.locationFooterText}>Location data is encrypted and used for compliance only.</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
