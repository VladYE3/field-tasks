import React, { useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { selectVisibleTasks, useTaskStore } from '../store/useTaskStore';
import { STATUS_LABELS } from '../constants';
import Screen from '../components/Screen';
import EmptyState from '../components/EmptyState';
import { useTheme } from '../theme';
import { MAP_HTML } from './mapHtml';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface MapTaskPayload {
  id: string;
  title: string;
  status: string;
  address: string;
  latitude: number;
  longitude: number;
}

export default function MapScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const tasks = useTaskStore((state) => state.tasks);
  const webViewRef = useRef<WebView>(null);
  const [webViewFailed, setWebViewFailed] = useState(false);

  const { withCoords, withoutCoords } = useMemo(() => {
    const visible = selectVisibleTasks(tasks);
    return {
      withCoords: visible.filter(
        (task) =>
          typeof task.location.latitude === 'number' && typeof task.location.longitude === 'number' &&
          Number.isFinite(task.location.latitude) && Number.isFinite(task.location.longitude),
      ),
      withoutCoords: visible.filter(
        (task) =>
          typeof task.location.latitude !== 'number' || typeof task.location.longitude !== 'number' ||
          !Number.isFinite(task.location.latitude) || !Number.isFinite(task.location.longitude),
      ),
    };
  }, [tasks]);

  const payload: MapTaskPayload[] = useMemo(
    () =>
      withCoords.map((task) => ({
        id: task.id,
        title: task.title,
        status: STATUS_LABELS[task.status],
        address: task.location.address,
        latitude: Number(task.location.latitude),
        longitude: Number(task.location.longitude),
      })),
    [withCoords],
  );

  const pushTasksToWebView = (): void => {
    const script = `window.setTasks(${JSON.stringify(payload)}); true;`;
    webViewRef.current?.injectJavaScript(script);
  };

  const onMapLoadEnd = (): void => {
    pushTasksToWebView();
    setTimeout(pushTasksToWebView, 500);
  };

  const onMessage = (event: WebViewMessageEvent): void => {
    try {
      const message = JSON.parse(event.nativeEvent.data) as { type?: string; taskId?: string };
      if (message.type === 'map-ready') {
        pushTasksToWebView();
      } else if (message.type === 'select-task' && message.taskId) {
        navigation.navigate('TaskDetail', { taskId: message.taskId });
      } else if (message.type === 'map-error') {
        setWebViewFailed(true);
      }
    } catch {
      // Ignore malformed messages from the page.
    }
  };

  return (
    <Screen>
      {withCoords.length > 0 ? (
        <Text style={[styles.mapSummary, { color: colors.textMuted }]}>Tasks on map: {withCoords.length}</Text>
      ) : null}
      {withCoords.length === 0 ? (
        <EmptyState
          icon="map-outline"
          title="No tasks to show on the map"
          subtitle="Add coordinates to a task (via a predefined location or manually) to see it here."
        />
      ) : webViewFailed ? (
        <View style={styles.fallback}>
          <EmptyState
            icon="cloud-offline-outline"
            title="Map could not be loaded"
            subtitle="The map view is unavailable, but you can still open tasks from the list below. Map tiles also require an internet connection."
          />
        </View>
      ) : (
        <WebView
          ref={webViewRef}
          style={{ backgroundColor: colors.background }}
          source={{ html: MAP_HTML, baseUrl: 'https://unpkg.com/' }}
          originWhitelist={['https://*', 'http://*', 'about:blank']}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          onLoadEnd={onMapLoadEnd}
          onMessage={onMessage}
          onError={() => setWebViewFailed(true)}
        />
      )}

      {withoutCoords.length > 0 && (
        <View style={styles.chipsSection}>
          <Text style={[styles.chipsHeading, { color: colors.textMuted }]}>
            Tasks without coordinates ({withoutCoords.length})
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {withoutCoords.map((task) => (
              <TouchableOpacity
                key={task.id}
                style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
              >
                <Text style={[styles.chipLabel, { color: colors.text }]} numberOfLines={1}>
                  {task.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  mapSummary: {
    fontSize: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  fallback: {
    flex: 1,
  },
  chipsSection: {
    paddingBottom: 8,
    paddingTop: 8,
  },
  chipsHeading: {
    fontSize: 12,
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  chipsRow: {
    gap: 8,
    paddingHorizontal: 16,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: 260,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
});
