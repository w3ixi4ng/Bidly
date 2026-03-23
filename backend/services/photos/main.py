from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from supabase_storage import SupabaseStorageService, ALLOWED_TYPES, MAX_FILE_SIZE
import uvicorn

app = FastAPI()
storage = SupabaseStorageService()


@app.get("/")
async def health_check():
    return {"status": "ok"}


def _validate_file(file: UploadFile, file_bytes: bytes):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{file.content_type}'. Allowed: JPEG, PNG, WebP.",
        )
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is 5 MB.",
        )


@app.post("/uploads/profile-picture")
async def upload_profile_picture(
    user_id: str = Form(...),
    file: UploadFile = File(...),
):
    file_bytes = await file.read()
    _validate_file(file, file_bytes)

    try:
        url = storage.upload_profile_picture(user_id, file_bytes, file.content_type)
        return {"url": url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@app.post("/uploads/task-photos")
async def upload_task_photos(
    task_id: str = Form(...),
    files: list[UploadFile] = File(...),
):
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 photos per task.")

    # Validate all files first
    file_data: list[tuple[bytes, str]] = []
    for f in files:
        file_bytes = await f.read()
        _validate_file(f, file_bytes)
        file_data.append((file_bytes, f.content_type))

    # Upload validated files
    uploaded_urls: list[str] = []
    for file_bytes, content_type in file_data:
        try:
            url = storage.upload_task_photo(task_id, file_bytes, content_type)
            uploaded_urls.append(url)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

    return {"urls": uploaded_urls}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8050)
