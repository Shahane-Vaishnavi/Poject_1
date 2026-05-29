from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
from dotenv import load_dotenv
import os

load_dotenv()

genai.configure(
    api_key=os.getenv("GEMINI_API_KEY")
)

model = genai.GenerativeModel("gemini-2.5-flash")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str


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
