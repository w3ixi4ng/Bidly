import { apiClient } from './client';
import type { TaskCategory } from '../types';

export interface CapturePaymentPayload {
  title: string;
  description: string;
  category: TaskCategory;
  client_id: string;
  starting_bid: number;
  auction_start_time: string;
  auction_end_time: string;
  is_featured?: boolean;
}

export async function capturePayment(
  payload: CapturePaymentPayload
): Promise<{ client_secret: string }> {
  const { data } = await apiClient.post<{ client_secret: string }>(
    '/handle-payment/capture',
    payload
  );
  return data;
}

export async function captureFeaturedFee(
  taskId: string,
  clientId: string
): Promise<{ client_secret: string }> {
  const { data } = await apiClient.post<{ client_secret: string }>(
    '/handle-payment/capture-featured-fee',
    { task_id: taskId, client_id: clientId }
  );
  return data;
}

export async function createConnectedAccount(
  email: string
): Promise<{ url: string; stripe_connected_account_id: string }> {
  const { data } = await apiClient.post<{
    url: string;
    stripe_connected_account_id: string;
  }>('/payment/create-connected-account', { email });
  return data;
}

export async function getAccountStatus(
  accountId: string
): Promise<{ charges_enabled: boolean; payouts_enabled: boolean; details_submitted: boolean }> {
  const { data } = await apiClient.get(`/payment/account-status/${accountId}`);
  return data;
}

export async function getOnboardingLink(
  accountId: string
): Promise<{ url: string }> {
  const { data } = await apiClient.post(`/payment/onboarding-link/${accountId}`);
  return data;
}

export interface ReleasePaymentPayload {
  payment_id: string;
  freelancer_id: string;
  amount: number;
  client_id: string;
}

export interface ReleasePaymentResponse {
  status: string;
  freelancer_payout?: number;
}

export async function releasePayment(
  payload: ReleasePaymentPayload
): Promise<ReleasePaymentResponse> {
  const { data } = await apiClient.post<ReleasePaymentResponse>(
    '/handle-payment/release',
    payload
  );
  return data;
}

export async function refundPayment(
  paymentId: string
): Promise<{ status: string }> {
  const { data } = await apiClient.post<{ status: string }>(
    '/handle-payment/refund',
    { payment_id: paymentId }
  );
  return data;
}

export interface CreateTaskPayload {
  title: string;
  description: string;
  requirements: string[];
  category: string;
  client_id: string;
  payment_id: string;
  payment_intent_id: string;
  starting_bid: number;
  auction_start_time: string;
  auction_end_time: string;
}

export async function createTask(
  payload: CreateTaskPayload
): Promise<Record<string, unknown>> {
  const { data } = await apiClient.post('/create-task', payload);
  return data;
}
