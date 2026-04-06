const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

// Header scroll effect
window.addEventListener('scroll', () => {
  const header = $('#header');
  if (header) {
    header.classList.toggle('scrolled', scrollY > 50);
  }
});

// Carousel & Lightbox functionality (Dynamic)
let currentIndex = 0;
let slides = [];
let slidesToShow = window.innerWidth <= 480 ? 1 : 3;

async function initDynamicGallery() {
  const track = document.getElementById('dynamic-carousel-track');
  if (!track) return;

  try {
    const res = await fetch('/api/items');
    const items = await res.json();
    
    if (items.length === 0) {
      track.innerHTML = '<p style="color: white; padding: 2rem;">No artworks found in the gallery.</p>';
      return;
    }

    // Populate track
    track.innerHTML = items.map((item, index) => 
      item.type === 'video' 
        ? `<div class="carousel-slide" data-index="${index}" data-type="video" data-src="${item.image_url}">
             <video src="${item.image_url}" muted loop></video>
             <div class="play-icon-overlay"><i class="fas fa-play"></i></div>
             <div class="slide-title-overlay">${item.title}</div>
           </div>`
        : `<div class="carousel-slide" data-index="${index}" data-type="image" data-src="${item.image_url}">
             <img src="${item.image_url}" alt="${item.title}">
             <div class="slide-title-overlay">${item.title}</div>
           </div>`
    ).join('');

    slides = $$('.carousel-slide');
    setupCarousel(track);
    setupLightbox();
  } catch (err) {
    console.error('Failed to load gallery items:', err);
    track.innerHTML = '<p style="color: white; padding: 2rem;">Error loading gallery items.</p>';
  }
}

function updateCarousel(track) {
  if (track && slides.length > 0) {
    const slideWidth = window.innerWidth <= 480 ? 100 : 33.33;
    track.style.transform = `translateX(-${currentIndex * slideWidth}%)`;
  }
}

function setupCarousel(track) {
  const nextBtn = $('.next-btn');
  const prevBtn = $('.prev-btn');
  
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const maxIndex = slides.length - slidesToShow;
      currentIndex = currentIndex >= maxIndex ? 0 : currentIndex + 1;
      updateCarousel(track);
    });
  }
  
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      const maxIndex = slides.length - slidesToShow;
      currentIndex = currentIndex <= 0 ? maxIndex : currentIndex - 1;
      updateCarousel(track);
    });
  }

  // Update carousel on window resize
  window.addEventListener('resize', () => {
    slidesToShow = window.innerWidth <= 480 ? 1 : 3;
    // ensure we don't go out of bounds on resize
    const maxIndex = Math.max(0, slides.length - slidesToShow);
    if (currentIndex > maxIndex) currentIndex = maxIndex;
    updateCarousel(track);
  });
}

function setupLightbox() {
  const lightbox = $('#lightbox');
  const lbImg = $('#lbImg');
  const lbVideo = $('#lbVideo');
  const closeLB = $('#closeLB');

  if (lightbox && (lbImg || lbVideo)) {
    slides.forEach(slide => {
      slide.addEventListener('click', () => {
        const type = slide.getAttribute('data-type');
        const src = slide.getAttribute('data-src');
        
        if (type === 'video') {
          lbImg.style.display = 'none';
          lbImg.src = '';
          lbVideo.style.display = 'block';
          lbVideo.src = src;
          lbVideo.play().catch(e => console.error(e));
        } else {
          lbVideo.style.display = 'none';
          lbVideo.src = '';
          lbVideo.pause();
          lbImg.style.display = 'block';
          lbImg.src = src;
        }
        
        lightbox.style.display = 'flex';
      });
    });

    const closeLightbox = () => {
      lightbox.style.display = 'none';
      if (lbVideo) {
        lbVideo.pause();
        lbVideo.src = '';
      }
    };

    if (closeLB) {
      closeLB.addEventListener('click', closeLightbox);
    }

    lightbox.addEventListener('click', e => {
      if (e.target === lightbox) {
        closeLightbox();
      }
    });
  }
}

// Initialize gallery on load
initDynamicGallery();

// Navigation functionality
const hamburger = $('#hamburger');
const nav = $('#nav');

if (hamburger && nav) {
  hamburger.addEventListener('click', () => {
    nav.classList.toggle('open');
  });
}

// Close mobile nav when clicking nav links
$$('nav a').forEach(a =>
  a.addEventListener('click', () => {
    if (nav) {
      nav.classList.remove('open');
    }
  })
);

// Set current year
const yearElement = $('#year');
if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    const tgt = document.querySelector(a.getAttribute('href'));
    if (tgt) {
      tgt.scrollIntoView({ behavior: 'smooth' });
    }
  });
});