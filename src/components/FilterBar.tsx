import React from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SortOption, StatusFilter, TaskFilters } from '../types';
import { STATUS_LABELS } from '../constants';
import { useTheme } from '../theme';

const STATUS_FILTERS: StatusFilter[] = ['all', 'new', 'in_progress', 'completed', 'cancelled'];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'createdAt', label: 'Date added' },
  { value: 'dueDate', label: 'Due date' },
  { value: 'status', label: 'Status' },
];

interface FilterBarProps {
  filters: TaskFilters;
  sort: SortOption;
  onFiltersChange: (filters: TaskFilters) => void;
  onSortChange: (sort: SortOption) => void;
}

export default function FilterBar({ filters, sort, onFiltersChange, onSortChange }: FilterBarProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search" size={16} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search tasks"
          placeholderTextColor={colors.textMuted}
          value={filters.query}
          onChangeText={(query) => onFiltersChange({ ...filters, query })}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {filters.query.length > 0 && (
          <TouchableOpacity onPress={() => onFiltersChange({ ...filters, query: '' })}>
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        {STATUS_FILTERS.map((status) => {
          const active = filters.status === status;
          return (
            <TouchableOpacity
              key={status}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? colors.primary : colors.surface,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
              onPress={() => onFiltersChange({ ...filters, status })}
            >
              <Text style={{ color: active ? colors.onPrimary : colors.text, fontSize: 13, fontWeight: '600' }}>
                {status === 'all' ? 'All' : STATUS_LABELS[status]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.sortRow}>
        <Text style={[styles.sortLabel, { color: colors.textMuted }]}>Sort:</Text>
        {SORT_OPTIONS.map((option) => {
          const active = sort === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.sortChip,
                {
                  backgroundColor: active ? colors.surfaceAlt : 'transparent',
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
              onPress={() => onSortChange(option.value)}
            >
              <Text
                style={{
                  color: active ? colors.primary : colors.textMuted,
                  fontSize: 12,
                  fontWeight: '600',
                }}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchBox: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    minHeight: 40,
    paddingVertical: 0,
  },
  chipsRow: {
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  sortRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  sortLabel: {
    fontSize: 12,
  },
  sortChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
});
