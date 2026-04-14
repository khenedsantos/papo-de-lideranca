"""Conteúdo base da newsletter Papo de Liderança."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import List


@dataclass(frozen=True)
class Article:
    """Representa um artigo exibido na newsletter."""

    title: str
    category: str
    summary: str
    takeaways: list[str]
    read_time: str


def get_sample_articles() -> List[Article]:
    """Retorna tres artigos de exemplo sobre liderança e crescimento."""
    return [
        Article(
            title="Liderança que inspira resultado sem microgerenciar",
            category="Liderança",
            summary=(
                "Equipes performam melhor quando existe clareza de metas, autonomia "
                "na execucao e rituais consistentes de acompanhamento. O líder "
                "deixa de ser gargalo e passa a ser acelerador."
            ),
            takeaways=[
                "Defina entregas com contexto, prazo e criterio de sucesso.",
                "Substitua controle excessivo por checkpoints objetivos.",
                "Use feedback curto e frequente para manter o ritmo da equipe.",
            ],
            read_time="4 min",
        ),
        Article(
            title="Como construir uma carreira de alta relevancia no mercado",
            category="Carreira",
            summary=(
                "Profissionais mais valorizados costumam combinar repertorio tecnico, "
                "boa comunicacao e capacidade de resolver problemas que impactam o negocio. "
                "A reputacao se fortalece quando seu trabalho fica visivel."
            ),
            takeaways=[
                "Transforme entregas em casos concretos de impacto.",
                "Aprenda a comunicar valor para diferentes stakeholders.",
                "Atualize habilidades com foco em oportunidades reais do mercado.",
            ],
            read_time="5 min",
        ),
        Article(
            title="Mentalidade financeira para crescer sem perder consistência",
            category="Crescimento Financeiro",
            summary=(
                "Crescimento financeiro sustentavel depende menos de atalhos e mais de "
                "disciplina, capacidade de priorizacao e visão de longo prazo. "
                "Ganhar mais e reter melhor são movimentos complementares."
            ),
            takeaways=[
                "Crie metas financeiras conectadas ao seu plano de carreira.",
                "Organize uma reserva de seguranca antes de aumentar risco.",
                "Invista em conhecimento que amplie renda e poder de decisão.",
            ],
            read_time="4 min",
        ),
    ]


def get_issue_date() -> str:
    """Formata a data da edição em portugues."""
    months = {
        1: "janeiro",
        2: "fevereiro",
        3: "marco",
        4: "abril",
        5: "maio",
        6: "junho",
        7: "julho",
        8: "agosto",
        9: "setembro",
        10: "outubro",
        11: "novembro",
        12: "dezembro",
    }
    today = datetime.now()
    return f"{today.day} de {months[today.month]} de {today.year}"
