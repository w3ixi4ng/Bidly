from pydantic import BaseModel, AwareDatetime
from typing import Literal

CATEGORY_LITERAL = Literal["Design", "Development", "Writing", "Marketing", "Other"]


class CreateTaskRequest(BaseModel):
    title: str
    description: str
    requirements: list[str] = []
    category: CATEGORY_LITERAL = "Other"
    client_id: str
    payment_id: str
    payment_intent_id: str
    starting_bid: float
    auction_start_time: AwareDatetime
    auction_end_time: AwareDatetime
    is_featured: bool = False