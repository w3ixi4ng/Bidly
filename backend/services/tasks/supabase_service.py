from supabase import create_client, Client
import os
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv())

class SupabaseService:
    def __init__(self):
        self.url = os.getenv("SUPABASE_URL")
        self.key = os.getenv("SUPABASE_KEY")
        self.client: Client = create_client(self.url, self.key)

    def get_tasks(self):
        response = self.client.schema("tasks").from_("tasks").select("*").execute()
        return response.data

    def get_task(self, task_id: str):
        response = self.client.schema("tasks").from_("tasks").select("*").eq("task_id", task_id).execute()
        return response.data

    def get_task_by_payment_intent_id(self, payment_intent_id: str):
        response = self.client.schema("tasks").from_("tasks").select("*").eq("payment_intent_id", payment_intent_id).execute()
        return response.data

    def create_task(self, task_data: dict):
        response = self.client.schema("tasks").from_("tasks").insert(task_data).execute()
        return response.data

    def update_task(self, task_id: str, task_data: dict):
        response = self.client.schema("tasks").from_("tasks").update(task_data).eq("task_id", task_id).execute()
        return response.data

    def delete_task(self, task_id: str):
        response = self.client.schema("tasks").from_("tasks").delete().eq("task_id", task_id).execute()
        return response.data