from supabase import create_client, Client
import os
import uuid
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv())

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


class SupabaseStorageService:
    def __init__(self):
        self.url = os.getenv("SUPABASE_URL")
        service_key = os.getenv("SUPABASE_SERVICE_KEY")
        self.client: Client = create_client(self.url, service_key)

    def _public_url(self, bucket: str, path: str) -> str:
        return f"{self.url}/storage/v1/object/public/{bucket}/{path}"

    def upload_profile_picture(self, user_id: str, file_bytes: bytes, content_type: str) -> str:
        ext = content_type.split("/")[-1]
        if ext == "jpeg":
            ext = "jpg"
        path = f"{user_id}/avatar.{ext}"
        bucket = "profile-pictures"

        # Remove any existing avatar files for this user
        try:
            existing = self.client.storage.from_(bucket).list(user_id)
            for f in existing:
                self.client.storage.from_(bucket).remove([f"{user_id}/{f['name']}"])
        except Exception:
            pass

        self.client.storage.from_(bucket).upload(
            path,
            file_bytes,
            file_options={"content-type": content_type, "upsert": "true"},
        )
        return self._public_url(bucket, path)

    def upload_task_photo(self, task_id: str, file_bytes: bytes, content_type: str) -> str:
        ext = content_type.split("/")[-1]
        if ext == "jpeg":
            ext = "jpg"
        filename = f"{uuid.uuid4().hex}.{ext}"
        path = f"{task_id}/{filename}"
        bucket = "task-photos"

        self.client.storage.from_(bucket).upload(
            path,
            file_bytes,
            file_options={"content-type": content_type},
        )
        return self._public_url(bucket, path)

    def delete_task_photos(self, task_id: str):
        bucket = "task-photos"
        try:
            files = self.client.storage.from_(bucket).list(task_id)
            if files:
                paths = [f"{task_id}/{f['name']}" for f in files]
                self.client.storage.from_(bucket).remove(paths)
        except Exception:
            pass
