import os
import asyncio
from fastapi import FastAPI, HTTPException
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from dotenv import load_dotenv, find_dotenv
from schema import SendEmailRequest, SendEmailResponse
import uvicorn


load_dotenv(find_dotenv(".env.twilio"))

app = FastAPI()

sendgrid_api_key = os.environ.get("SENDGRID_API_KEY")
sg_client = SendGridAPIClient(sendgrid_api_key)

sendgrid_templates = {
    "auction_end_freelancer": "d-4373f46345c94ffdb057c859549f2243",
    "auction_end_client": "d-bc2b98e66a774ce8adb5b86033151806",
    "bid_outbid_freelancer": "d-a85df2ba477b469da503d788fb48dfc2"
}


@app.get("/")
async def health_check():
    return {"status": "ok"}


@app.post("/notifications/send", response_model=SendEmailResponse)
async def send_email(request: SendEmailRequest):
    
    template_id = sendgrid_templates.get(request.template_name)
    if not template_id:
        raise HTTPException(status_code=404, detail=f"Template '{request.template_name}' not found")
    
    try:
        message = Mail(from_email="esdbidly@gmail.com", to_emails=request.to_email)
        message.template_id = template_id
        message.dynamic_template_data = request.dynamic_template_data
        
        response = await asyncio.to_thread(sg_client.send, message)
        
        return SendEmailResponse(
            status="success",
            message="Email sent successfully",
            status_code=response.status_code
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8005, reload=True)
