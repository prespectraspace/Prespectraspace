import { translations } from './translations.js';
import { initThreeViewer, updateViewerLanguage } from './three-viewer.js';

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
  
  const langText = document.getElementById('lang-btn-text');
  if (langText) {
    langText.textContent = currentLang === 'en' ? 'العربية' : 'English';
  }

  // Setup Language Switcher
  langBtn.addEventListener('click', toggleLanguage);
  
  // Smooth scroll home on logo click
  const logoLink = document.querySelector('.logo');
  logoLink.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
    history.pushState("", document.title, window.location.pathname + window.location.search);
  });

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

  // Pricing Calculator events deleted

  // Initialize Scroll Reveal Observer
  initScrollReveal();

  // Handle Form Submission
  const form = document.getElementById('quote-form');
  const responseMsg = document.getElementById('form-response');

  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const t = translations[currentLang] || translations['en'];
      const submitBtn = document.getElementById('submit-btn');
      
      // Visual button states and disable submission
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.setAttribute('data-original-text', submitBtn.textContent);
        submitBtn.textContent = currentLang === 'en' ? "Sending..." : "جاري الإرسال...";
      }
      
      if (responseMsg) {
        responseMsg.className = 'form-msg';
        responseMsg.style.display = 'block';
        responseMsg.style.color = '#ffffff';
        responseMsg.textContent = currentLang === 'en' ? 'Sending request...' : 'جاري إرسال الطلب...';
      }

      const formData = new FormData(form);

      // Web3Forms public access key
      formData.append("access_key", "6dfa4e30-c39d-4267-bb46-f0eb611e2bd0"); 
      formData.append("subject", "New Scan Quote Request - Prespectra");
      formData.append("from_name", "Prespectra Webform");

      try {
        const response = await fetch("https://api.web3forms.com/submit", {
          method: "POST",
          body: formData
        });

        const result = await response.json();
        if (result.success) {
          alert("Form submitted successfully!");
          if (responseMsg) {
            responseMsg.className = 'form-msg success';
            responseMsg.style.display = 'block';
            responseMsg.textContent = t.contact_success || 'Quote request received successfully!';
          }
          form.reset();
          
          // Clear message after 5 seconds
          setTimeout(() => {
            if (responseMsg) {
              responseMsg.style.display = 'none';
              responseMsg.className = 'form-msg';
            }
          }, 5000);
        } else {
          alert("Submission error: " + result.message);
          if (responseMsg) {
            responseMsg.className = 'form-msg error';
            responseMsg.style.display = 'block';
            responseMsg.textContent = t.contact_error || 'Submission failed. Please try again.';
          }
        }
      } catch (error) {
        alert("Network error: " + error.message);
        if (responseMsg) {
          responseMsg.className = 'form-msg error';
          responseMsg.style.display = 'block';
          responseMsg.textContent = currentLang === 'en' 
            ? 'Network error. Please try again later.' 
            : 'خطأ في الاتصال بالشبكة. يرجى المحاولة مرة أخرى لاحقاً.';
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = submitBtn.getAttribute('data-original-text') || 'GET YOUR FREE QUOTE';
        }
      }
    });
  }

  // WhatsApp redirection
  whatsappBtn.addEventListener('click', () => {
    const text = currentLang === 'en' 
      ? "Hello Prespectra Space, I would like to book a 3D scan." 
      : "مرحباً بريسبكترا سبيس، أود حجز مسح مكاني ثلاثي الأبعاد عقاري.";
    window.open(`https://wa.me/9647807306365?text=${encodeURIComponent(text)}`, '_blank');
  });

  // Initialize Language rendering
  updatePageLanguage();
  
  // Init Three.js 3D Viewport
  initThreeViewer('three-canvas', currentLang);
}

// Language Toggle
function toggleLanguage() {
  currentLang = currentLang === 'en' ? 'ar' : 'en';
  localStorage.setItem('lang', currentLang);
  
  const langText = document.getElementById('lang-btn-text');
  if (langText) {
    langText.textContent = currentLang === 'en' ? 'العربية' : 'English';
  }
  
  // Set HTML direction and lang attribute
  document.documentElement.setAttribute('dir', currentLang === 'ar' ? 'rtl' : 'ltr');
  document.documentElement.setAttribute('lang', currentLang);

  updatePageLanguage();
  
  // Notify Three.js viewer about language change
  updateViewerLanguage(currentLang);
}

// Render dynamic translations on page
function updatePageLanguage() {
  const t = translations[currentLang];
  
  // Standard text content updates
  document.querySelectorAll('[data-translate]').forEach(el => {
    const key = el.getAttribute('data-translate');
    if (t[key]) {
      if (key === 'pricing_footnote' || key.startsWith('pricing_step') || key.startsWith('pricing_addon')) {
        el.innerHTML = t[key];
      } else {
        el.textContent = t[key];
      }
    }
  });

  // Input placeholder translations
  document.querySelectorAll('[data-translate-placeholder]').forEach(el => {
    const key = el.getAttribute('data-translate-placeholder');
    if (t[key]) {
      el.setAttribute('placeholder', t[key]);
    }
  });

  // Attribute title translations (e.g. scroll-to-top tooltip)
  document.querySelectorAll('[data-translate-title]').forEach(el => {
    const key = el.getAttribute('data-translate-title');
    if (t[key]) {
      el.setAttribute('title', t[key]);
    }
  });

  // Populate dynamic pricing features lists
  renderPricingFeatures('features-pro', t.pricing_tier_pro_features);
  renderPricingFeatures('features-premium', t.pricing_tier_premium_features);
  renderPricingFeatures('features-enterprise', t.pricing_tier_enterprise_features);
  
  // Update control sidebar static label texts
  document.getElementById('lbl-total-area').textContent = currentLang === 'en' ? "Total Area (m²)" : "المساحة الإجمالية (م²)";
  document.getElementById('lbl-accuracy').textContent = currentLang === 'en' ? "Accuracy" : "هامش الخطأ في القياس";
  document.getElementById('lbl-resolution').textContent = currentLang === 'en' ? "Resolution" : "دقة الوضوح";
  document.getElementById('lbl-hotspots').textContent = currentLang === 'en' ? "Hotspots" : "النقاط التفاعلية";
}

function renderPricingFeatures(elementId, featuresArray) {
  const container = document.getElementById(elementId);
  if (!container) return;
  container.innerHTML = '';
  featuresArray.forEach(feature => {
    const li = document.createElement('li');
    li.textContent = feature;
    container.appendChild(li);
  });
}

// (calculateEstimate function deleted)

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

