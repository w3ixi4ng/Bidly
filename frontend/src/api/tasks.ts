import client from './client'
import type { Task, TaskCreate, TaskUpdate } from '../types'

export const getTasks = () =>
  client.get<{ tasks: Task[] }>('/tasks').then((r) => r.data.tasks)

export const getTask = (task_id: string) =>
  client.get<Task>(`/tasks/${task_id}`).then((r) => r.data)

export const createTask = (data: TaskCreate) =>
  client.post<Task>('/tasks', data).then((r) => r.data)

export const updateTask = (task_id: string, data: TaskUpdate) =>
  client.put<Task>(`/tasks/${task_id}`, data).then((r) => r.data)

export const deleteTask = (task_id: string) =>
  client.delete(`/tasks/${task_id}`).then((r) => r.data)
