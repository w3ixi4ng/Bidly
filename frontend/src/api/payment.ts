import { apiClient } from './client';

export interface CapturePaymentPayload {
  title: string;
  description: string;
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
