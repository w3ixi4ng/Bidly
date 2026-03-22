import { apiClient } from './client';
import type { Task, TaskCategory } from '../types';

export async function getTasks(): Promise<Task[]> {
  const { data } = await apiClient.get<{ tasks: Task[] }>('/tasks');
  return data.tasks ?? [];
}

export async function getTask(task_id: string): Promise<Task> {
  const { data } = await apiClient.get<Task>(`/tasks/${task_id}`);
  return data;
}


export async function getTasksByClient(client_id: string): Promise<Task[]> {
  const { data } = await apiClient.get<{ tasks: Task[] }>(`/tasks/client/${client_id}`);
  return data.tasks ?? [];
}

export async function getTasksByFreelancer(freelancer_id: string): Promise<Task[]> {
  const { data } = await apiClient.get<{ tasks: Task[] }>(`/tasks/freelancer/${freelancer_id}`);
  return data.tasks ?? [];
}

export async function updateTask(
  task_id: string,
  payload: Partial<Pick<Task, 'auction_status' | 'freelancer_id' | 'photos'>>
): Promise<Task> {
  const { data } = await apiClient.put<Task>(`/tasks/${task_id}`, payload);
  return data;
}
