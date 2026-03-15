from supabase import create_client, Client
import os
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv())

class SupabaseService:
    def __init__(self):
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_KEY")
        self.client: Client = create_client(self.supabase_url, self.supabase_key)


    def create_bid(self, bid_data: dict):
        return self.client.schema("bids").table("bids").insert(bid_data).execute().data
    

    def get_bids_by_task(self, task_id: str):
        return self.client.schema("bids").table("bids").select("*").eq("task_id", task_id).execute().data

    def get_bids_by_user(self, bidder_id: str):
        return self.client.schema("bids").table("bids").select("*").eq("bidder_id", bidder_id).execute().data


