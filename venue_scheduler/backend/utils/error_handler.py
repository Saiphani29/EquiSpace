from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
import logging
from utils.logger import audit_logger

async def global_exception_handler(request: Request, exc: Exception):
    """
    Catch-all handler for any unhandled exceptions in the backend.
    Ensures the API never crashes and always returns a clean JSON response.
    """
    if isinstance(exc, HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
        )
    
    # Log the full error for developers to debug
    logging.error(f"Unhandled error: {str(exc)}", exc_info=True)
    
    # Log to audit file for security tracking
    audit_logger.error(f"CRITICAL_SYSTEM_ERROR | PATH: {request.url.path} | ERROR: {str(exc)}")
    
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Our engineers have been notified."},
    )
