// ============================================
// ENCYCLOPÆD-IA UNIVERSALIS — JAVASCRIPT
// ============================================

const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const loading = document.getElementById('loading');
const articleArea = document.getElementById('article-area');
const landing = document.getElementById('landing');

// ====== EVENT LISTENERS ======
searchBtn.addEventListener('click', () => {
    const topic = searchInput.value.trim();
    if (topic) doSearch(topic);
});

searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const topic = searchInput.value.trim();
        if (topic) doSearch(topic);
    }
});

// ====== MAIN SEARCH FUNCTION ======
async function doSearch(topic) {
    landing.style.display = 'none';
    articleArea.style.display = 'none';
    loading.style.display = 'block';
    window.history.pushState({}, '', `/article/${encodeURIComponent(topic)}`);
    try {
        const response = await fetch('/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic })
        });
        if (!response.ok) throw new Error('Error en la búsqueda');
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        renderArticle(data);
    } catch (err) {
        showError(err.message);
    } finally {
        loading.style.display = 'none';
    }
}

function searchTopic(topic) {
    searchInput.value = topic;
    doSearch(topic);
}

// ====== RANDOM TOPIC ======
async function searchRandom(category) {
    landing.style.display = 'none';
    articleArea.style.display = 'none';
    loading.style.display = 'block';
    try {
        const response = await fetch('/random_topic', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category })
        });
        const data = await response.json();
        searchTopic(data.topic);
    } catch (err) {
        showError(err.message);
        loading.style.display = 'none';
    }
}

