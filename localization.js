const translations = {
  en: {
    canvas: "Canvas",
    byHeart: "by Heart",
    collectionBy: "Exclusive Art Collection by",
    tagline: "Original impressionistic masterpieces that transform spaces and capture hearts",
    viewCollection: "View Collection",
    inquireNow: "Inquire Now",
    selectedWorks: "Featured Masterpieces",
    reachOut: "Acquire Art",
    getInTouch: "Connect with the Artist",
    contactDesc: "Interested in acquiring original artwork or commissioning a custom piece? Let's create something beautiful together."
  },
  id: {
    canvas: "Kanvas",
    byHeart: "dari Hati",
    collectionBy: "Koleksi Seni Eksklusif oleh",
    tagline: "Karya seni impresionis asli yang mengubah ruang dan menyentuh hati",
    viewCollection: "Lihat Koleksi",
    inquireNow: "Tanyakan Sekarang",
    selectedWorks: "Karya Unggulan",
    reachOut: "Dapatkan Karya Seni",
    getInTouch: "Hubungi Seniman",
    contactDesc: "Tertarik untuk memiliki karya seni asli atau memesan karya khusus? Mari kita ciptakan sesuatu yang indah bersama."
  }
};

function setLanguage(lang) {
  document.documentElement.lang = lang;
  const elements = document.querySelectorAll('[data-lang]');
  
  elements.forEach(element => {
    const key = element.getAttribute('data-lang');
    if (translations[lang] && translations[lang][key]) {
      element.textContent = translations[lang][key];
    }
  });
  
  // Update active language button
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  const activeBtn = document.querySelector(`[onclick="setLanguage('${lang}')"]`);
  if (activeBtn) {
    activeBtn.classList.add('active');
  }
}

// Initialize with English
document.addEventListener('DOMContentLoaded', () => {
  setLanguage('en');
});