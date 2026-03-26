from supabase import create_client, Client
import os
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv())

class SupabaseService:
    def __init__(self):
        self.url = os.getenv("SUPABASE_URL")
        self.key = os.getenv("SUPABASE_KEY")
        self.client: Client = create_client(self.url, self.key)

    def _execute(self, query):
        response = query.execute()
        if hasattr(response, 'data'):
            return response.data
        raise Exception(f"Supabase query failed: {response}")

    def get_ads(self):
        return self._execute(self.client.schema("ads").from_("ads").select("*"))

    def get_active_ads(self):
        return self._execute(
            self.client.schema("ads").from_("ads")
            .select("*")
            .eq("is_active", True)
        )

    def get_ad(self, ad_id: str):
        return self._execute(self.client.schema("ads").from_("ads").select("*").eq("ad_id", ad_id))

    def create_ad(self, ad_data: dict):
        return self._execute(self.client.schema("ads").from_("ads").insert(ad_data))

    def update_ad(self, ad_id: str, ad_data: dict):
        return self._execute(self.client.schema("ads").from_("ads").update(ad_data).eq("ad_id", ad_id))

    def delete_ad(self, ad_id: str):
        return self._execute(self.client.schema("ads").from_("ads").delete().eq("ad_id", ad_id))

    def increment_impressions(self, ad_id: str):
        # Use RPC or raw update to increment
        return self._execute(
            self.client.schema("ads").rpc("increment_ad_impressions", {"p_ad_id": ad_id})
        )

    def increment_clicks(self, ad_id: str):
        return self._execute(
            self.client.schema("ads").rpc("increment_ad_clicks", {"p_ad_id": ad_id})
        )
