import logging
import os
from datetime import datetime

# Setup audit logger
# This logs to a file that can be monitored for security audits
LOG_DIR = "logs"
if not os.path.exists(LOG_DIR):
    os.makedirs(LOG_DIR)

audit_logger = logging.getLogger("audit_logger")
audit_logger.setLevel(logging.INFO)

# Create a file handler
file_handler = logging.FileHandler(os.path.join(LOG_DIR, "audit.log"))
formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
file_handler.setFormatter(formatter)

audit_logger.addHandler(file_handler)

def log_audit_action(user_id: int, action: str, details: str):
    """
    Logs a high-privilege action to the audit log.
    Example: log_audit_action(1, "GOVT_OVERRIDE", "Booking ID 123 overridden for Reason: Election")
    """
    timestamp = datetime.utcnow().isoformat()
    message = f"USER_ID: {user_id} | ACTION: {action} | DETAILS: {details}"
    audit_logger.info(message)
