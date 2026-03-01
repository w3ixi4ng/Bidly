from fastapi import FastAPI, HTTPException
from schema import TaskCreate, TaskUpdate, TaskResponse, TaskListResponse
from supabase_client import SupabaseService
import uvicorn

app = FastAPI()
supebase = SupabaseService()


@app.get("/")
async def health_check():
    return {"status": "ok"}


@app.get("/tasks", response_model=TaskListResponse)
async def get_tasks():
    tasks = supebase.get_tasks()
    if not tasks:
        raise HTTPException(status_code=404, detail="No tasks found")
    return TaskListResponse(tasks=tasks)


@app.post("/tasks", response_model=TaskResponse, status_code=201)
async def create_task(task: TaskCreate):
    task_data = task.model_dump(mode='json')
    created_task = supebase.create_task(task_data)
    if not created_task:
        raise HTTPException(status_code=400, detail="Failed to create task")
    return TaskResponse(**created_task[0])


@app.put("/tasks/{task_id}", response_model=TaskResponse)
async def update_task(task_id: str, task: TaskUpdate):
    task_data = task.model_dump(mode='json', exclude_unset=True)
    updated_task = supebase.update_task(task_id, task_data)
    if not updated_task:
        raise HTTPException(status_code=404, detail="Task not found")
    return TaskResponse(**updated_task[0])


@app.delete("/tasks/{task_id}")
async def delete_task(task_id: str):
    deleted_task = supebase.delete_task(task_id)
    if not deleted_task:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task deleted successfully"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000)