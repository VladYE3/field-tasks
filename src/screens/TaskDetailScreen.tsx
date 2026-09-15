import React from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { RootStackParamList } from '../navigation/types';
import type { TaskStatus } from '../types';
import { syncStatusLabel, useTaskStore } from '../store/useTaskStore';
import { attachmentExists } from '../services/attachmentService';
import { formatDateTime, isOverdue } from '../utils/date';
import Screen from '../components/Screen';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import PrimaryButton from '../components/PrimaryButton';
import { useTheme } from '../theme';

type DetailRouteProp = RouteProp<RootStackParamList, 'TaskDetail'>;
type DetailNavigationProp = NativeStackNavigationProp<RootStackParamList, 'TaskDetail'>;

const TILE = 96;

interface ActionSpec {
  label: string;
  status: TaskStatus;
  tone: 'primary' | 'danger';
}

function actionsForStatus(status: TaskStatus): ActionSpec[] {
  switch (status) {
    case 'new':
      return [{ label: 'Start', status: 'in_progress', tone: 'primary' }];
    case 'in_progress':
      return [
        { label: 'Complete', status: 'completed', tone: 'primary' },
        { label: 'Cancel', status: 'cancelled', tone: 'danger' },
      ];
    case 'completed':
    case 'cancelled':
      return [{ label: 'Reopen', status: 'new', tone: 'primary' }];
  }
}

export default function TaskDetailScreen({ route, navigation }: { route: DetailRouteProp; navigation: DetailNavigationProp }) {
  const { colors } = useTheme();
  const taskId = route.params.taskId;
  const task = useTaskStore((state) => state.tasks.find((t) => t.id === taskId));
  const history = useTaskStore((state) => state.history);
  const setTaskStatus = useTaskStore((state) => state.setTaskStatus);
  const deleteTask = useTaskStore((state) => state.deleteTask);
  const scheduleDemoReminder = useTaskStore((state) => state.scheduleDemoReminder);

  if (!task || task.deleted) {
    return (
      <Screen>
        <EmptyState icon="alert-circle-outline" title="Task not found" subtitle="It may have been deleted on another device." />
      </Screen>
    );
  }

  const overdue = isOverdue(task.dueDate, task.status);
  const taskHistory = history
    .filter((entry) => entry.taskId === task.id)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const confirmDelete = (): void => {
    Alert.alert('Delete task', `Delete “${task.title}”? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void deleteTask(task.id);
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text }]}>{task.title}</Text>
          <StatusBadge status={task.status} />
        </View>

        <Text style={[styles.meta, overdue ? { color: colors.danger } : { color: colors.textMuted }]}>
          {overdue ? 'Overdue — ' : ''}
          Due {formatDateTime(task.dueDate)}
        </Text>
        <Text style={[styles.meta, { color: colors.textMuted }]}>Created {formatDateTime(task.createdAt)}</Text>
        <Text style={[styles.meta, { color: colors.textMuted }]}>{task.location.address}</Text>
        <Text style={[styles.sync, { color: task.syncStatus === 'failed' ? colors.danger : colors.textMuted }]}>
          {syncStatusLabel(task)}
          {task.lastSyncedAt ? ` · ${formatDateTime(task.lastSyncedAt)}` : ''}
        </Text>

        {task.description ? (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Description</Text>
            <Text style={[styles.body, { color: colors.textMuted }]}>{task.description}</Text>
          </View>
        ) : null}

        {task.attachments.length > 0 ? (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Attachments ({task.attachments.length})</Text>
            <View style={styles.grid}>
              {task.attachments.map((attachment) =>
                attachmentExists(attachment.uri) ? (
                  <Image
                    key={attachment.id}
                    source={{ uri: attachment.uri }}
                    style={[styles.tile, { borderColor: colors.border }]}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    key={attachment.id}
                    style={[styles.tile, styles.missingTile, { borderColor: colors.border }]}
                  >
                    <Ionicons name="image-outline" size={22} color={colors.textMuted} />
                    <Text style={[styles.missingLabel, { color: colors.textMuted }]}>File unavailable</Text>
                  </View>
                ),
              )}
            </View>
          </View>
        ) : null}

        <View style={styles.actionsRow}>
          {actionsForStatus(task.status).map((action) => (
            <View key={action.label} style={styles.actionButton}>
              <PrimaryButton
                title={action.label}
                color={action.tone}
                onPress={() => void setTaskStatus(task.id, action.status)}
              />
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.secondaryButton, { borderColor: colors.primary }]}
          onPress={() => navigation.navigate('TaskForm', { taskId: task.id })}
        >
          <Ionicons name="pencil-outline" size={16} color={colors.primary} />
          <Text style={[styles.secondaryButtonLabel, { color: colors.primary }]}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.secondaryButton, { borderColor: colors.danger }]} onPress={confirmDelete}>
          <Ionicons name="trash-outline" size={16} color={colors.danger} />
          <Text style={[styles.secondaryButtonLabel, { color: colors.danger }]}>Delete</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, { borderColor: colors.border }]}
          onPress={() => {
            void scheduleDemoReminder(task.id).then((result) => {
              if (!result) return;
              Alert.alert(
                result.scheduled ? 'Notification scheduled' : 'Notifications are disabled',
                result.scheduled
                  ? 'The demo notification will arrive in about 30 seconds.'
                  : (result.reason ?? 'The notification could not be scheduled.'),
              );
            });
          }}
        >
          <Ionicons name="notifications-outline" size={16} color={colors.text} />
          <Text style={[styles.secondaryButtonLabel, { color: colors.text }]}>Send test notification (demo)</Text>
        </TouchableOpacity>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>History</Text>
          {taskHistory.length === 0 ? (
            <Text style={[styles.body, { color: colors.textMuted }]}>No activity recorded yet.</Text>
          ) : (
            taskHistory.map((entry) => (
              <View key={entry.id} style={styles.historyRow}>
                <Text style={[styles.body, styles.historyText, { color: colors.text }]}>{entry.description}</Text>
                <Text style={[styles.historyTime, { color: colors.textMuted }]}>
                  {formatDateTime(entry.timestamp)}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
    padding: 16,
    paddingBottom: 40,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
  },
  meta: {
    fontSize: 14,
  },
  sync: {
    fontSize: 13,
    fontWeight: '500',
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    padding: 14,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tile: {
    borderRadius: 10,
    borderWidth: 1,
    height: TILE,
    width: TILE,
  },
  missingTile: {
    alignItems: 'center',
    gap: 4,
    justifyContent: 'center',
    padding: 6,
  },
  missingLabel: {
    fontSize: 10,
    textAlign: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
  },
  secondaryButton: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 44,
  },
  secondaryButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  historyRow: {
    gap: 2,
  },
  historyText: {
    fontSize: 13,
  },
  historyTime: {
    fontSize: 11,
  },
});
