"""Geracao e exportacao da newsletter em HTML."""

from __future__ import annotations

from pathlib import Path
from typing import Iterable, Optional

from jinja2 import Environment, FileSystemLoader, select_autoescape

from .content import Article, get_issue_date, get_sample_articles

BASE_DIR = Path(__file__).resolve().parent.parent
TEMPLATES_DIR = BASE_DIR / "templates"
OUTPUT_DIR = BASE_DIR / "output"


def _build_environment() -> Environment:
    return Environment(
        loader=FileSystemLoader(TEMPLATES_DIR),
        autoescape=select_autoescape(["html", "xml"]),
        trim_blocks=True,
        lstrip_blocks=True,
    )


def generate_newsletter_html(
    recipient_name: str,
    articles: Optional[Iterable[Article]] = None,
    intro_message: Optional[str] = None,
    edition_title: str = "Papo de Liderança",
) -> str:
    """
    Gera o HTML da newsletter com conteúdo dinamico.

    Args:
        recipient_name: Nome do leitor.
        articles: Lista de artigos. Se não for enviada, usa os artigos padrao.
        intro_message: Mensagem de abertura personalizada.
        edition_title: Titulo principal da newsletter.
    """
    selected_articles = list(articles) if articles is not None else get_sample_articles()
    if not selected_articles:
        raise ValueError("A newsletter precisa de pelo menos um artigo.")

    template = _build_environment().get_template("newsletter.html")
    rendered_html = template.render(
        edition_title=edition_title,
        recipient_name=recipient_name,
        intro_message=intro_message
        or (
            "Preparamos uma edição com ideias práticas para fortalecer sua "
            "liderança, acelerar sua carreira e organizar melhor seu crescimento financeiro."
        ),
        articles=selected_articles,
        issue_date=get_issue_date(),
        primary_cta_label="Responder esta edição",
        primary_cta_url="mailto:contato@papodelideranca.com?subject=Feedback%20da%20newsletter",
        footer_message=(
            "Você esta recebendo esta newsletter porque demonstrou interesse em "
            "conteúdos sobre liderança, carreira e crescimento financeiro."
        ),
    )
    return rendered_html


def generate_newsletter_web_html(
    recipient_name: str,
    articles: Optional[Iterable[Article]] = None,
    intro_message: Optional[str] = None,
    edition_title: str = "Papo de Liderança",
) -> str:
    """Gera uma versão web da newsletter com navegação moderna."""
    selected_articles = list(articles) if articles is not None else get_sample_articles()
    if not selected_articles:
        raise ValueError("A newsletter precisa de pelo menos um artigo.")

    template = _build_environment().get_template("newsletter_web.html")
    return template.render(
        edition_title=edition_title,
        recipient_name=recipient_name,
        intro_message=intro_message
        or (
            "Preparamos uma edição com ideias práticas para fortalecer sua "
            "liderança, acelerar sua carreira e organizar melhor seu crescimento financeiro."
        ),
        articles=selected_articles,
        issue_date=get_issue_date(),
    )


def export_newsletter_html(
    recipient_name: str,
    output_path: Optional[str] = None,
    articles: Optional[Iterable[Article]] = None,
    intro_message: Optional[str] = None,
) -> Path:
    """Gera e salva uma versão HTML local para visualizacao."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    destination = Path(output_path) if output_path else OUTPUT_DIR / "papo_de_lideranca_preview.html"
    html = generate_newsletter_html(
        recipient_name=recipient_name,
        articles=articles,
        intro_message=intro_message,
    )
    destination.write_text(html, encoding="utf-8")
    return destination


def export_newsletter_web_html(
    recipient_name: str,
    output_path: Optional[str] = None,
    articles: Optional[Iterable[Article]] = None,
    intro_message: Optional[str] = None,
) -> Path:
    """Gera e salva a versão web para abrir direto no navegador."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    destination = Path(output_path) if output_path else OUTPUT_DIR / "papo_de_lideranca_preview.html"
    html = generate_newsletter_web_html(
        recipient_name=recipient_name,
        articles=articles,
        intro_message=intro_message,
    )
    destination.write_text(html, encoding="utf-8")
    return destination
