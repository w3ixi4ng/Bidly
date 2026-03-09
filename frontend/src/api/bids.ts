import client from './client'
import type { Bid, BidCurrent, BidCreate, AuctionCreate } from '../types'

export const createAuction = (data: AuctionCreate) =>
  client.post('/bids/auction', data).then((r) => r.data)

export const placeBid = (data: BidCreate) =>
  client.post<Bid>('/bids', data).then((r) => r.data)

export const getCurrentBid = (task_id: string) =>
  client.get<BidCurrent>(`/bids/current/${task_id}`).then((r) => r.data)

export const getBidsByTask = (task_id: string) =>
  client.get<{ bids: Bid[] }>(`/bids/task/${task_id}`).then((r) => r.data.bids)
