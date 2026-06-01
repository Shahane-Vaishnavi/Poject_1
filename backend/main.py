from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import generativeai as genai
from dotenv import load_dotenv
from database import engine, SessionLocal
from models import User, Advocate
import os

load_dotenv()

genai.configure(
    api_key=os.getenv("GEMINI_API_KEY")
)

model = genai.GenerativeModel("gemini-2.5-flash")

app = FastAPI()

User.metadata.create_all(bind=engine)
Advocate.metadata.create_all(bind=engine)

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

    return {"message": "User Registered"}

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
        "user_id": existing.id
    }

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

    return {"message": "Advocate Registered"}

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
        "advocate_id": existing.id
    }