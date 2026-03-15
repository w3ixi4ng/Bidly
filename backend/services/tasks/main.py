from fastapi import FastAPI, HTTPException
from schema import TaskCreate, TaskUpdate, TaskResponse, TaskListResponse
from supabase_service import SupabaseService
import uvicorn

app = FastAPI()
supabase = SupabaseService()


@app.get("/")
async def health_check():
    return {"status": "ok"}


@app.get("/tasks", response_model=TaskListResponse)
def get_tasks():
    tasks = supabase.get_tasks()
    if not tasks:
        raise HTTPException(status_code=404, detail="No tasks found")
    return TaskListResponse(tasks=tasks)


@app.post("/tasks", response_model=TaskResponse, status_code=201)
def create_task(task: TaskCreate):
    task_data = task.model_dump(mode='json')
    created_task = supabase.create_task(task_data)
    if not created_task:
        raise HTTPException(status_code=400, detail="Failed to create task")
    return TaskResponse(**created_task[0])


@app.get("/tasks/payment_id/{payment_id}", response_model=TaskListResponse, status_code=200)
def get_task_by_payment_id(payment_id: str):
    tasks = supabase.get_task_by_payment_id(payment_id)
    return TaskListResponse(tasks=tasks)


@app.get("/tasks/{task_id}", response_model=TaskResponse, status_code=200)
def get_task(task_id: str):
    task = supabase.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return TaskResponse(**task[0])


@app.put("/tasks/{task_id}", response_model=TaskResponse, status_code=200)
def update_task(task_id: str, task: TaskUpdate):
    task_data = task.model_dump(mode='json', exclude_unset=True)
    updated_task = supabase.update_task(task_id, task_data)
    if not updated_task:
        raise HTTPException(status_code=404, detail="Task not found")
    return TaskResponse(**updated_task[0])


@app.delete("/tasks/{task_id}", status_code=200)
def delete_task(task_id: str):
    deleted_task = supabase.delete_task(task_id)
    if not deleted_task:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task deleted successfully"}


@app.get("/tasks/payment_id/{payment_id}", response_model=TaskListResponse, status_code=200)
def get_tasks_by_payment_id(payment_id: str):
    tasks = supabase.get_tasks_by_payment_id(payment_id)
    if not tasks:
        return TaskListResponse(tasks=[])
    return TaskListResponse(tasks=tasks)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8005)