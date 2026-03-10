import { apiClient } from './client';
import type { Task } from '../types';

export async function getTasks(): Promise<Task[]> {
  const { data } = await apiClient.get<{ tasks: Task[] }>('/tasks');
  return data.tasks;
}

export async function getTask(task_id: string): Promise<Task> {
  const { data } = await apiClient.get<Task>(`/tasks/${task_id}`);
  return data;
}

export interface CreateTaskPayload {
  title: string;
  description: string;
  client_id: string;
  payment_id: string;
  starting_bid: number;
  auction_start_time: string;
  auction_end_time: string;
}

export async function createTask(payload: CreateTaskPayload): Promise<Task> {
  const { data } = await apiClient.post<Task>('/create-task', payload);
  return data;
}
