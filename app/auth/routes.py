from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from datetime import datetime, timedelta

from app.database import get_db
from app.config import settings
from . import models, schemas, utils

router = APIRouter(
    prefix="/auth",
    tags=["Auth"]
)

# OAuth2 setup
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# ==========================
# JWT Utility Functions
# ==========================

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != "access":
            raise credentials_exception

        username: str = payload.get("sub")
        if not username:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        raise credentials_exception
    return user

# ==========================
# Register User
# ==========================

@router.post("/register")
def register_user(request: schemas.RegisterUser, db: Session = Depends(get_db)):
    existing_user = db.query(models.User).filter(models.User.username == request.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )

    new_user = models.User(
        username=request.username,
        hashed_password=utils.hash_password(request.password),
        role="user",
        focus_upload=request.focus_upload,
        institution=request.institution
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"message": f"User '{new_user.username}' registered successfully."}

# ==========================
# Login User 
# ==========================

@router.post("/login")
def login_user(request: schemas.LoginUser, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == request.username).first()

    # ✅ Cek apakah akun tidak ditemukan (sudah dihapus admin)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akun Anda telah dihapus oleh admin."
        )

    # ✅ Cek password benar atau tidak
    if not utils.verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Password salah"
        )

    # ✅ Generate token walaupun is_approved=False (hanya batasi akses menu di frontend)
    access_token = create_access_token(data={"sub": user.username, "role": user.role})
    refresh_token = create_refresh_token(data={"sub": user.username, "role": user.role})

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "username": user.username,
            "role": user.role,
            "is_approved": user.is_approved,
            "focus_upload": user.focus_upload,
            "institution": user.institution
        }
    }

# ==========================
# Refresh Token Endpoint
# ==========================

@router.post("/refresh-token")
def refresh_token(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate refresh token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != "refresh":
            raise credentials_exception

        username: str = payload.get("sub")
        role: str = payload.get("role")  # ✅ Ambil role
        if not username:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    new_access_token = create_access_token(data={"sub": username, "role": role})  # ✅ Sertakan role
    return {
        "access_token": new_access_token,
        "token_type": "bearer"
    }


# ==========================
# Get Current User (GET /me)
# ==========================

@router.get("/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user

# ==========================
# Approve User (Admin Only)
# ==========================

@router.put("/approve-user/{user_id}")
def approve_user(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # ⛔ Hanya admin yang boleh akses
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Anda tidak memiliki akses untuk menyetujui user."
        )

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User tidak ditemukan."
        )

    if user.is_approved:
        return {"message": f"User '{user.username}' sudah disetujui sebelumnya."}

    user.is_approved = True
    db.commit()

    return {"message": f"User '{user.username}' telah disetujui."}


# ==========================
# Lihat User Belum Disetujui
# ==========================

@router.get("/unapproved-users")
def get_unapproved_users(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # ⛔ Hanya admin boleh melihat
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Anda tidak memiliki akses."
        )

    users = db.query(models.User).filter(models.User.is_approved == False).all()

    return [
        {
            "id": user.id,
            "username": user.username,
            "role": user.role,
            "focus_upload": user.focus_upload,
            "institution": user.institution
        } for user in users
    ]

# ==========================
# Tolak (Hapus) User (Admin Only)
# ==========================

@router.delete("/reject-user/{user_id}")
def reject_user(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Anda tidak memiliki akses untuk menolak user."
        )

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User tidak ditemukan."
        )

    db.delete(user)
    db.commit()

    return {"message": f"User '{user.username}' telah ditolak dan dihapus."}
