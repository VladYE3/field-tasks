import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useTaskStore } from '../store/useTaskStore';
import type { HistoryActionType, HistoryEntry } from '../types';
import { formatDateTime } from '../utils/date';
import Screen from '../components/Screen';
import EmptyState from '../components/EmptyState';
import { useTheme } from '../theme';

const ACTION_LABELS: Record<HistoryActionType, string> = {
  created: 'Created',
  updated: 'Updated',
  status_changed: 'Status changed',
  attachment_added: 'Attachment added',
  attachment_removed: 'Attachment removed',
  deleted: 'Deleted',
  synced: 'Synced',
  sync_failed: 'Sync failed',
};

function HistoryRow({ entry }: { entry: HistoryEntry }) {
  const { colors } = useTheme();
  const isSyncEvent = entry.action === 'synced' || entry.action === 'sync_failed';
  return (
    <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.rowHeader}>
        <Text style={[styles.action, { color: isSyncEvent ? colors.info : colors.primary }]}>
          {ACTION_LABELS[entry.action]}
        </Text>
        <Text style={[styles.timestamp, { color: colors.textMuted }]}>
          {formatDateTime(entry.timestamp)}
        </Text>
      </View>
      <Text style={[styles.description, { color: colors.text }]}>{entry.description}</Text>
      {entry.taskTitle ? (
        <Text style={[styles.taskTitle, { color: colors.textMuted }]} numberOfLines={1}>
          Task: {entry.taskTitle}
        </Text>
      ) : null}
    </View>
  );
}

export default function HistoryScreen() {
  const history = useTaskStore((state) => state.history);
  const sorted = React.useMemo(() => [...history].sort((a, b) => b.timestamp.localeCompare(a.timestamp)), [history]);

  return (
    <Screen>
      <FlatList
        data={sorted}
        keyExtractor={(entry) => entry.id}
        renderItem={({ item }) => <HistoryRow entry={item} />}
        contentContainerStyle={sorted.length === 0 ? styles.flex : styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon="time-outline"
            title="No activity yet"
            subtitle="Task creation, edits, status changes, attachments, deletions and sync events will appear here. The log is stored locally and survives app restarts."
          />
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  listContent: { padding: 16, gap: 10 },
  row: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  action: {
    fontSize: 13,
    fontWeight: '700',
  },
  timestamp: {
    fontSize: 12,
  },
  description: {
    fontSize: 14,
  },
  taskTitle: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
});
