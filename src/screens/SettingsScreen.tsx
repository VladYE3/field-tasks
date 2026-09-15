import React, { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { APP_NAME, CANDIDATE_CODE, DEFAULT_SERVER_URL } from '../constants';
import { useTaskStore } from '../store/useTaskStore';
import { formatDateTime } from '../utils/date';
import Screen from '../components/Screen';
import PrimaryButton from '../components/PrimaryButton';
import { useTheme } from '../theme';

export default function SettingsScreen() {
  const { colors, dark } = useTheme();
  const darkMode = useTaskStore((state) => state.darkMode);
  const setDarkMode = useTaskStore((state) => state.setDarkMode);
  const serverUrl = useTaskStore((state) => state.serverUrl);
  const setServerUrl = useTaskStore((state) => state.setServerUrl);
  const syncing = useTaskStore((state) => state.syncing);
  const syncNow = useTaskStore((state) => state.syncNow);
  const lastSyncAt = useTaskStore((state) => state.lastSyncAt);
  const lastSyncError = useTaskStore((state) => state.lastSyncError);
  const isOnline = useTaskStore((state) => state.isOnline);

  const [urlDraft, setUrlDraft] = useState(serverUrl);

  const saveUrl = () => {
    setServerUrl(urlDraft.trim());
  };

  return (
    <Screen scroll>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.rowBetween}>
            <View style={styles.rowLabel}>
              <Ionicons name={dark ? 'moon' : 'sunny'} size={20} color={colors.text} />
              <Text style={[styles.label, { color: colors.text }]}>Dark theme</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={darkMode ? colors.onPrimary : colors.textMuted}
              accessibilityLabel="Toggle dark theme"
            />
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Mock sync server</Text>
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            Base URL of the json-server instance. Leave empty to use the default ({DEFAULT_SERVER_URL} — Android
            emulator loopback). On a physical device use your computer&apos;s LAN IP, e.g. http://192.168.1.10:3001.
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surfaceAlt, color: colors.text, borderColor: colors.border }]}
            value={urlDraft}
            onChangeText={setUrlDraft}
            placeholder={DEFAULT_SERVER_URL}
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            accessibilityLabel="Server URL"
          />
          <PrimaryButton title="Save server URL" onPress={saveUrl} />
          <View style={styles.syncInfo}>
            <Text style={[styles.hint, { color: colors.textMuted }]}>
              Status: {isOnline ? 'Online' : 'Offline'} · Last sync: {lastSyncAt ? formatDateTime(lastSyncAt) : 'never'}
            </Text>
            {lastSyncError ? (
              <Text style={[styles.hint, { color: colors.danger }]}>{lastSyncError}</Text>
            ) : null}
            <PrimaryButton title="Sync now" onPress={() => void syncNow()} disabled={syncing || !isOnline} />
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>About</Text>
          <Text style={[styles.aboutLine, { color: colors.text }]}>{APP_NAME} v{Constants.expoConfig?.version}</Text>
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            Internal tool for field technicians: plan daily tasks, track statuses, attach photos, review history and
            sync when back online.
          </Text>
          <View style={[styles.codeBox, { borderColor: colors.primary, backgroundColor: `${colors.primary}14` }]}>
            <Text style={[styles.codeLabel, { color: colors.textMuted }]}>Candidate code</Text>
            <Text style={[styles.codeValue, { color: colors.primary }]} selectable>
              {CANDIDATE_CODE}
            </Text>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    padding: 16,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  rowBetween: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowLabel: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  syncInfo: {
    gap: 6,
  },
  aboutLine: {
    fontSize: 14,
    fontWeight: '600',
  },
  codeBox: {
    alignItems: 'center',
    borderRadius: 10,
    borderStyle: 'dashed',
    borderWidth: 1,
    gap: 2,
    marginTop: 4,
    paddingVertical: 12,
  },
  codeLabel: {
    fontSize: 12,
  },
  codeValue: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 2,
  },
});
