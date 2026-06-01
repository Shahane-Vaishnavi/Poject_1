from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import generativeai as genai
from dotenv import load_dotenv
from database import engine, SessionLocal
from models import User, Advocate, ClientHistory
from sqlalchemy import text
import os

load_dotenv()

genai.configure(
    api_key=os.getenv("GEMINI_API_KEY")
)

model = genai.GenerativeModel("gemini-2.5-flash")

app = FastAPI()

User.metadata.create_all(bind=engine)
Advocate.metadata.create_all(bind=engine)
ClientHistory.metadata.create_all(bind=engine)


def ensure_advocate_schema():
    with engine.connect() as conn:
        result = conn.execute(text("PRAGMA table_info(advocates)"))
        existing_columns = [row[1] for row in result.fetchall()]
        for column in ["phone", "city", "specialization", "experience", "cases_handled", "about"]:
            if column not in existing_columns:
                conn.execute(text(f"ALTER TABLE advocates ADD COLUMN {column} TEXT"))


def seed_client_history():
    db = SessionLocal()
    try:
        if db.query(ClientHistory).count() == 0:
            sample_history = [
                {
                    "advocate_id": 1,
                    "client_name": "Priya Patil",
                    "case_category": "Domestic Violence",
                    "consultation_date": "15 May 2026",
                    "status": "Closed",
                },
                {
                    "advocate_id": 1,
                    "client_name": "Neha Sharma",
                    "case_category": "Cyber Crime",
                    "consultation_date": "20 May 2026",
                    "status": "Ongoing",
                },
                {
                    "advocate_id": 1,
                    "client_name": "Anjali Deshmukh",
                    "case_category": "Divorce",
                    "consultation_date": "08 May 2026",
                    "status": "Pending",
                },
            ]
            for row in sample_history:
                db.add(ClientHistory(**row))
            db.commit()
    finally:
        db.close()


ensure_advocate_schema()
seed_client_history()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str

class UserSignup(BaseModel):
    full_name: str
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class AdvocateSignup(BaseModel):
    full_name: str
    email: str
    password: str
    bar_council_id: str


class AdvocateLogin(BaseModel):
    email: str
    password: str
    bar_council_id: str


class UserProfileUpdate(BaseModel):
    full_name: str
    email: str


class AdvocateProfileUpdate(BaseModel):
    full_name: str
    email: str
    phone: str | None = None
    city: str | None = None
    specialization: str | None = None
    experience: str | None = None
    cases_handled: str | None = None
    about: str | None = None


@app.get("/")
def home():
    return {"message": "LigalSakhi AI Backend Running"}


@app.post("/chat")
def chat(request: ChatRequest):

    prompt = f"""
    You are LigalSakhi AI.

    You help women understand:
    - Women's rights
    - Domestic violence laws
    - Cyber crime complaints
    - Workplace harassment
    - FIR process
    - Legal guidance

    User Question:
    {request.message}
    """

    response = model.generate_content(prompt)

    return {
        "reply": response.text
    }

#User Login API
@app.post("/user/signup")
def user_signup(user: UserSignup):

    db = SessionLocal()

    existing = db.query(User).filter(
        User.email == user.email
    ).first()

    if existing:
        return {"message": "Email already exists"}

    new_user = User(
        full_name=user.full_name,
        email=user.email,
        password=user.password
    )

    db.add(new_user)
    db.commit()

    return {"message": "User Registered", "user_id": new_user.id, "full_name": new_user.full_name, "email": new_user.email}

#User Login API
@app.post("/user/login")
def user_login(user: UserLogin):

    db = SessionLocal()

    existing = db.query(User).filter(
        User.email == user.email,
        User.password == user.password
    ).first()

    if not existing:
        return {"message": "Invalid Credentials"}

    return {
        "message": "Login Successful",
        "user_id": existing.id,
        "full_name": existing.full_name,
        "email": existing.email,
    }


@app.get("/user/profile/{user_id}")
def get_user_profile(user_id: int):
    db = SessionLocal()
    user = db.query(User).filter(User.id == user_id).first()
    db.close()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
    }


