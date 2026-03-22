export interface User {
  user_id: string;
  name: string | null;
  email: string;
  stripe_connected_account_id: string | null;
  profile_picture_url: string | null;
}

export type TaskCategory = 'Design' | 'Development' | 'Writing' | 'Marketing' | 'Other';

export interface Task {
  task_id: string;
  title: string;
  description: string;
  requirements: string[];
  category: TaskCategory;
  client_id: string;
  freelancer_id: string | null;
  payment_id: string;
  starting_bid: number;
  auction_start_time: string;
  auction_end_time: string;
  auction_status: 'pending' | 'in-progress' | 'completed' | 'cancelled' | 'no-bids' | 'pending-review' | 'accepted' | 'disputed';
  photos: string[] | null;
}

export interface Bid {
  bid_id: string;
  task_id: string;
  bidder_id: string | null;
  bid_amount: number;
  timestamp: string;
}

export interface CurrentBid {
  bid_amount: number | null;
  bidder_id: string | null;
}

export interface Chat {
  chat_id: string;
  user_1_id?: string;
  user_2_id?: string;
}

export interface Message {
  sender_id: string;
  message: string;
  timestamp: string | null;
}
