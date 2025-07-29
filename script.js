const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

// Header scroll effect
window.addEventListener('scroll', () => {
  const header = $('#header');
  if (header) {
    header.classList.toggle('scrolled', scrollY > 50);
  }
});

// Carousel functionality
const track = $('.carousel-track');
const slides = $$('.carousel-slide');
let currentIndex = 0;
const slidesToShow = window.innerWidth <= 480 ? 1 : 3;

function updateCarousel() {
  if (track && slides.length > 0) {
    const slideWidth = window.innerWidth <= 480 ? 100 : 33.33;
    track.style.transform = `translateX(-${currentIndex * slideWidth}%)`;
  }
}

// Initialize carousel
if (track && slides.length > 0) {
  const nextBtn = $('.next-btn');
  const prevBtn = $('.prev-btn');
  
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const maxIndex = slides.length - slidesToShow;
      currentIndex = currentIndex >= maxIndex ? 0 : currentIndex + 1;
      updateCarousel();
    });
  }
  
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      const maxIndex = slides.length - slidesToShow;
      currentIndex = currentIndex <= 0 ? maxIndex : currentIndex - 1;
      updateCarousel();
    });
  }
}

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

// Lightbox functionality
const lightbox = $('#lightbox');
const lbImg = $('#lbImg');
const closeLB = $('#closeLB');

if (lightbox && lbImg) {
  // Add click listeners to carousel images
  $$('.carousel-slide').forEach(img => {
    img.addEventListener('click', () => {
      lbImg.src = img.src;
      lightbox.style.display = 'flex';
    });
  });

  // Close lightbox
  if (closeLB) {
    closeLB.addEventListener('click', () => {
      lightbox.style.display = 'none';
    });
  }

  // Close lightbox on background click
  lightbox.addEventListener('click', e => {
    if (e.target === lightbox) {
      lightbox.style.display = 'none';
    }
  });
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

// Update carousel on window resize
window.addEventListener('resize', () => {
  updateCarousel();
});