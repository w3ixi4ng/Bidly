import httpx
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request
import uvicorn

PHOTOS_URL = "http://photos:8050"
USERS_URL = "http://users:8004"
TASKS_URL = "http://tasks:8005"

app = FastAPI()


@app.get("/")
async def health_check():
    return {"status": "ok"}


@app.post("/upload-photo/profile-picture")
async def upload_profile_picture(
    request: Request,
    user_id: str = Form(...),
    file: UploadFile = File(...),
):
    """
    Orchestrates profile picture upload:
    1. Upload file to photos service (Supabase Storage)
    2. Update user record via users service (Supabase DB)
    """
    file_bytes = await file.read()

    # Forward the auth token so the users service can verify the request
    auth_header = request.headers.get("Authorization", "")
    headers = {"Authorization": auth_header} if auth_header else {}

    async with httpx.AsyncClient(timeout=30.0) as client:
        # Step 1: Upload to photos service
        upload_res = await client.post(
            f"{PHOTOS_URL}/uploads/profile-picture",
            data={"user_id": user_id},
            files={"file": (file.filename, file_bytes, file.content_type)},
        )
        if upload_res.status_code != 200:
            detail = upload_res.json().get("detail", "Upload failed")
            raise HTTPException(status_code=upload_res.status_code, detail=detail)

        url = upload_res.json()["url"]

        # Step 2: Persist URL via users service
        update_res = await client.put(
            f"{USERS_URL}/users/{user_id}",
            json={"profile_picture_url": url},
            headers=headers,
        )
        if update_res.status_code != 200:
            detail = update_res.json().get("detail", "Failed to update user profile")
            raise HTTPException(status_code=update_res.status_code, detail=detail)

    return {"url": url}


@app.post("/upload-photo/task-photos")
async def upload_task_photos(
    task_id: str = Form(...),
    files: list[UploadFile] = File(...),
):
    """
    Orchestrates task photo upload:
    1. Upload files to photos service (Supabase Storage)
    2. Update task record via tasks service (Supabase DB)
    """
    # Read all files into memory for forwarding
    file_tuples = []
    for f in files:
        content = await f.read()
        file_tuples.append(("files", (f.filename, content, f.content_type)))

    async with httpx.AsyncClient(timeout=60.0) as client:
        # Step 1: Upload to photos service
        upload_res = await client.post(
            f"{PHOTOS_URL}/uploads/task-photos",
            data={"task_id": task_id},
            files=file_tuples,
        )
        if upload_res.status_code != 200:
            detail = upload_res.json().get("detail", "Upload failed")
            raise HTTPException(status_code=upload_res.status_code, detail=detail)

        new_urls = upload_res.json()["urls"]

        # Step 2: Get existing task photos
        task_res = await client.get(f"{TASKS_URL}/tasks/{task_id}")
        if task_res.status_code != 200:
            raise HTTPException(status_code=task_res.status_code, detail="Task not found")

        existing_photos = task_res.json().get("photos") or []
        all_photos = existing_photos + new_urls

        # Step 3: Persist photo URLs via tasks service
        update_res = await client.put(
            f"{TASKS_URL}/tasks/{task_id}",
            json={"photos": all_photos},
        )
        if update_res.status_code != 200:
            detail = update_res.json().get("detail", "Failed to update task")
            raise HTTPException(status_code=update_res.status_code, detail=detail)

    return {"urls": new_urls, "all_photos": all_photos}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8051)
