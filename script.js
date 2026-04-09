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
let slides = [];
let slidesToShow = window.innerWidth <= 480 ? 1 : 3;

async function initDynamicGallery() {
  const imagesTrack = document.getElementById('dynamic-carousel-track-images');
  const videosTrack = document.getElementById('dynamic-carousel-track-videos');
  if (!imagesTrack || !videosTrack) return;

  try {
    const res = await fetch('/api/items');
    const items = await res.json();

    if (items.length === 0) {
      imagesTrack.innerHTML = '<p class="gallery-error-msg">No artworks found in the gallery.</p>';
      videosTrack.innerHTML = '<p class="gallery-error-msg">No artworks found in the gallery.</p>';
      return;
    }

    const imageItems = items.filter(i => i.type !== 'video');
    const videoItems = items.filter(i => i.type === 'video');

    // Populate images track
    imagesTrack.innerHTML = imageItems.map((item, index) =>
      `<div class="carousel-slide" data-index="${index}" data-type="image" data-src="${item.image_url}">
         <img src="${item.image_url}" alt="${item.title}">
         <div class="slide-title-overlay">${item.title}</div>
       </div>`
    ).join('');

    // Populate videos track
    videosTrack.innerHTML = videoItems.map((item, index) =>
      `<div class="carousel-slide" data-index="${index}" data-type="video" data-src="${item.image_url}">
         <div class="video-wrapper">
           <video src="${item.image_url}#t=4.0" preload="metadata" playsinline class="item-img" muted loop onmouseover="this.play()" onmouseout="this.pause()"></video>
           <div class="play-icon-overlay"><i class="fas fa-play"></i></div>
         </div>
         <div class="slide-title-overlay">${item.title}</div>
       </div>`
    ).join('');

    slides = $$('.carousel-slide');
    setupCarousel(document.getElementById('images-carousel'), imagesTrack);
    setupCarousel(document.getElementById('videos-carousel'), videosTrack);
    setupLightbox();
  } catch (err) {
    console.error('Failed to load gallery items:', err);
    imagesTrack.innerHTML = '<p class="gallery-error-msg">Error loading gallery items.</p>';
    videosTrack.innerHTML = '<p class="gallery-error-msg">Error loading gallery items.</p>';
  }
}

let isAnimating = false;

function setupCarousel(container, track) {
  if (!container || !track) return;
  const nextBtn = container.querySelector('.next-btn');
  const prevBtn = container.querySelector('.prev-btn');

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (isAnimating || track.children.length <= slidesToShow) return;
      isAnimating = true;

      const firstSlide = track.firstElementChild;
      const slideWidth = firstSlide.offsetWidth + parseFloat(getComputedStyle(firstSlide).marginRight || 0);

      track.style.transition = 'transform 0.5s ease-in-out';
      track.style.transform = `translateX(-${slideWidth}px)`;

      track.addEventListener('transitionend', function handler() {
        track.removeEventListener('transitionend', handler);
        track.appendChild(firstSlide);
        track.style.transition = 'none';
        track.style.transform = 'translateX(0)';
        isAnimating = false;
      }, { once: true });
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (isAnimating || track.children.length <= slidesToShow) return;
      isAnimating = true;

      const lastSlide = track.lastElementChild;
      const slideWidth = lastSlide.offsetWidth + parseFloat(getComputedStyle(lastSlide).marginRight || 0);

      track.insertBefore(lastSlide, track.firstElementChild);
      track.style.transition = 'none';
      track.style.transform = `translateX(-${slideWidth}px)`;

      // Force reflow
      track.offsetHeight;

      track.style.transition = 'transform 0.5s ease-in-out';
      track.style.transform = 'translateX(0)';

      track.addEventListener('transitionend', function handler() {
        track.removeEventListener('transitionend', handler);
        isAnimating = false;
      }, { once: true });
    });
  }

  // Handle window resize (resets track position)
  window.addEventListener('resize', () => {
    slidesToShow = window.innerWidth <= 480 ? 1 : 3;
    track.style.transition = 'none';
    track.style.transform = 'translateX(0)';
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