import { translations } from './translations.js';

// App State
let currentLang = localStorage.getItem('lang') || 'en';

// DOM Elements
const langBtn = document.getElementById('lang-btn');
const mainNav = document.getElementById('main-nav');
const menuToggle = document.getElementById('menu-toggle');
const navLinks = document.getElementById('nav-menu');
const whatsappBtn = document.getElementById('whatsapp-btn');
const scrollTopBtn = document.getElementById('scroll-top-btn');

// Start Init
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  // Sync page direction and lang button matching active language state
  document.documentElement.setAttribute('dir', currentLang === 'ar' ? 'rtl' : 'ltr');
  document.documentElement.setAttribute('lang', currentLang);
  langBtn.textContent = currentLang === 'en' ? 'العربية' : 'English';

  // Setup Language Switcher
  langBtn.addEventListener('click', toggleLanguage);
  
  // Set up Mobile Navigation menu
  menuToggle.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    menuToggle.classList.toggle('active');
  });
  
  // Close menu on nav click
  document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('active');
      menuToggle.classList.remove('active');
    });
  });

  // Header Scroll and Scroll-to-Top Button Transitions
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      mainNav.classList.add('scrolled');
    } else {
      mainNav.classList.remove('scrolled');
    }

    if (window.scrollY > 300) {
      scrollTopBtn.classList.add('visible');
    } else {
      scrollTopBtn.classList.remove('visible');
    }
  });

  // Scroll to Top action
  scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });

  // Initialize Scroll Reveal Observer
  initScrollReveal();

  // WhatsApp redirection
  whatsappBtn.addEventListener('click', () => {
    const text = currentLang === 'en' 
      ? "Hello Prespectra Space, I would like to learn more about your services." 
      : "مرحباً بريسبكترا سبيس، أود معرفة المزيد من المعلومات عن خدماتكم.";
    window.open(`https://wa.me/9647807306365?text=${encodeURIComponent(text)}`, '_blank');
  });

  // Initialize Language rendering
  updatePageLanguage();
}

// Language Toggle
function toggleLanguage() {
  currentLang = currentLang === 'en' ? 'ar' : 'en';
  localStorage.setItem('lang', currentLang);
  langBtn.textContent = currentLang === 'en' ? 'العربية' : 'English';
  
  // Set HTML direction and lang attribute
  document.documentElement.setAttribute('dir', currentLang === 'ar' ? 'rtl' : 'ltr');
  document.documentElement.setAttribute('lang', currentLang);

  updatePageLanguage();
}

// Render dynamic translations on page
function updatePageLanguage() {
  const t = translations[currentLang];
  
  // Standard text content updates
  document.querySelectorAll('[data-translate]').forEach(el => {
    const key = el.getAttribute('data-translate');
    if (t[key]) {
      el.textContent = t[key];
    }
  });

  // Attribute title translations (e.g. scroll-to-top tooltip)
  document.querySelectorAll('[data-translate-title]').forEach(el => {
    const key = el.getAttribute('data-translate-title');
    if (t[key]) {
      el.setAttribute('title', t[key]);
    }
  });
}

// Scroll Entrance Observer
function initScrollReveal() {
  const revealElements = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        observer.unobserve(entry.target); // Reveal once
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px"
  });

  revealElements.forEach(el => observer.observe(el));
}
