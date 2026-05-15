import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Icon } from '../../../lib/icons';
import { authStyles } from '../authStyles';

const styles = authStyles;

export default function KYCDocumentTypeStep({
  onSelectDocType,
  onBack,
}) {
  return (
    <View style={styles.kycDocContainer}>
      <View style={styles.identityHeader}>
        <View style={styles.identityHeaderContent}>
          <View style={styles.identityHeaderInner}>
            <TouchableOpacity style={styles.identityBackBtn} onPress={onBack} activeOpacity={0.8}>
              <Icon name="chevronLeft" size={14} color="#51A2FF" />
            </TouchableOpacity>
            <View style={styles.identityHeaderRow}>
              <View style={styles.identityLogoBox}>
                <Icon name="person" size={21} color="#1F2A44" />
              </View>
              <View style={styles.identityHeaderTextWrap}>
                <Text style={styles.identityTitle}>Identity Profile</Text>
                <Text style={styles.kycDocHeaderSubtitle}>STEP 2 OF 3 - KYC VERIFICATION</Text>
              </View>
            </View>
            <View style={styles.identityHeaderRight} />
          </View>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.kycDocScroll} style={styles.kycDocScrollView}>
        <View style={styles.kycDocMain}>
          <View style={styles.kycDocHeadingBlock}>
            <Text style={styles.kycDocHeading}>Choose Verification Document</Text>
            <Text style={styles.kycDocSubtitle}>Select the ID type you want us to verify for secure trading access.</Text>
          </View>
          <View style={styles.kycDocCards}>
            <TouchableOpacity style={styles.kycDocCard} onPress={() => onSelectDocType('national-id')} activeOpacity={0.8}>
              <View style={styles.kycDocCardLeft}>
                <View style={styles.kycDocCardIconWrap}>
                  <Icon name="idCard" size={21} color="#155DFC" />
                </View>
                <View style={styles.kycDocCardTextWrap}>
                  <Text style={styles.kycDocCardTitle}>National Identity Card</Text>
                  <Text style={styles.kycDocCardSubtitle}>GOVERNMENT ISSUED</Text>
                </View>
              </View>
              <Icon name="chevronRight" size={20} color="#D1D5DC" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.kycDocCard} onPress={() => onSelectDocType('passport')} activeOpacity={0.8}>
              <View style={styles.kycDocCardLeft}>
                <View style={styles.kycDocCardIconWrap}>
                  <Icon name="airplane" size={21} color="#155DFC" />
                </View>
                <View style={styles.kycDocCardTextWrap}>
                  <Text style={styles.kycDocCardTitle}>Global Passport</Text>
                  <Text style={styles.kycDocCardSubtitle}>PREFERRED FOR EXPORT</Text>
                </View>
              </View>
              <Icon name="chevronRight" size={20} color="#D1D5DC" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.kycDocCard} onPress={() => onSelectDocType('corporate')} activeOpacity={0.8}>
              <View style={styles.kycDocCardLeft}>
                <View style={styles.kycDocCardIconWrap}>
                  <Icon name="briefcase" size={21} color="#155DFC" />
                </View>
                <View style={styles.kycDocCardTextWrap}>
                  <Text style={styles.kycDocCardTitle}>Corporate ID / License</Text>
                  <Text style={styles.kycDocCardSubtitle}>MINING TRADE LICENSE</Text>
                </View>
              </View>
              <Icon name="chevronRight" size={20} color="#D1D5DC" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
