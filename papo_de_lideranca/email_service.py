"""Envio de newsletters por email usando Gmail SMTP."""

from __future__ import annotations

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional


def send_newsletter_email(
    sender_email: str,
    app_password: str,
    recipient_email: str,
    subject: str,
    html_content: str,
    sender_name: str = "Papo de Liderança",
    plain_text_fallback: Optional[str] = None,
) -> None:
    """
    Envia a newsletter via Gmail SMTP.

    Importante:
        Use uma senha de app do Gmail, não sua senha principal.
    """
    if not all([sender_email, app_password, recipient_email, subject, html_content]):
        raise ValueError("Todos os campos obrigatorios para envio devem ser preenchidos.")

    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = f"{sender_name} <{sender_email}>"
    message["To"] = recipient_email

    plain_text = plain_text_fallback or (
        "Sua newsletter Papo de Liderança foi gerada em HTML. "
        "Abra este email em um cliente compativel para visualizar o layout completo."
    )

    message.attach(MIMEText(plain_text, "plain", "utf-8"))
    message.attach(MIMEText(html_content, "html", "utf-8"))

    with smtplib.SMTP("smtp.gmail.com", 587) as server:
        server.starttls()
        server.login(sender_email, app_password)
        server.sendmail(sender_email, recipient_email, message.as_string())
