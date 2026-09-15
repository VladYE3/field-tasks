import React, { useState } from 'react';
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Attachment } from '../types';
import { captureImageAttachment, pickImageAttachment } from '../services/attachmentService';
import { useTheme } from '../theme';

interface AttachmentSectionProps {
  attachments: Attachment[];
  onChange: (attachments: Attachment[]) => void;
}

async function addAttachment(
  pick: () => Promise<Attachment | null>,
  attachments: Attachment[],
  onChange: (attachments: Attachment[]) => void,
  setBusy: (busy: boolean) => void,
): Promise<void> {
  setBusy(true);
  try {
    const attachment = await pick();
    if (attachment) onChange([...attachments, attachment]);
  } catch (error) {
    Alert.alert('Attachment', error instanceof Error ? error.message : 'Could not add the attachment.');
  } finally {
    setBusy(false);
  }
}

export default function AttachmentSection({ attachments, onChange }: AttachmentSectionProps) {
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false);

  return (
    <View style={styles.section}>
      <Text style={[styles.heading, { color: colors.text }]}>Attachments</Text>
      <View style={styles.buttonsRow}>
        <TouchableOpacity
          style={[styles.addButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
          onPress={() => void addAttachment(pickImageAttachment, attachments, onChange, setBusy)}
          disabled={busy}
        >
          <Ionicons name="images-outline" size={20} color={colors.primary} />
          <Text style={[styles.addButtonLabel, { color: colors.primary }]}>Add from gallery</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.addButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
          onPress={() => void addAttachment(captureImageAttachment, attachments, onChange, setBusy)}
          disabled={busy}
        >
          <Ionicons name="camera-outline" size={20} color={colors.primary} />
          <Text style={[styles.addButtonLabel, { color: colors.primary }]}>Take photo</Text>
        </TouchableOpacity>
      </View>
      {attachments.length > 0 && (
        <View style={styles.grid}>
          {attachments.map((attachment) => (
            <View key={attachment.id} style={[styles.thumb, { borderColor: colors.border }]}>
              <Image source={{ uri: attachment.uri }} style={styles.thumbImage} resizeMode="cover" />
              <TouchableOpacity
                style={[styles.remove, { backgroundColor: colors.danger }]}
                onPress={() => onChange(attachments.filter((a) => a.id !== attachment.id))}
                accessibilityLabel={`Remove ${attachment.fileName}`}
              >
                <Ionicons name="close" size={14} color={colors.onPrimary} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const THUMB = 84;

const styles = StyleSheet.create({
  section: {
    gap: 10,
  },
  heading: {
    fontSize: 14,
    fontWeight: '600',
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  addButton: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 12,
  },
  addButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  thumb: {
    borderRadius: 10,
    borderWidth: 1,
    height: THUMB,
    overflow: 'hidden',
    width: THUMB,
  },
  thumbImage: {
    height: '100%',
    width: '100%',
  },
  remove: {
    alignItems: 'center',
    borderRadius: 10,
    height: 20,
    justifyContent: 'center',
    position: 'absolute',
    right: 4,
    top: 4,
    width: 20,
  },
});
