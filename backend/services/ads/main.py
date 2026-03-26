from fastapi import FastAPI, HTTPException
from schema import AdCreate, AdUpdate, AdResponse, AdListResponse
from supabase_service import SupabaseService
import uvicorn

app = FastAPI()
supabase = SupabaseService()


@app.get("/")
async def health_check():
    return {"status": "ok"}


@app.get("/ads", response_model=AdListResponse)
def get_ads():
    ads = supabase.get_active_ads()
    if not ads:
        return AdListResponse(ads=[])
    return AdListResponse(ads=ads)


@app.get("/ads/all", response_model=AdListResponse)
def get_all_ads():
    """Admin endpoint: get all ads including inactive."""
    ads = supabase.get_ads()
    if not ads:
        return AdListResponse(ads=[])
    return AdListResponse(ads=ads)


@app.get("/ads/{ad_id}", response_model=AdResponse)
def get_ad(ad_id: str):
    ad = supabase.get_ad(ad_id)
    if not ad:
        raise HTTPException(status_code=404, detail="Ad not found")
    return AdResponse(**ad[0])


@app.post("/ads", response_model=AdResponse, status_code=201)
def create_ad(ad: AdCreate):
    ad_data = ad.model_dump(mode='json')
    created_ad = supabase.create_ad(ad_data)
    if not created_ad:
        raise HTTPException(status_code=400, detail="Failed to create ad")
    return AdResponse(**created_ad[0])


@app.put("/ads/{ad_id}", response_model=AdResponse)
def update_ad(ad_id: str, ad: AdUpdate):
    ad_data = ad.model_dump(mode='json', exclude_unset=True)
    updated_ad = supabase.update_ad(ad_id, ad_data)
    if not updated_ad:
        raise HTTPException(status_code=404, detail="Ad not found")
    return AdResponse(**updated_ad[0])


@app.delete("/ads/{ad_id}")
def delete_ad(ad_id: str):
    deleted_ad = supabase.delete_ad(ad_id)
    if not deleted_ad:
        raise HTTPException(status_code=404, detail="Ad not found")
    return {"message": "Ad deleted successfully"}


@app.post("/ads/{ad_id}/impression")
def track_impression(ad_id: str):
    try:
        supabase.increment_impressions(ad_id)
        return {"status": "ok"}
    except Exception:
        raise HTTPException(status_code=404, detail="Ad not found")


@app.post("/ads/{ad_id}/click")
def track_click(ad_id: str):
    try:
        supabase.increment_clicks(ad_id)
        return {"status": "ok"}
    except Exception:
        raise HTTPException(status_code=404, detail="Ad not found")


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8060)
