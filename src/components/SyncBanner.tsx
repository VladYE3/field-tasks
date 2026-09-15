import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { selectVisibleTasks, useTaskStore } from '../store/useTaskStore';
import { formatDateTime } from '../utils/date';
import { useTheme } from '../theme';

export default function SyncBanner() {
  const { colors } = useTheme();
  const isOnline = useTaskStore((state) => state.isOnline);
  const syncing = useTaskStore((state) => state.syncing);
  const lastSyncAt = useTaskStore((state) => state.lastSyncAt);
  const lastSyncError = useTaskStore((state) => state.lastSyncError);
  const tasks = useTaskStore((state) => state.tasks);
  const syncNow = useTaskStore((state) => state.syncNow);

  const pendingCount = selectVisibleTasks(tasks).filter(
    (task) => task.syncStatus === 'pending' || task.syncStatus === 'failed',
  ).length;

  let message: string | null = null;
  let icon: keyof typeof Ionicons.glyphMap = 'sync';
  let accent = colors.info;
  if (!isOnline) {
    message = 'Offline — changes saved locally and will sync later';
    icon = 'cloud-offline-outline';
    accent = colors.warning;
  } else if (lastSyncError) {
    message = lastSyncError;
    icon = 'alert-circle-outline';
    accent = colors.danger;
  } else if (pendingCount > 0) {
    message = `${pendingCount} change${pendingCount === 1 ? '' : 's'} waiting to sync`;
    icon = 'cloud-upload-outline';
    accent = colors.warning;
  }

  if (!message) return null;

  return (
    <View
      style={[
        styles.banner,
        { backgroundColor: `${accent}1A`, borderColor: accent },
      ]}
    >
      <Ionicons name={icon} size={16} color={accent} />
      <View style={styles.textBlock}>
        <Text style={[styles.message, { color: colors.text }]}>{message}</Text>
        {lastSyncAt ? (
          <Text style={[styles.timestamp, { color: colors.textMuted }]}>
            Last sync {formatDateTime(lastSyncAt)}
          </Text>
        ) : null}
      </View>
      {isOnline && (
        <TouchableOpacity
          style={[styles.syncButton, { borderColor: accent }]}
          onPress={() => void syncNow()}
          disabled={syncing}
        >
          <Text style={[styles.syncButtonLabel, { color: accent }]}>
            {syncing ? 'Syncing…' : 'Sync now'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  message: {
    fontSize: 13,
    fontWeight: '500',
  },
  timestamp: {
    fontSize: 11,
  },
  syncButton: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  syncButtonLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
});
