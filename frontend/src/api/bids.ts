import { apiClient } from './client';
import type { CurrentBid } from '../types';

export interface PlaceBidPayload {
  task_id: string;
  bidder_id: string;
  bid_amount: number;
  timestamp: string;
}

export interface BidResponse {
  bid_id?: string;
  task_id: string;
  bidder_id: string;
  bid_amount: number;
  timestamp: string;
}

export async function placeBid(payload: PlaceBidPayload): Promise<BidResponse> {
  const { data } = await apiClient.post<BidResponse>('/bids', payload);
  return data;
}

export async function getCurrentBid(task_id: string): Promise<CurrentBid> {
  const { data } = await apiClient.get<CurrentBid>(`/bids/current/${task_id}`);
  return data;
}
