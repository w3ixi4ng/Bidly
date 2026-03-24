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

    def get_tasks(self):
        return self._execute(self.client.schema("tasks").from_("tasks").select("*"))

    def get_task(self, task_id: str):
        return self._execute(self.client.schema("tasks").from_("tasks").select("*").eq("task_id", task_id))

    def get_task_by_payment_id(self, payment_id: str):
        return self._execute(self.client.schema("tasks").from_("tasks").select("*").eq("payment_id", payment_id))

    def create_task(self, task_data: dict):
        return self._execute(self.client.schema("tasks").from_("tasks").insert(task_data))

    def update_task(self, task_id: str, task_data: dict):
        return self._execute(self.client.schema("tasks").from_("tasks").update(task_data).eq("task_id", task_id))

    def delete_task(self, task_id: str):
        return self._execute(self.client.schema("tasks").from_("tasks").delete().eq("task_id", task_id))

    def get_tasks_by_payment_id(self, payment_id: str):
        return self._execute(self.client.schema("tasks").from_("tasks").select("*").eq("payment_id", payment_id))

    def get_tasks_by_client(self, client_id: str):
        return self._execute(self.client.schema("tasks").from_("tasks").select("*").eq("client_id", client_id))

    def get_tasks_by_freelancer(self, freelancer_id: str):
        return self._execute(self.client.schema("tasks").from_("tasks").select("*").eq("freelancer_id", freelancer_id))
