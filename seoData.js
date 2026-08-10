/* ==========================================================================
   SIZESU - Extensive SEO & Tools Catalog Database
   Contains metadata, H1s, FAQs, Guides, and Configurations for 50+ SEO pages.
   ========================================================================== */

const SIZESU_SEO_CATALOG = {
  // --- PRIORITY 1: FILE SIZE TARGET KB TOOLS ---
  'resize-image-to-20kb': {
    id: 'resize-image-to-20kb',
    category: 'Target KB',
    title: 'Resize Image to 20KB Online Free - Compress Photo & Signature to 20KB | SIZESU',
    h1: 'Resize Image to 20KB Online Free',
    metaDesc: 'Compress and resize image to exact 20KB online without losing quality. Ideal for SSC, UPSC, Govt exams, Signature & Passport photo upload portals.',
    targetKb: 20,
    unit: 'px',
    guide: [
      'Click "Select Images" or drag and drop your photo into the dropzone.',
      'The tool automatically sets the compression target to 20 KB.',
      'Adjust width or height if specific dimensions (like 3.5cm x 1.5cm) are required.',
      'Click "Download Image" to save your perfectly resized 20KB photo.'
    ],
    faqs: [
      { q: 'How can I resize an image to 20KB without blurring?', a: 'SIZESU uses smart binary canvas compression that preserves crisp facial features and text while reducing file size strictly under 20KB.' },
      { q: 'Is this tool suitable for SSC and UPSC signature upload?', a: 'Yes! Most Indian government portals require signatures under 20KB (3.5 cm x 1.5 cm). SIZESU meets exact official criteria.' }
    ]
  },

  'resize-image-to-50kb': {
    id: 'resize-image-to-50kb',
    category: 'Target KB',
    title: 'Resize Image to 50KB Online Free - Compress JPG/PNG under 50KB | SIZESU',
    h1: 'Resize Image to 50KB Online Free',
    metaDesc: 'Reduce and compress photo size under 50KB online. Perfect for online registration, college admission, exam forms, and passport photos.',
    targetKb: 50,
    unit: 'px',
    guide: [
      'Upload your image or paste from clipboard (Ctrl+V).',
      'Ensure the Target KB is set to 50 KB.',
      'Preview the live output size on the right panel.',
      'Click Download to save your 50KB image.'
    ],
    faqs: [
      { q: 'Can I compress PNG images to 50KB?', a: 'Yes, SIZESU supports JPG, PNG, WEBP, and AVIF compression to under 50KB.' }
    ]
  },

  'resize-image-to-100kb': {
    id: 'resize-image-to-100kb',
    category: 'Target KB',
    title: 'Resize Image to 100KB Online Free - Photo Compressor under 100KB | SIZESU',
    h1: 'Resize Image to 100KB Online',
    metaDesc: 'Compress photos to 100KB online for free. Instant client-side processing with zero quality loss for application portals and websites.',
    targetKb: 100,
    guide: ['Select image', 'Check 100KB preset', 'Download output image'],
    faqs: [{ q: 'Is my photo saved on any server?', a: 'No, SIZESU processes everything 100% inside your browser for complete privacy.' }]
  },

  'resize-image-to-200kb': {
    id: 'resize-image-to-200kb',
    category: 'Target KB',
    title: 'Resize Image to 200KB Online - Fast Photo Compression | SIZESU',
    h1: 'Resize Image to 200KB Online',
    metaDesc: 'Easily resize and compress images under 200KB for official application portals, PDF documents, and website uploads.',
    targetKb: 200,
    guide: ['Upload photo', 'Set target to 200KB', 'Download compressed file'],
    faqs: [{ q: 'Does it support batch compression?', a: 'Yes, you can compress multiple images to 20KB, 50KB, or 200KB simultaneously.' }]
  },

  'resize-signature-to-20kb': {
    id: 'resize-signature-to-20kb',
    category: 'Govt & Exams',
    title: 'Resize Signature to 20KB Online Free - SSC, UPSC & Bank Exam Signature Tool | SIZESU',
    h1: 'Resize Signature to 20KB for Govt Exams',
    metaDesc: 'Resize signature photo to 20KB and 3.5cm x 1.5cm dimensions online for SSC CGL, CHSL, UPSC, IBPS Bank exams & Railway recruitment.',
    targetKb: 20,
    presetWidthMm: 35,
    presetHeightMm: 15,
    guide: [
      'Upload image of your signature on white paper.',
      'Tool automatically crops and resizes to 3.5 cm x 1.5 cm and under 20 KB.',
      'Download ready-to-upload signature file.'
    ],
    faqs: [{ q: 'What is the standard dimension for SSC signature?', a: '3.5 cm width x 1.5 cm height, file size between 10 KB and 20 KB.' }]
  },

  // --- PRIORITY 2: GOVERNMENT & EXAM TOOLS ---
  'ssc-photo-resize': {
    id: 'ssc-photo-resize',
    category: 'Govt & Exams',
    title: 'SSC Photo & Signature Resizer 2026 - SSC CGL, CHSL, MTS Photo Maker | SIZESU',
    h1: 'SSC Photo & Signature Resizer (CGL / CHSL / MTS)',
    metaDesc: 'Resize photo (20KB - 50KB) and signature (10KB - 20KB) for SSC online application form according to latest Staff Selection Commission guidelines.',
    targetKb: 50,
    presetWidthMm: 35,
    presetHeightMm: 45,
    guide: [
      'Upload passport photo.',
      'Select SSC Photo option (3.5cm x 4.5cm, 20-50KB).',
      'Verify image preview meets SSC upload specifications.',
      'Download image and upload directly to ssc.gov.in.'
    ],
    faqs: [{ q: 'What are the exact SSC photo requirements?', a: 'Passport photo must be 3.5cm x 4.5cm, 20KB to 50KB, taken against a light/white background with both ears visible.' }]
  },

  'upsc-photo-resize': {
    id: 'upsc-photo-resize',
    category: 'Govt & Exams',
    title: 'UPSC Photo & Signature Converter 2026 - IAS, IPS, NDA, CDS Photo Tool | SIZESU',
    h1: 'UPSC Photo & Signature Resizer',
    metaDesc: 'Format photo and signature for UPSC Civil Services, NDA, CDS online application portal. Automatic dimension scaling & target KB converter.',
    targetKb: 300,
    presetWidthMm: 35,
    presetHeightMm: 45,
    guide: ['Upload photo/signature', 'Applies 350x350 px minimum resolution & 20-300 KB size', 'Download ready file'],
    faqs: [{ q: 'Does UPSC require name and date on photo?', a: 'Yes, UPSC guidelines recommend photo with candidate name and date of photograph.' }]
  },

  'passport-photo-maker': {
    id: 'passport-photo-maker',
    category: 'Govt & Exams',
    title: 'Free Online Passport Photo Maker & Print Sheet Generator | SIZESU',
    h1: 'Online Passport Photo Maker & 4x6" Sheet Creator',
    metaDesc: 'Make passport photos for India, US Visa (2x2 inch), UK, Schengen Europe, Canada, Australia. Replace background to white/blue and print on 4x6 sheet.',
    targetKb: 100,
    guide: [
      'Upload your portrait photo.',
      'Select country passport specification (e.g. US 2x2 inch or India 3.5x4.5 cm).',
      'Change background color to white or light grey.',
      'Click "Generate 4x6 Printable Sheet" to download grid sheet for instant printing.'
    ],
    faqs: [{ q: 'Can I print passport photos at home or CVS/Walgreens?', a: 'Yes! The 4x6 inch printable sheet contains 8 exact passport photos ready for instant printing at standard photo centers.' }]
  },

  // --- PRIORITY 4: FORMAT CONVERTERS ---
  'png-to-jpg': {
    id: 'png-to-jpg',
    category: 'Converters',
    title: 'PNG to JPG Converter Online Free - Convert PNG to JPEG | SIZESU',
    h1: 'Convert PNG to JPG Online Free',
    metaDesc: 'Convert PNG images to JPG format online in high quality. Fast, free client-side conversion with optional white background fill.',
    format: 'image/jpeg',
    guide: ['Select PNG files', 'Choose PNG to JPG converter', 'Download converted JPG image'],
    faqs: [{ q: 'Will transparency be retained in JPG?', a: 'JPG does not support transparency; SIZESU fills transparent backgrounds with clean white.' }]
  },

  'jpg-to-webp': {
    id: 'jpg-to-webp',
    category: 'Converters',
    title: 'JPG to WEBP Converter Online Free - Reduce Image Size for Web | SIZESU',
    h1: 'Convert JPG to WEBP Online Free',
    metaDesc: 'Convert JPG and JPEG images to Google WEBP format online. Shrink image file size by up to 70% with zero visual quality loss.',
    format: 'image/webp',
    guide: ['Upload JPG images', 'Select WEBP output', 'Download compressed WEBP'],
    faqs: [{ q: 'Why convert JPG to WEBP?', a: 'WEBP provides significantly smaller file sizes, faster web loading speeds, and superior Core Web Vitals performance.' }]
  },

  // --- PRIORITY 6: AI & UTILITY TOOLS ---
  'remove-background': {
    id: 'remove-background',
    category: 'AI Tools',
    title: 'Free AI Background Remover Online - Make Transparent PNG | SIZESU',
    h1: 'Remove Image Background Online Free',
    metaDesc: 'Automatically remove background from photos online. Replace background with transparent PNG, white background, or passport blue.',
    guide: ['Upload photo', 'Click Remove Background', 'Select new background color (White, Blue, Transparent)', 'Download PNG'],
    faqs: [{ q: 'Is the background remover 100% free?', a: 'Yes, completely free with unlimited high-resolution downloads.' }]
  },

  'qr-code-generator': {
    id: 'qr-code-generator',
    category: 'AI Tools',
    title: 'Free QR Code Generator Online - Custom Colors & Logo | SIZESU',
    h1: 'Free QR Code Generator Online',
    metaDesc: 'Create custom QR codes for Website URLs, Text, Wi-Fi, WhatsApp, and Emails. Customize colors and download vector PNG format.',
    guide: ['Enter text or URL', 'Customize foreground and background color', 'Download high resolution QR code PNG'],
    faqs: [{ q: 'Do generated QR codes expire?', a: 'No! SIZESU generates static QR codes that last forever with zero scan limits.' }]
  },

  'image-to-pdf': {
    id: 'image-to-pdf',
    category: 'PDF Tools',
    title: 'Convert JPG / PNG to PDF Online Free - Image to PDF Maker | SIZESU',
    h1: 'Convert Images to PDF Online Free',
    metaDesc: 'Convert JPG, PNG, and WEBP images into single or multi-page PDF documents online. Fast, secure, client-side PDF creation.',
    guide: ['Upload multiple image files', 'Arrange page order if needed', 'Click "Download PDF" to save single document'],
    faqs: [{ q: 'Can I combine multiple JPGs into one PDF?', a: 'Yes, upload all images and SIZESU will merge them into a clean, formatted PDF.' }]
  },

  'pdf-to-photo': {
    id: 'pdf-to-photo',
    category: 'PDF Tools',
    title: 'PDF to Photo Converter Online Free - Extract PDF Pages to JPG/PNG | SIZESU',
    h1: 'Convert PDF Pages to JPG & PNG Photos',
    metaDesc: 'Extract and convert PDF pages into high-resolution JPG or PNG images online. 100% free & client-side.',
    guide: ['Upload PDF document', 'Select output format (JPG or PNG) and DPI', 'Click Convert to download photos'],
    faqs: [{ q: 'Is my PDF uploaded to a server?', a: 'No, all PDF extraction happens directly inside your web browser for complete privacy.' }]
  },

  'merge-pdf': {
    id: 'merge-pdf',
    category: 'PDF Tools',
    title: 'Merge PDF Files Online Free - Combine Multiple PDFs into One | SIZESU',
    h1: 'Merge Multiple PDF Files Online',
    metaDesc: 'Combine multiple PDF documents into a single organized PDF file online for free.',
    guide: ['Select PDF files to merge', 'Review file list', 'Click Merge PDFs Now to download combined file'],
    faqs: [{ q: 'How many PDF files can I merge?', a: 'You can merge as many PDF documents as you need simultaneously.' }]
  },

  'compress-pdf': {
    id: 'compress-pdf',
    category: 'PDF Tools',
    title: 'Compress PDF to Exact KB / MB Size Online Free | SIZESU',
    h1: 'Compress & Resize PDF File Size to Target KB / MB',
    metaDesc: 'Shrink and compress PDF file size to exact 100KB, 200KB, 500KB, 1MB, or custom target size online for free.',
    guide: ['Select PDF file', 'Enter target size in KB or MB (e.g. 200 KB)', 'Click Compress PDF to download optimized document'],
    faqs: [{ q: 'Can I compress PDF to under 200KB for exam forms?', a: 'Yes, SIZESU uses smart binary canvas compression to shrink PDFs strictly under your target KB size.' }]
  }
};
