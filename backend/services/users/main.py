<<<<<<< HEAD
from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from backend.services.users.schema import UserSignup, UserLogin, UserResponse, UserUpdate
from backend.services.users.supabase_client import SupabaseAuthService
import uvicorn

app = FastAPI()
supabase_auth = SupabaseAuthService()
security = HTTPBearer()


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        user = supabase_auth.get_user_by_token(token)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        return user
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


@app.get("/")
async def health_check():
    return {"status": "ok"}


@app.post("/auth/signup", status_code=201)
async def signup(user_data: UserSignup):
    try:
        user, session = supabase_auth.signup_user(
            email=user_data.email,
            password=user_data.password,
            name=user_data.name
        )
        
        if not user or not session:
            raise HTTPException(status_code=400, detail="Failed to create user")
        
        profile = supabase_auth.get_user_profile(user.id)
        
        return {
            "user": UserResponse(**profile) if profile else None,
            "access_token": session.access_token,
            "refresh_token": session.refresh_token,
            "user_id": user.id
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to create user: {str(e)}")


@app.post("/auth/login")
async def login(credentials: UserLogin):
    try:
        user, session = supabase_auth.login_user(
            email=credentials.email,
            password=credentials.password
        )
        
        if not user or not session:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        profile = supabase_auth.get_user_profile(user.id)
        
        return {
            "user": UserResponse(**profile) if profile else None,
            "access_token": session.access_token,
            "refresh_token": session.refresh_token,
            "user_id": user.id
        }
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid credentials")


@app.get("/users/{user_id}", response_model=UserResponse)
async def get_user_profile(user_id: str):
    profile = supabase_auth.get_user_profile(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(**profile)


@app.put("/users/{user_id}", response_model=UserResponse)
async def update_user_profile(user_id: str, user_update: UserUpdate, current_user=Depends(get_current_user)):
    if user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden: You can only update your own profile")
    
    update_data = user_update.model_dump(exclude_unset=True)
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    updated_profile = supabase_auth.update_user_profile(user_id, update_data)
    if not updated_profile:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse(**updated_profile[0])


@app.get("/users/all", response_model=list[UserResponse])
async def get_all_users():
    users = supabase_auth.get_all_users()
    return [UserResponse(**user) for user in users]


if __name__ == "__main__":
<<<<<<< HEAD
<<<<<<< HEAD
    uvicorn.run("main:app", host="0.0.0.0", port=8004)
=======
>>>>>>> parent of 6ec0949 (base for users)
=======
    uvicorn.run("main:app", host="0.0.0.0", port=8001)
>>>>>>> parent of c7f4d64 (redis setup with Upstash (serverless and persistent))
=======
    uvicorn.run("main:app", host="0.0.0.0", port=8001)
>>>>>>> parent of c7f4d64 (redis setup with Upstash (serverless and persistent))
