from fastapi import FastAPI, HTTPException
from schema import AuctionCreate, AuctionListResponse, AuctionResponse 
from supabase_service import SupabaseService
import uvicorn

app = FastAPI()
supabase = SupabaseService()


@app.get("/")
def health_check():
    return {"status": "ok"}


@app.post("/auctions", response_model=AuctionResponse, status_code=201)
def create_auction(auction: AuctionCreate):
    auction_data = auction.model_dump(mode='json')
    created_auction = supabase.create_auction(auction_data)
    if not created_auction:
        raise HTTPException(status_code=400, detail="Failed to create auction")
    return AuctionResponse(**created_auction[0])


@app.get("/auctions/task/{task_id}", response_model=AuctionListResponse)
def get_auctions_by_task(task_id: str):
    auctions = supabase.get_auctions_by_task(task_id)
    if not auctions:
        raise HTTPException(status_code=404, detail="No auctions found for this task")
    return AuctionListResponse(auctions=auctions)


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8003)