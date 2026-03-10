import { apiClient } from './client';
import type { User } from '../types';

export interface SignupPayload {
  email: string;
  password: string;
  name: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
  user_id: string;
}

export async function signup(payload: SignupPayload): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/users/auth/signup', payload);
  return data;
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/users/auth/login', payload);
  return data;
}

export async function getUser(user_id: string): Promise<User> {
  const { data } = await apiClient.get<User>(`/users/${user_id}`);
  return data;
}

export async function updateUser(
  user_id: string,
  payload: { name?: string; stripe_connected_account_id?: string }
): Promise<User> {
  const { data } = await apiClient.put<User>(`/users/${user_id}`, payload);
  return data;
}
