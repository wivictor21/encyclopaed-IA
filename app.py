from flask import Flask, render_template, request, jsonify
import requests
import json
import os
from dotenv import load_dotenv
load_dotenv()

app = Flask(__name__)

OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
PEXELS_API_KEY = os.environ.get("PEXELS_API_KEY", "")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

def get_pexels_images(query, count=6):
    try:
        response = requests.get(
            "https://api.pexels.com/v1/search",
            headers={"Authorization": PEXELS_API_KEY},
            params={"query": query, "per_page": count, "orientation": "landscape"},
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            images = []
            for photo in data.get("photos", []):
                images.append({
                    "url": photo["src"]["large"],
                    "width": photo["width"],
                    "height": photo["height"]
                })
            return images
    except Exception as e:
        print(f"Pexels error: {e}")
    return [{"url": f"https://picsum.photos/1200/800?random={i}", "width": 1200, "height": 800} for i in range(count)]

def get_encyclopedia_content(topic):
    prompt = f"""Actúa como un enciclopedista experto. Genera un artículo enciclopédico completo y detallado sobre: "{topic}"

El artículo debe estar en español y seguir este formato JSON exacto:
{{
    "title": "Título del artículo",
    "subtitle": "Subtítulo descriptivo corto",
    "lead": "Párrafo introductorio largo y elegante de 3-4 oraciones que defina y contextualice el tema.",
    "sections": [
        {{
            "heading": "Título de sección",
            "content": "Contenido detallado de 3-4 párrafos con información enciclopédica rica y precisa."
        }},
        {{
            "heading": "Título de sección 2",
            "content": "Más contenido detallado."
        }},
        {{
            "heading": "Título de sección 3",
            "content": "Más contenido."
        }}
    ],
    "did_you_know": [
        "Dato curioso 1 fascinante sobre el tema",
        "Dato curioso 2 sorprendente",
        "Dato curioso 3 interesante"
    ],
    "related_topics": ["tema relacionado 1", "tema relacionado 2", "tema relacionado 3", "tema relacionado 4"],
    "image_search_terms": ["search term 1 in english", "search term 2 in english", "search term 3 in english"]
}}

Responde ÚNICAMENTE con el JSON válido, sin texto adicional, sin bloques de código markdown."""

    response = requests.post(
        OPENROUTER_URL,
        headers={
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json"
        },
        json={
            "model": "google/gemini-2.0-flash-001",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.7,
            "max_tokens": 2000
        },
        timeout=60
    )

    if response.status_code != 200:
        raise Exception(f"Error de OpenRouter API: {response.status_code} — {response.text}")

    data = response.json()
    content = data["choices"][0]["message"]["content"].strip()

    if "```" in content:
        content = content.split("```")[1]
        if content.startswith("json"):
            content = content[4:]
        content = content.split("```")[0]

    return json.loads(content.strip())


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/search", methods=["POST"])
def search():
    data = request.json
    topic = data.get("topic", "").strip()

    if not topic:
        return jsonify({"error": "Por favor ingresa un tema"}), 400

    try:
        content = get_encyclopedia_content(topic)
        search_terms = content.get("image_search_terms", [topic])

        images = []
        for term in search_terms[:3]:
            term_images = get_pexels_images(term, count=2)
            images.extend(term_images)

        if not images:
            images = get_pexels_images(topic, count=6)

        content["images"] = images
        return jsonify(content)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/article/<topic>")
def article(topic):
    return render_template("index.html", initial_topic=topic)

@app.route("/random_topic", methods=["POST"])
def random_topic():
    data = request.json
    category = data.get("category", "cultura general")
    
    response = requests.post(
        OPENROUTER_URL,
        headers={
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json"
        },
        json={
            "model": "google/gemini-2.0-flash-001",
            "messages": [{"role": "user", "content": f"Dame UN solo tema enciclopédico específico e interesante de la categoría '{category}'. Responde ÚNICAMENTE con el nombre del tema, sin explicación ni puntos."}],
            "temperature": 1.0,
            "max_tokens": 30
        },
        timeout=15
    )
    
    topic = response.json()["choices"][0]["message"]["content"].strip()
    return jsonify({"topic": topic})

@app.route("/export_pdf/<path:topic>")
def export_pdf(topic):
    from playwright.sync_api import sync_playwright
    from flask import Response

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1200, "height": 800})
        page.goto(f'http://127.0.0.1:5000/article/{topic}', 
                  wait_until='networkidle', timeout=60000)
        page.wait_for_timeout(3000)
        pdf_bytes = page.pdf(
            format='A4',
            print_background=True,
            margin={'top': '10mm', 'bottom': '10mm',
                    'left': '10mm', 'right': '10mm'}
        )
        browser.close()

    return Response(pdf_bytes,
                   mimetype='application/pdf',
                   headers={'Content-Disposition': f'attachment; filename="{topic}.pdf"'})

if __name__ == "__main__":
    app.run(debug=True, port=5000)