@app.put("/user/profile/{user_id}")
def update_user_profile(user_id: int, profile: UserProfileUpdate):
    db = SessionLocal()
    existing = db.query(User).filter(User.id == user_id).first()
    if not existing:
        db.close()
        raise HTTPException(status_code=404, detail="User not found")

    existing.full_name = profile.full_name
    existing.email = profile.email
    db.commit()
    result = {
        "id": existing.id,
        "full_name": existing.full_name,
        "email": existing.email,
    }
    db.close()
    return result


@app.get("/advocate/profile/{advocate_id}")
def get_advocate_profile(advocate_id: int):
    db = SessionLocal()
    advocate = db.query(Advocate).filter(Advocate.id == advocate_id).first()
    db.close()
    if not advocate:
        raise HTTPException(status_code=404, detail="Advocate not found")
    return {
        "id": advocate.id,
        "full_name": advocate.full_name,
        "email": advocate.email,
        "bar_council_id": advocate.bar_council_id,
        "phone": advocate.phone,
        "city": advocate.city,
        "specialization": advocate.specialization,
        "experience": advocate.experience,
        "cases_handled": advocate.cases_handled,
        "about": advocate.about,
    }


@app.put("/advocate/profile/{advocate_id}")
def update_advocate_profile(advocate_id: int, profile: AdvocateProfileUpdate):
    db = SessionLocal()
    existing = db.query(Advocate).filter(Advocate.id == advocate_id).first()
    if not existing:
        db.close()
        raise HTTPException(status_code=404, detail="Advocate not found")

    existing.full_name = profile.full_name
    existing.email = profile.email
    existing.phone = profile.phone
    existing.city = profile.city
    existing.specialization = profile.specialization
    existing.experience = profile.experience
    existing.cases_handled = profile.cases_handled
    existing.about = profile.about

    db.commit()
    result = {
        "id": existing.id,
        "full_name": existing.full_name,
        "email": existing.email,
        "bar_council_id": existing.bar_council_id,
        "phone": existing.phone,
        "city": existing.city,
        "specialization": existing.specialization,
        "experience": existing.experience,
        "cases_handled": existing.cases_handled,
        "about": existing.about,
    }
    db.close()
    return result


@app.get("/advocate/clients/{advocate_id}")
def get_advocate_clients(advocate_id: int, status: str = None, search: str = None):
    db = SessionLocal()
    query = db.query(ClientHistory).filter(ClientHistory.advocate_id == advocate_id)
    if status and status.lower() != "all":
        query = query.filter(ClientHistory.status == status)
    if search:
        search_value = f"%{search}%"
        query = query.filter(
            ClientHistory.client_name.like(search_value) |
            ClientHistory.case_category.like(search_value)
        )
    records = query.order_by(ClientHistory.consultation_date.desc()).all()
    db.close()
    return {"clients": [
        {
            "id": record.id,
            "client_name": record.client_name,
            "case_category": record.case_category,
            "consultation_date": record.consultation_date,
            "status": record.status,
        }
        for record in records
    ]}

#Advocate Signup API
@app.post("/advocate/signup")
def advocate_signup(advocate: AdvocateSignup):

    db = SessionLocal()

    existing = db.query(Advocate).filter(
        Advocate.email == advocate.email
    ).first()

    if existing:
        return {"message": "Email already exists"}

    new_advocate = Advocate(
        full_name=advocate.full_name,
        email=advocate.email,
        password=advocate.password,
        bar_council_id=advocate.bar_council_id
    )

    db.add(new_advocate)
    db.commit()

    return {
        "message": "Advocate Registered",
        "advocate_id": new_advocate.id,
        "full_name": new_advocate.full_name,
        "email": new_advocate.email,
        "bar_council_id": new_advocate.bar_council_id,
    }

#Advocate Login API
@app.post("/advocate/login")
def advocate_login(advocate: AdvocateLogin):

    db = SessionLocal()

    existing = db.query(Advocate).filter(
        Advocate.email == advocate.email,
        Advocate.password == advocate.password,
        Advocate.bar_council_id == advocate.bar_council_id
    ).first()

    if not existing:
        return {"message": "Invalid Credentials"}

    return {
        "message": "Login Successful",
        "advocate_id": existing.id,
        "full_name": existing.full_name,
        "email": existing.email,
        "bar_council_id": existing.bar_council_id,
        "phone": existing.phone,
        "city": existing.city,
        "specialization": existing.specialization,
        "experience": existing.experience,
        "cases_handled": existing.cases_handled,
        "about": existing.about,
    }