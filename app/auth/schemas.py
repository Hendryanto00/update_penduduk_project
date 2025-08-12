from pydantic import BaseModel
from typing import Optional


# ==========================
# Register & Login
# ==========================
class RegisterUser(BaseModel):
    username: str
    password: str


class LoginUser(BaseModel):
    username: str
    password: str


# ==========================
# Response untuk User (GET /me)
# ==========================
class UserResponse(BaseModel):
    id: int
    username: str
    role: str
    is_approved: bool

    class Config:
        from_attributes = True  # Jika pakai Pydantic v2
        # orm_mode = True       # Jika pakai Pydantic v1


# ==========================
# JWT Token Response
# ==========================
class Token(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None  # Opsional jika bukan saat login
    token_type: str


# ==========================
# Token Payload
# ==========================
class TokenData(BaseModel):
    username: Optional[str] = None
