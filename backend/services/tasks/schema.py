from pydantic import BaseModel
from typing import Dict, Any

class SendEmailRequest(BaseModel):
    to_email: str
    template_name: str  
    dynamic_template_data: Dict[str, Any]

class SendEmailResponse(BaseModel):
    status: str
    message: str
    status_code: int
