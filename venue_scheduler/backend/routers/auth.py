from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select
from database import get_session
from models import User
from schemas import UserCreate, UserRead, Token
from auth import get_password_hash, verify_password, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES, get_current_user
from utils.limiter import limiter
from datetime import timedelta

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserRead, summary="Register a new citizen account")
def register_user(user_in: UserCreate, session: Session = Depends(get_session)):
    if session.exec(select(User).where(User.phone_number == user_in.phone_number)).first():
        raise HTTPException(status_code=400, detail="Phone number already registered")

    new_user = User(
        name=user_in.name,
        phone_number=user_in.phone_number,
        password_hash=get_password_hash(user_in.password)
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    return new_user

@router.post("/login", response_model=Token, summary="Login with phone number and password")
@limiter.limit("10/minute")
def login_for_access_token(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session)
):
    user = session.exec(select(User).where(User.phone_number == form_data.username)).first()

    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect phone number or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.is_suspended:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is suspended due to fair-play violations. Contact the municipal office."
        )

    access_token = create_access_token(
        data={"sub": user.phone_number},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserRead, summary="Get current user profile")
def get_me(user: User = Depends(get_current_user)):
    return user
