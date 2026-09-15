import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  color?: 'primary' | 'danger';
}

export default function PrimaryButton({
  title,
  onPress,
  disabled,
  loading,
  color = 'primary',
}: PrimaryButtonProps) {
  const { colors } = useTheme();
  const backgroundColor =
    disabled || loading
      ? colors.surfaceAlt
      : color === 'danger'
        ? colors.danger
        : colors.primary;
  const labelColor = disabled || loading ? colors.textMuted : colors.onPrimary;
  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor }]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={labelColor} />
      ) : (
        <Text style={[styles.label, { color: labelColor }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: 10,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
});
