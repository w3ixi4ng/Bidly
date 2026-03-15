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

export async function getBidsByUser(bidder_id: string): Promise<BidResponse[]> {
  const { data } = await apiClient.get<{ bids: BidResponse[] }>(`/bids/user/${bidder_id}`);
  return data.bids ?? [];
}

export async function getBidsByTask(task_id: string): Promise<BidResponse[]> {
  const { data } = await apiClient.get<{ bids: BidResponse[] }>(`/bids/task/${task_id}`);
  return data.bids ?? [];
}

/**
 * Get current bid with Supabase fallback.
 * Redis may expire after auction ends, so fall back to the lowest bid from Supabase.
 */
export async function getCurrentBidWithFallback(task_id: string): Promise<CurrentBid> {
  try {
    return await getCurrentBid(task_id);
  } catch {
    // Redis failed — fall back to bid history from Supabase
    try {
      const bids = await getBidsByTask(task_id);
      if (bids.length > 0) {
        // Lowest bid wins (reverse auction)
        const lowest = bids.reduce((min, b) => b.bid_amount < min.bid_amount ? b : min, bids[0]);
        return { bid_amount: lowest.bid_amount, bidder_id: lowest.bidder_id };
      }
    } catch {
      // both failed
    }
    return { bid_amount: null, bidder_id: null };
  }
}
