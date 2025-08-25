from pydantic import BaseModel
from typing import Optional


# ==========================
# Register & Login
# ==========================
class RegisterUser(BaseModel):
    username: str
    password: str
    focus_upload: str = "penduduk"
    institution: Optional[str] = None


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
    focus_upload: str
    institution: Optional[str] = None

    class Config:
        from_attributes = True  
        # orm_mode = True       


# ==========================
# JWT Token Response
# ==========================
class Token(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None  
    token_type: str


# ==========================
# Token Payload
# ==========================
class TokenData(BaseModel):
    username: Optional[str] = None
