import firebase_admin
from firebase_admin import credentials, firestore # imported firestore here too so can use "self.db = firestore.client()"
import os
import json
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv())

cred = credentials.Certificate(json.loads(os.getenv("FIREBASE_SERVICE_ACCOUNT")))
firebase_admin.initialize_app(cred)

class FirebaseService:
    def __init__(self):
        self.db = firestore.client()

    def add_message(self, chat_id: str, sender_id: str, message: str):
        self.db.collection("chat-logs") \
            .document(chat_id) \
            .collection("logs") \
            .add({
                "sender_id": sender_id,
                "message": message,
                "timestamp": firestore.SERVER_TIMESTAMP
                #server_timestamp makes it so that the time is handled on the db side so it avoids timezone issues from the client
            })

    def get_messages(self, chat_id: str):
        docs = self.db.collection("chat-logs") \
                    .document(chat_id) \
                    .collection("logs") \
                    .order_by("timestamp") \
                    .stream()
        return [doc.to_dict() for doc in docs]
        #everything before .stream is building the query then .stream executes the query

    def delete_session(self, chat_id: str):
        chat_ref = self.db.collection("chat-logs").document(chat_id)
        docs = list(chat_ref.collection("logs").stream())
        if not docs:
            return False
        for doc in docs:
            doc.reference.delete()
        chat_ref.delete()
        return True