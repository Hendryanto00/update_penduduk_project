# app/auth/utils.py

from passlib.context import CryptContext

# Konfigurasi bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Fungsi untuk hash password
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

# Fungsi untuk verifikasi password saat login
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)
