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

    def create_chat(self, chat_data: dict):
        user1 = chat_data["user_1_id"]
        user2 = chat_data["user_2_id"]
        existing_chat = self._execute(self.client.schema("chats").from_("chats").select("*").or_(
            f"and(user_1_id.eq.{user1},user_2_id.eq.{user2}),and(user_1_id.eq.{user2},user_2_id.eq.{user1})"
        ))
        if existing_chat:
            return existing_chat
        return self._execute(self.client.schema("chats").from_("chats").insert(chat_data))

    def get_chat_by_id(self, chat_id: str):
        return self._execute(self.client.schema("chats").from_("chats").select("*").eq("chat_id", chat_id))

    def get_chats_by_user(self, user_id: str):
        return self._execute(self.client.schema("chats").from_("chats").select("*").or_(f"user_1_id.eq.{user_id},user_2_id.eq.{user_id}"))
