import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Task } from '../types';
import { syncStatusLabel } from '../store/useTaskStore';
import { formatDateTime, isOverdue } from '../utils/date';
import StatusBadge from './StatusBadge';
import { useTheme } from '../theme';

interface TaskCardProps {
  task: Task;
  onPress: (task: Task) => void;
}

export default function TaskCard({ task, onPress }: TaskCardProps) {
  const { colors } = useTheme();
  const overdue = isOverdue(task.dueDate, task.status);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: overdue ? colors.danger : colors.border },
      ]}
      onPress={() => onPress(task)}
      activeOpacity={0.7}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {task.title}
        </Text>
        <StatusBadge status={task.status} />
      </View>
      <Text style={[styles.meta, overdue ? { color: colors.danger } : { color: colors.textMuted }]}>
        {overdue ? 'Overdue — ' : ''}
        Due {formatDateTime(task.dueDate)}
      </Text>
      <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={1}>
        {task.location.address}
      </Text>
      {task.syncStatus !== 'synced' && (
        <Text
          style={[
            styles.sync,
            { color: task.syncStatus === 'failed' ? colors.danger : colors.warning },
          ]}
        >
          {syncStatusLabel(task)}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    gap: 4,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  meta: {
    fontSize: 13,
  },
  sync: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
});
