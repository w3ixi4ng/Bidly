import { apiClient } from './client';

export async function uploadProfilePicture(
  userId: string,
  file: File
): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('user_id', userId);
  formData.append('file', file);

  const { data } = await apiClient.post<{ url: string }>(
    '/upload-photo/profile-picture',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return data;
}

export async function uploadTaskPhotos(
  taskId: string,
  files: File[]
): Promise<{ urls: string[]; all_photos: string[] }> {
  const formData = new FormData();
  formData.append('task_id', taskId);
  files.forEach((file) => formData.append('files', file));

  const { data } = await apiClient.post<{ urls: string[]; all_photos: string[] }>(
    '/upload-photo/task-photos',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return data;
}

export async function uploadTaskThumbnail(
  taskId: string,
  file: File
): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('task_id', taskId);
  formData.append('file', file);

  const { data } = await apiClient.post<{ url: string }>(
    '/upload-photo/task-thumbnail',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return data;
}
