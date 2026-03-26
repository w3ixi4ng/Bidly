import { apiClient } from './client';
import type { Ad } from '../types';

export async function getActiveAds(): Promise<Ad[]> {
  const { data } = await apiClient.get<{ ads: Ad[] }>('/ads');
  return data.ads ?? [];
}

export async function trackAdImpression(adId: string): Promise<void> {
  await apiClient.post(`/ads/${adId}/impression`);
}

export async function trackAdClick(adId: string): Promise<void> {
  await apiClient.post(`/ads/${adId}/click`);
}