// ====== RENDER ARTICLE ======
function renderArticle(data) {
    const images = data.images || [];
    const heroImg = images[0] ? images[0].url : 'https://picsum.photos/1200/800?random=0';
    const sideImg1 = images[2] ? images[2].url : 'https://picsum.photos/800/600?random=2';
    const sideImg2 = images[3] ? images[3].url : 'https://picsum.photos/800/600?random=3';
    const inlineImg1 = images[1] ? images[1].url : '';
    const fullImg = images[4] ? images[4].url : '';

    let sectionsHTML = '';
    const sections = data.sections || [];

    sections.forEach((section, idx) => {
        let imageInsert = '';
        if (idx === 0 && inlineImg1) {
            imageInsert = `
            <div class="inline-image-block float-right">
                <img src="${inlineImg1}" alt="${data.title}" loading="lazy">
                <div class="image-caption">Ilustración relacionada: ${data.title}</div>
            </div>`;
        }
        const paragraphs = section.content.split('\n')
            .filter(p => p.trim())
            .map(p => `<p>${p.trim()}</p>`)
            .join('');
        sectionsHTML += `
        <div class="article-section">
            <h3 class="section-heading">${section.heading}</h3>
            ${imageInsert}
            <div class="section-content">
                ${paragraphs || `<p>${section.content}</p>`}
            </div>
        </div>`;
        if (idx === 1) {
            sectionsHTML += `<div class="section-break">· · ·</div>`;
        }
    });

    let dykHTML = '';
    if (data.did_you_know && data.did_you_know.length > 0) {
        const items = data.did_you_know.map(fact => `<div class="dyk-item">${fact}</div>`).join('');
        dykHTML = `
        <div class="did-you-know sidebar-section">
            <div class="dyk-header">✦ ¿Sabías que...? ✦</div>
            ${items}
        </div>`;
    }

    let relatedHTML = '';
    if (data.related_topics && data.related_topics.length > 0) {
        const items = data.related_topics.map(topic =>
            `<li class="related-topic" onclick="window.open('/article/${encodeURIComponent(topic)}', '_blank')">${topic}</li>`
        ).join('');
        relatedHTML = `
        <div class="sidebar-section">
            <div class="sidebar-title">ARTÍCULOS RELACIONADOS</div>
            <ul class="related-topics">${items}</ul>
        </div>`;
    }

    let fullImageHTML = '';
    if (fullImg) {
        fullImageHTML = `
        <div class="article-full-image">
            <img src="${fullImg}" alt="${data.title}" loading="lazy"
                 onerror="this.style.display='none'; this.parentElement.style.display='none'">
        </div>
        <div class="full-image-caption">Vista panorámica — ${data.title}</div>`;
    }

    const articleHTML = `
    <div class="article-hero">
        <img class="hero-image" src="${heroImg}" alt="${data.title}" loading="eager">
        <div class="hero-overlay"></div>
        <div class="hero-content">
            <div class="hero-category">ENCYCLOPÆD-IA UNIVERSALIS</div>
            <h1 class="hero-title">${data.title}</h1>
            ${data.subtitle ? `<div class="hero-subtitle">${data.subtitle}</div>` : ''}
        </div>
    </div>
    ${fullImageHTML}
    <div class="article-body">
        <div class="article-main">
            <div class="article-lead">${data.lead || ''}</div>
            ${sectionsHTML}
            <div style="clear:both"></div>
        </div>
        <aside class="article-sidebar">
            ${dykHTML}
            <div class="sidebar-section">
                <div class="sidebar-title">GALERÍA</div>
                <div class="sidebar-gallery">
                    <img src="${sideImg1}" alt="${data.title}" loading="lazy" onerror="this.style.display='none'">
                    <img src="${sideImg2}" alt="${data.title}" loading="lazy" onerror="this.style.display='none'">
                </div>
            </div>
            ${relatedHTML}
            <div class="sidebar-section">
                <div class="sidebar-title">FUENTE</div>
                <div style="font-family:'EB Garamond',serif; font-style:italic; font-size:12px; color:var(--ink-faded); line-height:1.5">
                    Artículo generado por Inteligencia Artificial para uso educativo.
                </div>
            </div>
        </aside>
    </div>
    <div class="article-footer">
        <span class="article-footer-note">
            Encyclopæd-IA Universalis · Vol. MMXXVI · Artículo: <em>${data.title}</em>
        </span>
        <button class="back-to-search" onclick="exportPDF()">🖨 IMPRIMIR</button>
        <button class="back-to-search" onclick="resetToLanding()">← NUEVA BÚSQUEDA</button>
    </div>`;

    articleArea.innerHTML = articleHTML;
    articleArea.style.display = 'block';
    articleArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
    articleArea.querySelectorAll('img').forEach(img => {
        img.addEventListener('load', () => img.classList.add('loaded'));
    });
}

// ====== RESET TO LANDING ======
function resetToLanding() {
    articleArea.style.display = 'none';
    landing.style.display = 'block';
    searchInput.value = '';
    window.history.pushState({}, '', '/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ====== SHOW ERROR ======
function showError(msg) {
    articleArea.innerHTML = `
    <div style="padding:60px; text-align:center; background:var(--cream-light)">
        <div style="font-family:'Playfair Display',serif; font-size:24px; color:var(--ink); margin-bottom:16px">
            Error al cargar el artículo
        </div>
        <div style="font-family:'EB Garamond',serif; font-style:italic; color:var(--ink-faded); margin-bottom:24px">
            ${escapeHtml(msg)}
        </div>
        <button class="back-to-search" onclick="resetToLanding()">← VOLVER</button>
    </div>`;
    articleArea.style.display = 'block';
}

// ====== UTILS ======
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Imprimir
function exportPDF() {
    const title = document.querySelector('.hero-title');
    const topic = title ? encodeURIComponent(title.textContent.trim()) : 'articulo';
    window.open(`/export_pdf/${topic}`, '_blank');
}

// ====== INITIAL TOPIC FROM URL ======
window.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    const match = path.match(/^\/article\/(.+)$/);
    if (match) {
        const topic = decodeURIComponent(match[1]);
        searchInput.value = topic;
        doSearch(topic);
    }
});
