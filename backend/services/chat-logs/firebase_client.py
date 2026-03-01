import firebase_admin
from firebase_admin import credentials

cred = credentials.Certificate("../../../serviceAccountKey.json")
firebase_admin.initialize_app(cred)

class FirebaseService:
    def __init__(self):
        self.db = firebase_admin.firestore.client()

    