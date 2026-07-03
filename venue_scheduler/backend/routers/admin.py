"""
Admin & VIP Management Router
Provides government-level controls: user management, audit logs, VIP designation.
All endpoints require VENUE_MANAGER or GOVT_SUPER_ADMIN role.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from database import get_session
from models import User, UserRole, Booking
from schemas import UserRead
from auth import get_current_user, check_admin_role
from utils.logger import log_audit_action, audit_logger
from typing import List

router = APIRouter(prefix="/admin", tags=["Admin & VIP Management"])

def require_super_admin(user: User = Depends(get_current_user)) -> User:
    """Strictly requires GOVT_SUPER_ADMIN role — not just any admin."""
    if user.role != UserRole.GOVT_SUPER_ADMIN:
        raise HTTPException(
            status_code=403,
            detail="This action requires GOVT_SUPER_ADMIN privileges"
        )
    return user

@router.get("/users", response_model=List[UserRead], summary="List all citizens (admin)")
def list_all_users(
    admin: User = Depends(check_admin_role),
    session: Session = Depends(get_session)
):
    return session.exec(select(User)).all()

@router.post("/users/{user_id}/suspend", summary="Suspend a citizen account (super admin only)")
def suspend_user(
    user_id: int,
    reason: str,
    admin: User = Depends(require_super_admin),
    session: Session = Depends(get_session)
):
    target = session.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.role == UserRole.GOVT_SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Cannot suspend a government admin account")

    target.is_suspended = True
    session.add(target)
    session.commit()

    log_audit_action(admin.id, "SUSPEND_USER", f"User ID {user_id} ({target.name}) suspended. Reason: {reason}")
    return {"message": f"User {target.name} has been suspended", "user_id": user_id}

@router.post("/users/{user_id}/unsuspend", summary="Reinstate a suspended account (super admin only)")
def unsuspend_user(
    user_id: int,
    admin: User = Depends(require_super_admin),
    session: Session = Depends(get_session)
):
    target = session.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    target.is_suspended = False
    target.fair_play_strikes = 0
    session.add(target)
    session.commit()

    log_audit_action(admin.id, "UNSUSPEND_USER", f"User ID {user_id} ({target.name}) reinstated.")
    return {"message": f"User {target.name} has been reinstated", "user_id": user_id}

@router.post("/users/{user_id}/promote-vip", summary="Grant VIP status (super admin only)")
def promote_to_vip(
    user_id: int,
    admin: User = Depends(require_super_admin),
    session: Session = Depends(get_session)
):
    target = session.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.role in [UserRole.GOVT_SUPER_ADMIN, UserRole.VENUE_MANAGER]:
        raise HTTPException(status_code=400, detail="Cannot change role of admin accounts")

    target.role = UserRole.VIP
    session.add(target)
    session.commit()

    log_audit_action(admin.id, "PROMOTE_VIP", f"User ID {user_id} ({target.name}) promoted to VIP.")
    return {"message": f"{target.name} is now a VIP user", "user_id": user_id}

@router.post("/users/{user_id}/demote-citizen", summary="Revoke VIP status (super admin only)")
def demote_to_citizen(
    user_id: int,
    admin: User = Depends(require_super_admin),
    session: Session = Depends(get_session)
):
    target = session.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.role in [UserRole.GOVT_SUPER_ADMIN, UserRole.VENUE_MANAGER]:
        raise HTTPException(status_code=400, detail="Cannot demote admin accounts")

    target.role = UserRole.CITIZEN
    session.add(target)
    session.commit()

    log_audit_action(admin.id, "DEMOTE_CITIZEN", f"User ID {user_id} ({target.name}) VIP status revoked.")
    return {"message": f"{target.name} has been set back to Citizen", "user_id": user_id}

@router.post("/users/{user_id}/clear-strikes", summary="Clear fair-play strikes (super admin only)")
def clear_strikes(
    user_id: int,
    admin: User = Depends(require_super_admin),
    session: Session = Depends(get_session)
):
    target = session.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    old_strikes = target.fair_play_strikes
    target.fair_play_strikes = 0
    target.penalty_points = 0
    session.add(target)
    session.commit()

    log_audit_action(admin.id, "CLEAR_STRIKES", f"User ID {user_id} ({target.name}) strikes cleared from {old_strikes} to 0.")
    return {"message": f"Cleared {old_strikes} strike(s) for {target.name}"}

@router.get("/audit-log", summary="View the government audit log (super admin only)")
def get_audit_log(
    admin: User = Depends(require_super_admin)
):
    try:
        with open("logs/audit.log", "r") as f:
            lines = f.readlines()
        return {"audit_entries": [line.strip() for line in lines[-200:]]}
    except FileNotFoundError:
        return {"audit_entries": [], "note": "No audit log found yet"}

@router.get("/stats", summary="System statistics (admin)")
def get_stats(
    admin: User = Depends(check_admin_role),
    session: Session = Depends(get_session)
):
    total_users = len(session.exec(select(User)).all())
    total_bookings = len(session.exec(select(Booking)).all())
    suspended_users = len(session.exec(select(User).where(User.is_suspended == True)).all())
    vip_users = len(session.exec(select(User).where(User.role == UserRole.VIP)).all())

    return {
        "total_users": total_users,
        "total_bookings": total_bookings,
        "suspended_users": suspended_users,
        "vip_users": vip_users,
    }
