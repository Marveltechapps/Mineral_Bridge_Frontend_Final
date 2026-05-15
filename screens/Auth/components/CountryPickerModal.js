import React from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable, FlatList } from 'react-native';
import { authStyles } from '../authStyles';
import { COUNTRIES } from '../../../lib/countries';

export default function CountryPickerModal({ visible, selected, onSelect, onClose }) {
  const styles = authStyles;
  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.pickerSheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Select country</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={COUNTRIES}
            keyExtractor={(item) => item.code}
            style={{ flex: 1 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.pickerRow, item.dial === selected.dial && styles.pickerRowActive]}
                onPress={() => onSelect(item)}
              >
                <Text style={styles.pickerFlag}>{item.flag}</Text>
                <Text style={styles.pickerName}>{item.name}</Text>
                <Text style={styles.pickerDial}>{item.dial}</Text>
              </TouchableOpacity>
            )}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
