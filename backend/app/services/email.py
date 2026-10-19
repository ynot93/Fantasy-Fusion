from __future__ import annotations
import asyncio
import logging
import smtplib
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger(__name__)


def _send_smtp(message: EmailMessage) -> None:
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as smtp:
        if settings.SMTP_STARTTLS:
            smtp.starttls()
        if settings.SMTP_USERNAME:
            smtp.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD or "")
        smtp.send_message(message)


async def send_email(to: str, subject: str, body: str) -> None:
    """Send a plain-text email. Without SMTP_HOST configured (local dev), the
    email is logged instead so flows like password reset still work end to end."""
    if not settings.SMTP_HOST:
        logger.warning("SMTP_HOST not set - email to %s not sent.\nSubject: %s\n\n%s", to, subject, body)
        return

    message = EmailMessage()
    message["From"] = settings.SMTP_FROM
    message["To"] = to
    message["Subject"] = subject
    message.set_content(body)
    try:
        # smtplib is blocking; keep it off the event loop
        await asyncio.to_thread(_send_smtp, message)
    except Exception as e:
        # Callers run this as a background task - log, don't raise into the void
        logger.error("Failed to send email to %s: %s", to, type(e).__name__)
