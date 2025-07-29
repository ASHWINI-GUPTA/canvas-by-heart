const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

window.addEventListener('scroll', () => {
  $('#header').classList.toggle('scrolled', scrollY > 50);
});

$('#hamburger').addEventListener('click', () => {
  $('#nav').classList.toggle('open');
});

$$('nav a').forEach(a =>
  a.addEventListener('click', () => {
    $('#nav').classList.remove('open');
  })
);

$('#year').textContent = new Date().getFullYear();

const lightbox = $('#lightbox');
const lbImg = $('#lbImg');
$$('.gallery img').forEach(img => {
  img.addEventListener('click', () => {
    lbImg.src = img.src;
    lightbox.style.display = 'flex';
  });
});

$('#closeLB').addEventListener('click', () => {
  lightbox.style.display = 'none';
});

lightbox.addEventListener('click', e => {
  if (e.target === lightbox) lightbox.style.display = 'none';
});

document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    const tgt = document.querySelector(a.getAttribute('href'));
    tgt?.scrollIntoView({ behavior: 'smooth' });
  });
});