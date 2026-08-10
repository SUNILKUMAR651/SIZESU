/* ==========================================================================
   SIZESU - Dynamic SPA SEO Router & Structured Data Engine
   Handles URL routing, head tag updates, JSON-LD schemas, search modal,
   favorite tool bookmarking, and sitemap generation.
   ========================================================================== */

class SEORouter {
  constructor() {
    this.currentToolId = 'resize-image-to-50kb';
    this.favorites = JSON.parse(localStorage.getItem('sizesu_favs') || '[]');
    this.recentHistory = JSON.parse(localStorage.getItem('sizesu_history') || '[]');
  }

  init() {
    window.addEventListener('hashchange', () => this.handleRoute());
    this.handleRoute();
    this.bindSearchModal();
  }

  handleRoute() {
    const hash = window.location.hash.replace('#', '');

    if (!hash || hash === '' || hash === 'tools') {
      // Default: load initial tool page so FAQ & related tools are populated
      this.loadToolPage(this.currentToolId);
      return;
    }

    if (hash.startsWith('tool/')) {
      const toolId = hash.replace('tool/', '');
      this.loadToolPage(toolId);
    } else if (hash.startsWith('blog/')) {
      const slug = hash.replace('blog/', '');
      this.loadBlogArticle(slug);
    } else if (hash === 'faq' || hash === 'blog') {
      // Smooth scroll to section, keep current tool loaded
      const el = document.getElementById(hash);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else if (hash === 'admin') {
      this.showAdminModal();
    }
  }

  loadToolPage(toolId) {
    const config = SIZESU_SEO_CATALOG[toolId] || SIZESU_SEO_CATALOG['resize-image-to-50kb'];
    this.currentToolId = config.id;

    // 1. Update Document Head Metadata
    document.title = config.title;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', config.metaDesc);

    // 2. Update H1 and Breadcrumbs
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle) {
      heroTitle.innerHTML = `${config.h1} <span class="hero-gradient-text">Fast & Private</span>`;
    }

    const heroSub = document.querySelector('.hero-subtitle');
    if (heroSub) {
      heroSub.textContent = config.metaDesc;
    }

    // 3. Inject JSON-LD Structured Data Schema for Google Search
    this.injectJSONLDSchema(config);

    // 5. Update FAQ Accordion Section
    this.renderFAQS(config.faqs);

    // 6. Update Related Tools Links
    this.renderRelatedTools(config.category);

    // 7. Dispatch custom event to update active UI tab and options
    window.dispatchEvent(new CustomEvent('toolRouteChanged', { detail: config }));

    // Scroll smoothly to dropzone
    const dropzone = document.getElementById('dropzone');
    if (dropzone) dropzone.scrollIntoView({ behavior: 'smooth' });
  }

  injectJSONLDSchema(config) {
    const existing = document.getElementById('jsonld-schema');
    if (existing) existing.remove();

    const schema = {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": config.h1,
      "url": `https://sizesu.app/#tool/${config.id}`,
      "description": config.metaDesc,
      "applicationCategory": "MultimediaApplication",
      "operatingSystem": "All",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      }
    };

    const script = document.createElement('script');
    script.id = 'jsonld-schema';
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schema);
    document.head.appendChild(script);
  }

  renderFAQS(faqs = []) {
    const faqContainer = document.getElementById('faqContainer');
    if (!faqContainer) return;

    faqContainer.innerHTML = '';
    faqs.forEach(item => {
      const card = document.createElement('div');
      card.className = 'feature-card';
      card.style.padding = '1.25rem';
      card.style.marginBottom = '0.75rem';
      card.innerHTML = `
        <h4 style="font-size:1.05rem; font-weight:700; margin-bottom:0.4rem; color:var(--primary-500);">Q: ${item.q}</h4>
        <p style="font-size:0.9rem; color:var(--text-muted);">${item.a}</p>
      `;
      faqContainer.appendChild(card);
    });
  }

  renderRelatedTools(currentCategory) {
    const relatedContainer = document.getElementById('relatedToolsContainer');
    if (!relatedContainer) return;

    relatedContainer.innerHTML = '';
    Object.values(SIZESU_SEO_CATALOG)
      .filter(t => t.id !== this.currentToolId)
      .slice(0, 8)
      .forEach(tool => {
        const a = document.createElement('a');
        a.href = `#tool/${tool.id}`;
        a.className = 'badge-item';
        a.style.textDecoration = 'none';
        a.style.color = 'var(--text-main)';
        a.textContent = tool.h1;
        relatedContainer.appendChild(a);
      });
  }

  bindSearchModal() {
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        this.toggleSearchModal();
      } else if (e.key === 'Escape') {
        // Close search modal on Escape key
        const modal = document.getElementById('searchModal');
        if (modal && modal.style.display === 'flex') {
          modal.style.display = 'none';
        }
      }
    });
  }

  toggleSearchModal() {
    const modal = document.getElementById('searchModal');
    if (modal) {
      modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
      if (modal.style.display === 'flex') {
        const input = document.getElementById('searchInput');
        if (input) input.focus();
      }
    }
  }

  showAdminModal() {
    const modal = document.getElementById('adminModal');
    if (modal) modal.style.display = 'flex';
  }
}
