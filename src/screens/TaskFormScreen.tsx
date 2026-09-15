import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import type { Attachment, TaskDraft, TaskStatus } from '../types';
import { PREDEFINED_LOCATIONS, STATUS_LABELS } from '../constants';
import { useTaskStore } from '../store/useTaskStore';
import { validateTaskDraft } from '../utils/validation';
import { fromDateAndTime, toDateInputValue, toTimeInputValue } from '../utils/date';
import Screen from '../components/Screen';
import FormField from '../components/FormField';
import PrimaryButton from '../components/PrimaryButton';
import AttachmentSection from '../components/AttachmentSection';
import { useTheme } from '../theme';
import { geocodeAddress } from '../services/geocodingService';

type FormRouteProp = RouteProp<RootStackParamList, 'TaskForm'>;
type FormNavigationProp = NativeStackNavigationProp<RootStackParamList, 'TaskForm'>;

const ALL_STATUSES: TaskStatus[] = ['new', 'in_progress', 'completed', 'cancelled'];

export default function TaskFormScreen({ route, navigation }: { route: FormRouteProp; navigation: FormNavigationProp }) {
  const { colors } = useTheme();
  const taskId = route.params?.taskId;
  const existing = useTaskStore((state) => state.tasks.find((task) => task.id === taskId));
  const createTask = useTaskStore((state) => state.createTask);
  const updateTask = useTaskStore((state) => state.updateTask);

  const isEditing = Boolean(taskId && existing);

  const [title, setTitle] = useState(existing?.title ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [dateStr, setDateStr] = useState(() =>
    existing ? toDateInputValue(new Date(existing.dueDate)) : toDateInputValue(new Date()),
  );
  const [timeStr, setTimeStr] = useState(() =>
    existing ? toTimeInputValue(new Date(existing.dueDate)) : toTimeInputValue(new Date()),
  );
  const [address, setAddress] = useState(existing?.location.address ?? '');
  const [latitude, setLatitude] = useState(
    existing?.location.latitude !== undefined ? String(existing.location.latitude) : '',
  );
  const [longitude, setLongitude] = useState(
    existing?.location.longitude !== undefined ? String(existing.location.longitude) : '',
  );
  const [attachments, setAttachments] = useState<Attachment[]>(existing?.attachments ?? []);
  const [status, setStatus] = useState<TaskStatus>(existing?.status ?? 'new');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dueDateNotice, setDueDateNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const inputStyle = {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    color: colors.text,
  } as const;

  const save = async (): Promise<void> => {
    const dueDate = fromDateAndTime(dateStr, timeStr);
    const hasManualCoordinates = latitude.trim() !== '' && longitude.trim() !== '';
    const geocoded = hasManualCoordinates ? undefined : await geocodeAddress(address);
    const draft: TaskDraft = {
      title,
      description,
      dueDate: dueDate ?? new Date(NaN),
      location: {
        address,
        latitude: hasManualCoordinates ? Number(latitude) : geocoded?.latitude,
        longitude: hasManualCoordinates ? Number(longitude) : geocoded?.longitude,
      },
      attachments,
      status,
    };
    const result = validateTaskDraft(draft);
    setErrors(result.errors);
    setDueDateNotice(result.errors.dueDateNotice ?? null);
    if (!result.valid) return;

    setSaving(true);
    try {
      if (isEditing && existing) {
        await updateTask(existing.id, draft);
      } else {
        await createTask(draft);
      }
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll contentStyle={styles.content}>
      <FormField label="Title" error={errors.title}>
        <TextInput
          style={[styles.input, inputStyle]}
          value={title}
          onChangeText={setTitle}
          placeholder="Task title"
          placeholderTextColor={colors.textMuted}
          maxLength={120}
        />
      </FormField>

      <FormField label="Description" error={errors.description}>
        <TextInput
          style={[styles.input, styles.multiline, inputStyle]}
          value={description}
          onChangeText={setDescription}
          placeholder="What needs to be done?"
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={4}
        />
      </FormField>

      <FormField label="Due date" error={errors.dueDate}>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.flex, inputStyle]}
            value={dateStr}
            onChangeText={setDateStr}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
          />
          <TextInput
            style={[styles.input, styles.flex, inputStyle]}
            value={timeStr}
            onChangeText={setTimeStr}
            placeholder="HH:MM"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
          />
        </View>
      </FormField>

      {dueDateNotice ? (
        <View style={[styles.notice, { backgroundColor: `${colors.warning}1A`, borderColor: colors.warning }]}>
          <Text style={[styles.noticeText, { color: colors.text }]}>{dueDateNotice}</Text>
        </View>
      ) : null}

      <FormField label="Location address" error={errors.location}>
        <TextInput
          style={[styles.input, inputStyle]}
          value={address}
          onChangeText={setAddress}
          placeholder="Where is the job?"
          placeholderTextColor={colors.textMuted}
        />
        <View style={styles.chipsWrap}>
          {PREDEFINED_LOCATIONS.map((location) => (
            <TouchableOpacity
              key={location.address}
              style={[
                styles.chip,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={() => {
                setAddress(location.address);
                setLatitude(String(location.latitude));
                setLongitude(String(location.longitude));
              }}
            >
              <Text style={[styles.chipLabel, { color: colors.text }]} numberOfLines={1}>
                {location.address}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </FormField>

      <FormField label="Coordinates (optional)">
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.flex, inputStyle]}
            value={latitude}
            onChangeText={setLatitude}
            placeholder="Latitude"
            placeholderTextColor={colors.textMuted}
            keyboardType="numbers-and-punctuation"
            autoCapitalize="none"
          />
          <TextInput
            style={[styles.input, styles.flex, inputStyle]}
            value={longitude}
            onChangeText={setLongitude}
            placeholder="Longitude"
            placeholderTextColor={colors.textMuted}
            keyboardType="numbers-and-punctuation"
            autoCapitalize="none"
          />
        </View>
      </FormField>

      <AttachmentSection attachments={attachments} onChange={setAttachments} />

      {isEditing ? (
        <FormField label="Status">
          <View style={styles.chipsWrap}>
            {ALL_STATUSES.map((value) => {
              const active = status === value;
              return (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? colors.primary : colors.surface,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setStatus(value)}
                >
                  <Text
                    style={{
                      color: active ? colors.onPrimary : colors.text,
                      fontSize: 13,
                      fontWeight: '600',
                    }}
                  >
                    {STATUS_LABELS[value]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </FormField>
      ) : null}

      <PrimaryButton
        title={isEditing ? 'Save changes' : 'Create task'}
        onPress={() => void save()}
        loading={saving}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    padding: 16,
    paddingBottom: 40,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 15,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  multiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  flex: {
    flex: 1,
  },
  notice: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  noticeText: {
    fontSize: 13,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: '100%',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipLabel: {
    fontSize: 13,
  },
});
