export interface User {
  user_id: string
  name: string | null
  email: string
}

export interface AuthResponse {
  user: User
  access_token: string
  refresh_token: string
  user_id: string
}

export type AuctionStatus = 'in-progress' | 'completed' | 'cancelled'

export interface Task {
  task_id: string
  title: string
  description: string
  client_id: string
  freelancer_id: string | null
  payment_id: string
  auction_start_time: string
  auction_end_time: string
  auction_status: AuctionStatus
}

export interface TaskCreate {
  title: string
  description: string
  client_id: string
  freelancer_id?: string
  payment_id: string
  auction_status?: AuctionStatus
  auction_start_time: string
  auction_end_time: string
}

export interface TaskUpdate {
  title?: string
  description?: string
  freelancer_id?: string
  payment_id?: string
  auction_status?: AuctionStatus
  auction_start_time?: string
  auction_end_time?: string
}

export interface Bid {
  bid_id: string
  task_id: string
  bidder_id: string | null
  bid_amount: number
  timestamp: string
}

export interface BidCurrent {
  bid_amount: number | null
  bidder_id: string | null
}

export interface AuctionCreate {
  task_id: string
  auction_end_time: string
  starting_bid: number
}

export interface BidCreate {
  task_id: string
  bidder_id?: string
  bid_amount: number
  timestamp: string
}

export interface Chat {
  chat_id: string
}

export interface ChatCreate {
  user_1_id: string
  user_2_id: string
}

export interface Message {
  sender_id: string
  message: string
  timestamp: string | null
}

export interface MessageCreate {
  sender_id: string
  message: string
}