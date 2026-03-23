from supabase import create_client, Client
import os
from typing import Optional
from dotenv import load_dotenv, find_dotenv
load_dotenv(find_dotenv())

class SupabaseAuthService:
    def __init__(self):
        self.url = os.getenv("SUPABASE_URL")
        self.key = os.getenv("SUPABASE_KEY")
        self.client: Client = create_client(self.url, self.key)
        service_key = os.getenv("SUPABASE_SERVICE_KEY", self.key)
        self.admin_client: Client = create_client(self.url, service_key)

    def _execute(self, query):
        response = query.execute()
        if hasattr(response, 'data'):
            return response.data
        raise Exception(f"Supabase query failed: {response}")

    def signup_user(self, email: str, password: str, name: Optional[str] = None):

        response = self.client.auth.sign_up({
            "email": email,
            "password": password,
            "options": {
                "data": {
                    "name": name
                }
            }
        })

        return response.user, response.session

    def login_user(self, email: str, password: str):

        response = self.client.auth.sign_in_with_password({
            "email": email,
            "password": password
        })

        return response.user, response.session

    def get_user_by_token(self, token: str):
        try:
            user = self.client.auth.get_user(token)
            return user
        except Exception as e:
            raise Exception(f"Invalid token: {str(e)}")


    def get_user_profile(self, user_id: str):
        data = self._execute(self.admin_client.schema("users").from_("users").select("*").eq("user_id", user_id))
        if not data:
            return None
        return data[0]


    def update_user_profile(self, user_id: str, profile_data: dict):
        return self._execute(self.admin_client.schema("users").from_("users").update(profile_data).eq("user_id", user_id))


    def refresh_session(self, refresh_token: str):
        response = self.client.auth.refresh_session(refresh_token)
        return response.session

    def get_all_users(self):
        return self._execute(self.admin_client.schema("users").from_("users").select("*"))
