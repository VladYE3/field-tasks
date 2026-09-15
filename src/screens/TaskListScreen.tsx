import React, { useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { SortOption, Task, TaskFilters } from '../types';
import { STATUS_ORDER } from '../constants';
import { selectVisibleTasks, useTaskStore } from '../store/useTaskStore';
import type { RootStackParamList } from '../navigation/types';
import Screen from '../components/Screen';
import FilterBar from '../components/FilterBar';
import SyncBanner from '../components/SyncBanner';
import TaskCard from '../components/TaskCard';
import EmptyState from '../components/EmptyState';
import { useTheme } from '../theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function TaskListScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const tasks = useTaskStore((state) => state.tasks);
  const syncing = useTaskStore((state) => state.syncing);
  const syncNow = useTaskStore((state) => state.syncNow);
  const notificationNotice = useTaskStore((state) => state.notificationNotice);
  const clearNotificationNotice = useTaskStore((state) => state.clearNotificationNotice);

  const [filters, setFilters] = useState<TaskFilters>({ query: '', status: 'all' });
  const [sort, setSort] = useState<SortOption>('createdAt');

  const visibleTasks = useMemo(() => {
    let result = selectVisibleTasks(tasks);
    const query = filters.query.trim().toLowerCase();
    if (query) {
      result = result.filter((task) => task.title.toLowerCase().includes(query));
    }
    if (filters.status !== 'all') {
      result = result.filter((task) => task.status === filters.status);
    }
    return [...result].sort((a, b) => {
      if (sort === 'status') {
        const byStatus = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        if (byStatus !== 0) return byStatus;
      }
      const aDate = sort === 'dueDate' ? a.dueDate : a.createdAt;
      const bDate = sort === 'dueDate' ? b.dueDate : b.createdAt;
      return aDate.localeCompare(bDate);
    });
  }, [tasks, filters, sort]);

  const renderTask = ({ item }: { item: Task }) => (
    <TaskCard task={item} onPress={(task) => navigation.navigate('TaskDetail', { taskId: task.id })} />
  );

  return (
    <Screen>
      <View style={styles.flex}>
        {notificationNotice ? (
          <View style={[styles.notice, { backgroundColor: `${colors.info}22`, borderColor: colors.info }]}>
            <Text style={[styles.noticeText, { color: colors.text }]} numberOfLines={3}>
              {notificationNotice}
            </Text>
            <TouchableOpacity onPress={clearNotificationNotice} accessibilityLabel="Dismiss notice">
              <Ionicons name="close" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        ) : null}

        <FilterBar filters={filters} sort={sort} onFiltersChange={setFilters} onSortChange={setSort} />
        <SyncBanner />

        <FlatList
          data={visibleTasks}
          keyExtractor={(task) => task.id}
          renderItem={renderTask}
          contentContainerStyle={visibleTasks.length === 0 ? styles.flex : styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={syncing}
              onRefresh={() => void syncNow()}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="clipboard-outline"
              title={filters.query || filters.status !== 'all' ? 'No tasks match your filters' : 'No tasks yet'}
              subtitle="Tap + to create your first task."
            />
          }
        />

        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('TaskForm', undefined)}
          accessibilityLabel="Create task"
        >
          <Ionicons name="add" size={30} color={colors.onPrimary} />
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  notice: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
  },
  listContent: {
    paddingBottom: 88,
  },
  fab: {
    alignItems: 'center',
    borderRadius: 28,
    bottom: 24,
    elevation: 4,
    height: 56,
    justifyContent: 'center',
    position: 'absolute',
    right: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    width: 56,
  },
});
