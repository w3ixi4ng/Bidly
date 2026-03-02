from supabase import create_client, Client
import os
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv())

class SupabaseService:
    def __init__(self):
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_KEY")
        self.client: Client = create_client(self.supabase_url, self.supabase_key)


    def create_auction(self, auction_data: dict):
        return self.client.table("auctions").insert(auction_data).execute().data
    

    def get_auctions_by_task(self, task_id: str):
        return self.client.table("auctions").select("*").eq("task_id", task_id).execute().data
    
    

