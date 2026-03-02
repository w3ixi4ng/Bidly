from fastapi import FastAPI, HTTPException
from schema import  BidCurrentResponse, BidResponse, BidListResponse, BidCreate, AuctionCreate
from supabase_service import SupabaseService
from redis_service import RedisService
import uvicorn

app = FastAPI()
supabase = SupabaseService()
redis_service = RedisService()


@app.get("/")
def health_check():
    return {"status": "ok"}


@app.post("/bids/auction", status_code=201)
def create_auction(auction_data: AuctionCreate):
    try:
        redis_service.create_auction(auction_data.task_id, auction_data.auction_end_time.timestamp(), auction_data.starting_bid)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"{str(e)}")
    return {"message": "Auction created successfully"}


@app.post("/bids", response_model=BidResponse, status_code=201)
def create_bid(bid: BidCreate):
    try:
        redis_service.place_bid(bid.task_id, bid.bidder_id, bid.bid_amount, bid.timestamp.timestamp())
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"{str(e)}")
    
    bid_data = bid.model_dump(mode='json')
    created_bid = supabase.create_bid(bid_data)
    if not created_bid:
        raise HTTPException(status_code=400, detail="Failed to create bid")
    return BidResponse(**created_bid[0])


@app.get("/bids/current/{task_id}")
def get_current_bid(task_id: str):
    try:
        current_bid = redis_service.get_current_bid(task_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"{str(e)}")
    if not current_bid["bid_amount"]:
        raise HTTPException(status_code=404, detail="No bids found for this task")
    return BidCurrentResponse(**current_bid)


@app.get("/bids/task/{task_id}", response_model=BidListResponse)
def get_bids_by_task(task_id: str):
    bids = supabase.get_bids_by_task(task_id)
    if not bids:
        raise HTTPException(status_code=404, detail="No bids found for this task")
    return BidListResponse(bids=bids)


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8003)