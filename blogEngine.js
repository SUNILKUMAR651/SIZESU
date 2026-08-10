/* ==========================================================================
   SIZESU - SEO Blog & Educational Articles Engine
   Renders high-intent blog posts for organic search queries.
   ========================================================================== */

const SIZESU_BLOG_ARTICLES = [
  {
    id: 'how-to-resize-image-to-20kb-for-ssc-upsc',
    title: 'How to Resize Image & Signature to 20KB for SSC, UPSC & Bank Exams (2026 Guide)',
    slug: 'how-to-resize-image-to-20kb-for-ssc-upsc',
    date: '2026-08-07',
    author: 'SIZESU Editorial Team',
    category: 'Government Exams',
    readTime: '4 min read',
    excerpt: 'Step-by-step tutorial on compressing photos and signatures under 20KB and 50KB for online government job applications without rejection.',
    content: `
      <h2>Why Do Government Portals Require Photos Under 20KB or 50KB?</h2>
      <p>Most official exam portals like Staff Selection Commission (SSC), UPSC, IBPS, Railways (RRB), and State Public Service Commissions process millions of applicant forms simultaneously. To prevent server crashes and database bloating, strictly enforced file size limits (usually 20 KB for signatures and 50 KB for passport photographs) are mandated.</p>

      <h2>Exact Specifications Table for Major Exams</h2>
      <table style="width:100%; border-collapse:collapse; margin: 1.5rem 0;">
        <thead>
          <tr style="background:var(--bg-surface-elevated); border-bottom: 2px solid var(--border-color);">
            <th style="padding:0.75rem; text-align:left;">Exam Portal</th>
            <th style="padding:0.75rem; text-align:left;">Photo Dimensions</th>
            <th style="padding:0.75rem; text-align:left;">Photo Size Limit</th>
            <th style="padding:0.75rem; text-align:left;">Signature Size Limit</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding:0.75rem; border-bottom:1px solid var(--border-color);">SSC CGL / CHSL / MTS</td>
            <td style="padding:0.75rem; border-bottom:1px solid var(--border-color);">3.5 cm x 4.5 cm</td>
            <td style="padding:0.75rem; border-bottom:1px solid var(--border-color);">20 KB to 50 KB</td>
            <td style="padding:0.75rem; border-bottom:1px solid var(--border-color);">10 KB to 20 KB</td>
          </tr>
          <tr>
            <td style="padding:0.75rem; border-bottom:1px solid var(--border-color);">UPSC Civil Services</td>
            <td style="padding:0.75rem; border-bottom:1px solid var(--border-color);">3.5 cm x 4.5 cm</td>
            <td style="padding:0.75rem; border-bottom:1px solid var(--border-color);">20 KB to 300 KB</td>
            <td style="padding:0.75rem; border-bottom:1px solid var(--border-color);">20 KB to 300 KB</td>
          </tr>
          <tr>
            <td style="padding:0.75rem; border-bottom:1px solid var(--border-color);">IBPS Bank PO / Clerk</td>
            <td style="padding:0.75rem; border-bottom:1px solid var(--border-color);">4.5 cm x 3.5 cm</td>
            <td style="padding:0.75rem; border-bottom:1px solid var(--border-color);">20 KB to 50 KB</td>
            <td style="padding:0.75rem; border-bottom:1px solid var(--border-color);">10 KB to 20 KB</td>
          </tr>
        </tbody>
      </table>

      <h2>How to Resize Photo & Signature using SIZESU in 3 Easy Steps</h2>
      <ol style="margin-left: 1.5rem; line-height: 1.8;">
        <li>Open <a href="#tool/resize-signature-to-20kb" style="color:var(--primary-500);">SIZESU Signature Resizer to 20KB</a>.</li>
        <li>Upload your scanned signature or mobile camera photograph.</li>
        <li>Click <strong>Download Image</strong>. SIZESU's binary search canvas solver compresses the image strictly under 20KB with zero text blurring.</li>
      </ol>
    `
  },

  {
    id: 'passport-photo-size-guide-us-india-uk-schengen',
    title: 'Complete Passport Photo Size Guide 2026 (US 2x2", India 3.5x4.5cm, UK, Schengen)',
    slug: 'passport-photo-size-guide-us-india-uk-schengen',
    date: '2026-08-06',
    author: 'SIZESU Editorial Team',
    category: 'Passport & Visa Guides',
    readTime: '5 min read',
    excerpt: 'Detailed dimension specs, background color standards, and head alignment rules for US, India, UK, Schengen Europe, and Canada visa applications.',
    content: `
      <h2>Global Passport Photo Standard Sizes</h2>
      <p>Different passport authorities enforce unique millimeter, centimeter, and pixel resolution standards. Below is the quick reference guide for international travel documents:</p>
      <ul>
        <li><strong>United States Visa / Passport:</strong> 2 x 2 inches (51 mm x 51 mm), minimum 600x600 px at 300 DPI, plain white background.</li>
        <li><strong>India Passport & OCI:</strong> 3.5 cm x 4.5 cm (35 mm x 45 mm), white background, both ears visible.</li>
        <li><strong>Schengen Europe Visa:</strong> 35 mm x 45 mm, light grey or white background, face covering 70-80% of photo.</li>
      </ul>
      <p>Use <a href="#tool/passport-photo-maker" style="color:var(--primary-500);">SIZESU Passport Photo Maker</a> to automatically crop, change background color, and generate 4x6" printable sheets.</p>
    `
  }
];

// Render blog article cards into the #blogGrid section
function renderBlogGrid() {
  const grid = document.getElementById('blogGrid');
  if (!grid || !Array.isArray(SIZESU_BLOG_ARTICLES)) return;

  grid.innerHTML = '';
  SIZESU_BLOG_ARTICLES.forEach(article => {
    const card = document.createElement('a');
    card.href = `#blog/${article.slug}`;
    card.style.cssText = 'text-decoration:none; color:inherit; display:block;';
    card.className = 'feature-card';
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.6rem;">
        <span style="font-size:0.72rem; font-weight:600; text-transform:uppercase; letter-spacing:0.06em; color:var(--primary-500); background:rgba(99,102,241,0.12); padding:0.2rem 0.6rem; border-radius:99px;">${article.category}</span>
        <span style="font-size:0.75rem; color:var(--text-muted);">${article.readTime}</span>
      </div>
      <h3 style="font-size:1rem; font-weight:700; line-height:1.4; margin-bottom:0.5rem;">${article.title}</h3>
      <p style="font-size:0.85rem; color:var(--text-muted); line-height:1.6; margin-bottom:0.75rem;">${article.excerpt}</p>
      <div style="font-size:0.78rem; color:var(--text-subtle);">${article.author} &middot; ${article.date}</div>
    `;
    grid.appendChild(card);
  });
}

document.addEventListener('DOMContentLoaded', renderBlogGrid);
