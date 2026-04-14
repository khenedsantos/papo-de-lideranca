"""Projeto de newsletter automatizada Papo de Liderança."""

from .content import get_sample_articles
from .email_service import send_newsletter_email
from .generator import (
    export_newsletter_html,
    export_newsletter_web_html,
    generate_newsletter_html,
    generate_newsletter_web_html,
)

__all__ = [
    "export_newsletter_html",
    "export_newsletter_web_html",
    "generate_newsletter_html",
    "generate_newsletter_web_html",
    "get_sample_articles",
    "send_newsletter_email",
]
