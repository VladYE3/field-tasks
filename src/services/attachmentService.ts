import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import type { Attachment } from '../types';
import { generateId } from '../utils/id';

const ATTACHMENTS_DIR_NAME = 'attachments';

function attachmentsDir(): Directory {
  return new Directory(Paths.document, ATTACHMENTS_DIR_NAME);
}

function ensureAttachmentsDir(): Directory {
  const dir = attachmentsDir();
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

export function attachmentExists(uri: string): boolean {
  try {
    return new File(uri).exists;
  } catch {
    return false;
  }
}

/**
 * Copies a picked file (content:// or file:// URI) into the app's document directory so the
 * attachment survives app restarts and cache cleanups. Returns the stored file's URI.
 */
export function persistPickedFile(sourceUri: string, fileName: string): string {
  const dir = ensureAttachmentsDir();
  const safeName = `${generateId('att')}_${fileName.replace(/[^\w.\-]/g, '_')}`;
  const destination = new File(dir, safeName);
  const source = new File(sourceUri);
  source.copy(destination);
  return destination.uri;
}

export function removeAttachmentFile(uri: string): void {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch (error) {
    console.warn('Failed to delete attachment file', error);
  }
}

/**
 * Opens the image picker and persists the chosen image into app storage.
 * Returns null when the user cancels. Throws a friendly Error on failure.
 */
export async function pickImageAttachment(): Promise<Attachment | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Permission to access the photo library was not granted.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.7,
    allowsMultipleSelection: false,
  });

  if (result.canceled || result.assets.length === 0) return null;

  const asset = result.assets[0];
  const fileName = asset.fileName ?? `image_${Date.now()}.jpg`;
  try {
    const persistedUri = persistPickedFile(asset.uri, fileName);
    return {
      id: generateId('att'),
      uri: persistedUri,
      fileName,
      mimeType: asset.mimeType ?? 'image/jpeg',
      size: asset.fileSize ?? 0,
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    console.warn('Failed to persist picked image', error);
    throw new Error('Could not save the image. Please try another one.');
  }
}

/** Same as pickImageAttachment but using the device camera. */
export async function captureImageAttachment(): Promise<Attachment | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Permission to use the camera was not granted.');
  }

  const result = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: false });
  if (result.canceled || result.assets.length === 0) return null;

  const asset = result.assets[0];
  const fileName = asset.fileName ?? `photo_${Date.now()}.jpg`;
  try {
    const persistedUri = persistPickedFile(asset.uri, fileName);
    return {
      id: generateId('att'),
      uri: persistedUri,
      fileName,
      mimeType: asset.mimeType ?? 'image/jpeg',
      size: asset.fileSize ?? 0,
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    console.warn('Failed to persist captured image', error);
    throw new Error('Could not save the photo. Please try again.');
  }
}
