"""Script simples para gerar preview e, opcionalmente, enviar a newsletter."""

from papo_de_lideranca import (
    export_newsletter_html,
    export_newsletter_web_html,
    generate_newsletter_html,
    send_newsletter_email,
)


def main() -> None:
    recipient_name = "Leitor(a) Premium"
    preview_path = export_newsletter_web_html(
        recipient_name=recipient_name,
        output_path="output/papo_de_lideranca_web_preview.html",
    )
    email_preview_path = export_newsletter_html(
        recipient_name=recipient_name,
        output_path="output/papo_de_lideranca_email_preview.html",
    )
    print(f"Preview web gerado em: {preview_path}")
    print(f"Preview do email gerado em: {email_preview_path}")

    should_send = False
    if should_send:
        html = generate_newsletter_html(recipient_name=recipient_name)
        send_newsletter_email(
            sender_email="seu_email@gmail.com",
            app_password="sua_senha_de_app",
            recipient_email="destinatario@exemplo.com",
            subject="Papo de Liderança | Nova edição",
            html_content=html,
        )
        print("Newsletter enviada com sucesso.")


if __name__ == "__main__":
    main()
