from supabase import create_client, Client
import os
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv())

class SupabaseService:
    def __init__(self):
        self.url = os.getenv("SUPABASE_URL")
        self.key = os.getenv("SUPABASE_KEY")
        self.client: Client = create_client(self.url, self.key)

    def create_chat(self, chat_data: dict):
        existing_chat = self.client.schema("chats").from_("chats").select("*").eq("task_id", chat_data["task_id"]).execute()
        if existing_chat.data:
            return existing_chat.data
        response = self.client.schema("chats").from_("chats").insert(chat_data).execute()
        return response.data
    
    def get_chats_by_user(self, user_id: str):
        response = self.client.schema("chats").from_("chats").select("*").or_(f"client_id.eq.{user_id},freelancer_id.eq.{user_id}").execute()
        return response.data
    
    def get_chat_by_task(self, task_id: str):
        response = self.client.schema("chats").from_("chats").select("*").eq("task_id", task_id).execute()
        return response.data