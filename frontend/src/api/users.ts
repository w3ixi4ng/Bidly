import client from './client'
import type { AuthResponse, User } from '../types'

export const signup = (email: string, password: string, name?: string) =>
  client.post<AuthResponse>('localhost:8000/users/auth/signup', { email, password, name }).then((r) => r.data)

export const login = (email: string, password: string) =>
  client.post<AuthResponse>('/users/auth/login', { email, password }).then((r) => r.data)

export const getUser = (user_id: string) =>
  client.get<User>(`/users/${user_id}`).then((r) => r.data)

export const updateUser = (user_id: string, name: string) =>
  client.put<User>(`/users/${user_id}`, { name }).then((r) => r.data)
