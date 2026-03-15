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

export async function createConnectedAccount(
  email: string
): Promise<{ url: string; stripe_connected_account_id: string }> {
  const { data } = await apiClient.post<{
    url: string;
    stripe_connected_account_id: string;
  }>('/payment/create-connected-account', { email });
  return data;
}

export interface ReleasePaymentPayload {
  payment_id: string;
  freelancer_id: string;
  amount: number;
  client_id: string;
}

export async function releasePayment(
  payload: ReleasePaymentPayload
): Promise<{ status: string }> {
  const { data } = await apiClient.post<{ status: string }>(
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
