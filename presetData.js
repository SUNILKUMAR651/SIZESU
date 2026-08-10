/* ==========================================================================
   SIZESU - Presets Database
   Contains standard dimensions, passport/visa specs, and social media platforms
   ========================================================================== */

const SIZESU_PRESETS = {
  passport: [
    { id: 'in_passport', name: 'India Passport / Exam / Gate', widthMm: 35, heightMm: 45, dpi: 300, maxKb: 50, bg: 'white', desc: '3.5 cm x 4.5 cm (Passport, SSC, UPSC, GATE)' },
    { id: 'us_passport', name: 'US Visa / Passport', widthMm: 51, heightMm: 51, dpi: 300, maxKb: 240, bg: 'white', desc: '2 x 2 inches (51mm x 51mm)' },
    { id: 'uk_passport', name: 'UK Passport / Visa', widthMm: 35, heightMm: 45, dpi: 300, maxKb: 100, bg: 'lightgrey', desc: '35 mm x 45 mm (Cream or light grey background)' },
    { id: 'schengen_visa', name: 'Schengen Europe Visa', widthMm: 35, heightMm: 45, dpi: 300, maxKb: 200, bg: 'white', desc: '35 mm x 45 mm Europe Schengen specs' },
    { id: 'ca_passport', name: 'Canada Visa / Passport', widthMm: 50, heightMm: 70, dpi: 300, maxKb: 300, bg: 'white', desc: '50 mm x 70 mm Canada specs' },
    { id: 'au_passport', name: 'Australia Passport', widthMm: 35, heightMm: 45, dpi: 300, maxKb: 150, bg: 'white', desc: '35 mm x 45 mm Australia specs' },
    { id: 'sg_passport', name: 'Singapore Passport', widthMm: 35, heightMm: 45, dpi: 300, maxKb: 100, bg: 'white', desc: '35 mm x 45 mm Singapore specs' },
    { id: 'cn_passport', name: 'China Visa / Passport', widthMm: 33, heightMm: 48, dpi: 300, maxKb: 200, bg: 'white', desc: '33 mm x 48 mm China specs' },
    { id: 'in_signature', name: 'India Govt Signature Format', widthMm: 35, heightMm: 15, dpi: 300, maxKb: 20, bg: 'white', desc: '3.5 cm x 1.5 cm (Signature under 20 KB)' }
  ],

  social: [
    { id: 'ig_post_sq', category: 'Instagram', name: 'Square Post (1:1)', width: 1080, height: 1080 },
    { id: 'ig_post_port', category: 'Instagram', name: 'Portrait Post (4:5)', width: 1080, height: 1350 },
    { id: 'ig_story', category: 'Instagram', name: 'Story / Reel (9:16)', width: 1080, height: 1920 },
    { id: 'yt_thumb', category: 'YouTube', name: 'Video Thumbnail (16:9)', width: 1280, height: 720 },
    { id: 'yt_banner', category: 'YouTube', name: 'Channel Banner', width: 2560, height: 1440 },
    { id: 'fb_cover', category: 'Facebook', name: 'Cover Photo', width: 820, height: 312 },
    { id: 'fb_post', category: 'Facebook', name: 'Shared Post', width: 1200, height: 630 },
    { id: 'li_banner', category: 'LinkedIn', name: 'Profile Banner', width: 1584, height: 396 },
    { id: 'li_post', category: 'LinkedIn', name: 'Feed Image', width: 1200, height: 627 },
    { id: 'tw_header', category: 'Twitter / X', name: 'Header Banner', width: 1500, height: 500 },
    { id: 'tw_post', category: 'Twitter / X', name: 'In-Stream Photo', width: 1200, height: 675 },
    { id: 'wa_dp', category: 'WhatsApp', name: 'Profile DP', width: 500, height: 500 },
    { id: 'tt_video', category: 'TikTok', name: 'Video Cover (9:16)', width: 1080, height: 1920 }
  ],

  aspectRatios: [
    { label: 'Freeform', ratio: null },
    { label: '1:1 Square', ratio: 1 },
    { label: '4:3 Standard', ratio: 4/3 },
    { label: '16:9 Widescreen', ratio: 16/9 },
    { label: '9:16 Portrait', ratio: 9/16 },
    { label: '3:2 Camera', ratio: 3/2 },
    { label: '3.5:4.5 Passport', ratio: 3.5/4.5 }
  ]
};

// Unit Conversion Utilities
function mmToPx(mm, dpi = 300) {
  return Math.round((mm / 25.4) * dpi);
}

function cmToPx(cm, dpi = 300) {
  return Math.round((cm / 2.54) * dpi);
}

function inchToPx(inch, dpi = 300) {
  return Math.round(inch * dpi);
}

function pxToMm(px, dpi = 300) {
  return ((px / dpi) * 25.4).toFixed(1);
}

function pxToCm(px, dpi = 300) {
  return ((px / dpi) * 2.54).toFixed(2);
}

function pxToInch(px, dpi = 300) {
  return (px / dpi).toFixed(2);
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
