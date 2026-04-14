# Papo de Liderança

Projeto completo de newsletter automatizada em Python para gerar, visualizar e enviar emails profissionais sobre liderança, carreira e crescimento financeiro.

## O que vem pronto

- Geracao dinamica de newsletter com `Jinja2`
- Template HTML moderno, responsivo e com identidade em azul escuro, branco e verde
- Versão web com menu superior sticky e navegação responsiva
- Conteúdo de exemplo com 3 artigos
- Funcao para salvar preview HTML
- Funcao para envio por Gmail SMTP
- Estrutura simples para rodar no Google Colab ou localmente

## Estrutura do projeto

```text
.
|-- notebooks/
|   `-- papo_de_lideranca_colab.ipynb
|-- output/
|-- papo_de_lideranca/
|   |-- __init__.py
|   |-- content.py
|   |-- email_service.py
|   `-- generator.py
|-- templates/
|   |-- newsletter.html
|   `-- newsletter_web.html
|-- README.md
|-- requirements.txt
`-- run_demo.py
```

## Como executar localmente

### 1. Instale as dependencias

```bash
pip install -r requirements.txt
```

### 2. Gere um preview da newsletter

```bash
python run_demo.py
```

O arquivo HTML principal sera salvo em `output/papo_de_lideranca_web_preview.html`.
Também sera gerada uma versão focada em email em `output/papo_de_lideranca_email_preview.html`.

Importante:

- `templates/newsletter.html` e o template de email Jinja2
- `templates/newsletter_web.html` e a versão para navegador com menu superior sticky
- Se você abrir esse arquivo direto no navegador, vai ver `{{ ... }}` e `{% ... %}`
- O arquivo certo para visualizar o resultado final com menu superior e `output/papo_de_lideranca_web_preview.html`
- Recursos como menu sticky e hamburguer foram aplicados na versão web para preservar a compatibilidade do template de email

### 3. Personalize o conteúdo se quiser

Exemplo rápido:

```python
from papo_de_lideranca import export_newsletter_web_html, generate_newsletter_html

html = generate_newsletter_html(
    recipient_name="Marina",
    intro_message="Selecionamos ideias objetivas para sua proxima semana de crescimento."
)

path = export_newsletter_web_html(recipient_name="Marina")
print(path)
```

### 4. Envie por Gmail SMTP

Para usar Gmail com SMTP, crie uma senha de app na sua conta Google e use esse valor no envio.

```python
from papo_de_lideranca import generate_newsletter_html, send_newsletter_email

html = generate_newsletter_html(recipient_name="Marina")

send_newsletter_email(
    sender_email="seu_email@gmail.com",
    app_password="sua_senha_de_app",
    recipient_email="destinatario@exemplo.com",
    subject="Papo de Liderança | Nova edição",
    html_content=html,
)
```

## Como rodar no Google Colab

### 1. Envie os arquivos do projeto para o Colab

Você pode:

- subir a pasta do projeto compactada em `.zip`, ou
- conectar o Google Drive e apontar para a pasta onde o projeto esta salvo

### 2. Instale a dependencia

No primeiro bloco do notebook, rode:

```python
!pip install jinja2
```

### 3. Ajuste o diretorio do projeto

Se estiver usando Drive:

```python
from google.colab import drive
drive.mount('/content/drive')

%cd /content/drive/MyDrive/seu_caminho/PapoDeLideranca
```

### 4. Rode a geracao da newsletter

```python
from papo_de_lideranca import export_newsletter_html, generate_newsletter_html

html = generate_newsletter_html(recipient_name="Assinante Colab")
preview_path = export_newsletter_html(recipient_name="Assinante Colab")

print(preview_path)
display({'text/html': html}, raw=True)
```

### 5. Envie o email quando estiver pronto

```python
from papo_de_lideranca import send_newsletter_email

send_newsletter_email(
    sender_email="seu_email@gmail.com",
    app_password="sua_senha_de_app",
    recipient_email="destinatario@exemplo.com",
    subject="Papo de Liderança | Edição especial",
    html_content=html,
)
```

## Personalizacao rápida

- Troque os artigos em `papo_de_lideranca/content.py`
- Ajuste o layout em `templates/newsletter.html`
- Ajuste o menu e a versão navegador em `templates/newsletter_web.html`
- Mude o titulo da edição no parametro `edition_title`
- Altere a mensagem inicial com `intro_message`
- Para abrir uma versão pronta no navegador, use `output/papo_de_lideranca_web_preview.html`

## Observações importantes

- O Gmail exige senha de app para SMTP quando a verificacao em duas etapas esta ativada.
- O template foi pensado para funcionar bem em desktop e mobile.
- O projeto esta pronto para servir como base de uma automacao maior com agendamento ou integracao com IA.
