from pydantic import BaseModel, AwareDatetime
from typing import Optional, Literal

CATEGORY_LITERAL = Literal["Design", "Development", "Writing", "Marketing", "Other"]


class AdCreate(BaseModel):
    title: str
    description: str
    image_url: str
    link_url: str
    advertiser_id: str
    category: Optional[CATEGORY_LITERAL] = None
    is_active: bool = True
    start_date: AwareDatetime
    end_date: AwareDatetime


class AdUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    link_url: Optional[str] = None
    category: Optional[CATEGORY_LITERAL] = None
    is_active: Optional[bool] = None
    start_date: Optional[AwareDatetime] = None
    end_date: Optional[AwareDatetime] = None


class AdResponse(BaseModel):
    ad_id: str
    title: str
    description: str
    image_url: str
    link_url: str
    advertiser_id: str
    category: Optional[str] = None
    is_active: bool = True
    start_date: AwareDatetime
    end_date: AwareDatetime
    impressions: int = 0
    clicks: int = 0


class AdListResponse(BaseModel):
    ads: list[AdResponse]
