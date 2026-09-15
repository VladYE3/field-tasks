import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { TaskStatus } from '../types';
import { STATUS_LABELS } from '../constants';
import { useTheme, type ThemeColors } from '../theme';

const STATUS_COLORS: Record<TaskStatus, keyof ThemeColors> = {
  new: 'info',
  in_progress: 'warning',
  completed: 'success',
  cancelled: 'textMuted',
};

interface StatusBadgeProps {
  status: TaskStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const { colors } = useTheme();
  const color = colors[STATUS_COLORS[status]];
  return (
    <View style={[styles.badge, { borderColor: color, backgroundColor: `${color}22` }]}>
      <Text style={[styles.label, { color }]}>{STATUS_LABELS[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
