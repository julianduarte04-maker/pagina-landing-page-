/**
 * ==========================================================================
 * FITZONE GYM - JAVASCRIPT PRINCIPAL (ES6+)
 * Módulos:
 *  1. Modo Oscuro con Persistencia en LocalStorage
 *  2. Header Sticky con Detección de Scroll (>80px)
 *  3. Animaciones al Scroll con IntersectionObserver
 *  4. Contadores de Estadísticas Dinámicos con data-target
 *  5. Validación Accesible de Formulario (blur, submit, aria-invalid)
 * ==========================================================================
 */

/**
 * 1. MÓDULO DE MODO OSCURO (THEME SWITCHER)
 * Lee y persiste la preferencia del usuario en localStorage con try/catch.
 */
const initTheme = () => {
  const themeToggleBtn = document.getElementById('theme-toggle');
  const STORAGE_KEY = 'fitzone_theme_preference';

  // Leer preferencia guardada con manejo seguro de excepciones
  let savedTheme = null;
  try {
    savedTheme = localStorage.getItem(STORAGE_KEY);
  } catch (err) {
    console.warn('Acceso a localStorage restringido:', err);
  }

  // Aplicar tema inicial
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-theme');
    if (themeToggleBtn) {
      themeToggleBtn.setAttribute('aria-pressed', 'true');
      themeToggleBtn.setAttribute('aria-label', 'Cambiar a modo claro');
      themeToggleBtn.innerHTML = '☀️';
    }
  } else {
    document.body.classList.remove('dark-theme');
    if (themeToggleBtn) {
      themeToggleBtn.setAttribute('aria-pressed', 'false');
      themeToggleBtn.setAttribute('aria-label', 'Cambiar a modo oscuro');
      themeToggleBtn.innerHTML = '🌙';
    }
  }

  // Event listener del botón de alternancia
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const isDark = document.body.classList.toggle('dark-theme');

      themeToggleBtn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
      themeToggleBtn.setAttribute(
        'aria-label',
        isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'
      );
      themeToggleBtn.innerHTML = isDark ? '☀️' : '🌙';

      try {
        localStorage.setItem(STORAGE_KEY, isDark ? 'dark' : 'light');
      } catch (err) {
        console.warn('No se pudo guardar la preferencia en localStorage:', err);
      }
    });
  }
};

/**
 * 2. MÓDULO DE HEADER STICKY
 * Agrega la clase .scrolled cuando el scroll vertical supera los 80px.
 */
const initStickyHeader = () => {
  const header = document.querySelector('.site-header');
  if (!header) return;

  const SCROLL_THRESHOLD = 80;

  const onScroll = () => {
    if (window.scrollY > SCROLL_THRESHOLD) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  // Ejecución inicial por si la página carga con scroll previo
  onScroll();
};

/**
 * 3. MÓDULO DE ANIMACIÓN ON SCROLL
 * Observa elementos .animate-on-scroll y aplica .visible al entrar al viewport.
 */
const initScrollAnimations = () => {
  const animatedElements = document.querySelectorAll('.animate-on-scroll');
  if (!animatedElements.length) return;

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            // Deja de observar el elemento después de animarlo
            obs.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px',
      }
    );

    animatedElements.forEach((el) => observer.observe(el));
  } else {
    // Fallback directo para navegadores sin soporte
    animatedElements.forEach((el) => el.classList.add('visible'));
  }
};

/**
 * 4. MÓDULO DE CONTADOR DE ESTADÍSTICAS
 * Anima progresivamente de 0 al valor indicado en data-target cuando la sección entra al viewport.
 */
const initCounters = () => {
  const counterElements = document.querySelectorAll('.stat-counter[data-target]');
  if (!counterElements.length) return;

  const animateCounter = (counter) => {
    const target = parseFloat(counter.getAttribute('data-target')) || 0;
    const prefix = counter.getAttribute('data-prefix') || '';
    const suffix = counter.getAttribute('data-suffix') || '';
    const durationMs = 1800;
    const startTime = performance.now();

    const updateValue = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / durationMs, 1);

      // Curva de aceleración/desaceleración suave (easeOutExpo)
      const easeOutProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const currentVal = Math.floor(easeOutProgress * target);

      counter.textContent = `${prefix}${currentVal.toLocaleString()}${suffix}`;

      if (progress < 1) {
        requestAnimationFrame(updateValue);
      } else {
        counter.textContent = `${prefix}${target.toLocaleString()}${suffix}`;
      }
    };

    requestAnimationFrame(updateValue);
  };

  if ('IntersectionObserver' in window) {
    const counterObserver = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3 }
    );

    counterElements.forEach((el) => counterObserver.observe(el));
  } else {
    counterElements.forEach((el) => animateCounter(el));
  }
};

/**
 * 5. MÓDULO DE VALIDACIÓN DE FORMULARIO ACCESIBLE
 * Valida en blur y en submit. Aplica aria-invalid, iconos y mensajes en span con aria-live.
 */
const initFormValidation = () => {
  const form = document.getElementById('form-registro');
  if (!form) return;

  // Campos interactivos del formulario
  const nameInput = document.getElementById('nombre');
  const emailInput = document.getElementById('email');
  const goalSelect = document.getElementById('objetivo');
  const termsCheckbox = document.getElementById('terminos');

  // Contenedores span para mensajes de error
  const nameError = document.getElementById('error-nombre');
  const emailError = document.getElementById('error-email');
  const goalError = document.getElementById('error-objetivo');
  const termsError = document.getElementById('error-terminos');

  // Regex para formato de correo electrónico estándar
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /**
   * Muestra el error de forma accesible
   */
  const setError = (input, errorSpan, message) => {
    if (!input || !errorSpan) return;
    input.classList.add('input-error');
    input.setAttribute('aria-invalid', 'true');
    errorSpan.textContent = message;
    errorSpan.classList.add('active');
  };

  /**
   * Limpia el error del campo
   */
  const clearError = (input, errorSpan) => {
    if (!input || !errorSpan) return;
    input.classList.remove('input-error');
    input.setAttribute('aria-invalid', 'false');
    errorSpan.textContent = '';
    errorSpan.classList.remove('active');
  };

  /**
   * Validadores individuales por campo
   */
  const validateName = () => {
    const val = nameInput ? nameInput.value.trim() : '';
    if (!val) {
      setError(
        nameInput,
        nameError,
        'El nombre completo es obligatorio para registrar tu pase oficial.'
      );
      return false;
    }
    // Mínimo 3 letras (contando caracteres alfabéticos)
    const letterCount = (val.match(/[a-zA-ZáéíóúÁÉÍÓÚñÑ]/g) || []).length;
    if (letterCount < 3) {
      setError(
        nameInput,
        nameError,
        'El nombre debe contener al menos 3 letras.'
      );
      return false;
    }
    clearError(nameInput, nameError);
    return true;
  };

  const validateEmail = () => {
    const val = emailInput ? emailInput.value.trim() : '';
    if (!val) {
      setError(
        emailInput,
        emailError,
        'El correo electrónico es obligatorio para enviarte el código.'
      );
      return false;
    }
    if (!EMAIL_REGEX.test(val)) {
      setError(
        emailInput,
        emailError,
        'Introduce una dirección de correo válida (ejemplo: nombre@dominio.com).'
      );
      return false;
    }
    clearError(emailInput, emailError);
    return true;
  };

  const validateGoal = () => {
    const val = goalSelect ? goalSelect.value.trim() : '';
    if (!val) {
      setError(
        goalSelect,
        goalError,
        'Por favor selecciona el objetivo prioritario para tu diagnóstico.'
      );
      return false;
    }
    clearError(goalSelect, goalError);
    return true;
  };

  const validateTerms = () => {
    const isChecked = termsCheckbox ? termsCheckbox.checked : false;
    if (!isChecked) {
      setError(
        termsCheckbox,
        termsError,
        'Debes aceptar los términos y la política de privacidad para reservar tu cupo.'
      );
      return false;
    }
    clearError(termsCheckbox, termsError);
    return true;
  };

  // Validación al salir del campo (evento blur)
  if (nameInput) nameInput.addEventListener('blur', validateName);
  if (emailInput) emailInput.addEventListener('blur', validateEmail);
  if (goalSelect) goalSelect.addEventListener('blur', validateGoal);
  if (termsCheckbox) termsCheckbox.addEventListener('blur', validateTerms);

  // Limpieza en tiempo real durante la interacción
  if (nameInput) {
    nameInput.addEventListener('input', () => {
      if (nameInput.classList.contains('input-error')) validateName();
    });
  }
  if (emailInput) {
    emailInput.addEventListener('input', () => {
      if (emailInput.classList.contains('input-error')) validateEmail();
    });
  }
  if (goalSelect) {
    goalSelect.addEventListener('change', () => {
      if (goalSelect.classList.contains('input-error')) validateGoal();
    });
  }
  if (termsCheckbox) {
    termsCheckbox.addEventListener('change', () => {
      if (termsCheckbox.classList.contains('input-error')) validateTerms();
    });
  }

  // Manejo del evento submit del formulario
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    // Validar todos los campos juntos
    const isNameValid = validateName();
    const isEmailValid = validateEmail();
    const isGoalValid = validateGoal();
    const isTermsValid = validateTerms();

    const isFormValid = isNameValid && isEmailValid && isGoalValid && isTermsValid;

    if (!isFormValid) {
      // Poner el foco en el primer campo con error
      const firstInvalidField = form.querySelector('.input-error');
      if (firstInvalidField) {
        firstInvalidField.focus();
      }
      return;
    }

    // Estado de envío en curso
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Generando Tu Pase Oficial...';
    }

    // Simulación de respuesta inmediata y renderizado de confirmación en el DOM
    setTimeout(() => {
      const userEmail = emailInput ? emailInput.value.trim() : 'tu correo';
      const randomCode = Math.floor(1000 + Math.random() * 9000);

      form.innerHTML = `
        <div class="form-success-card" role="alert" aria-live="assertive">
          <div class="success-icon" aria-hidden="true">✓</div>
          <h3 class="success-title">¡Pase de Cortesía Confirmado!</h3>
          <p class="success-code">#FZ-VIP-${randomCode}</p>
          <p class="success-desc">
            Hemos reservado tu lugar y enviado las instrucciones de llegada a <strong>${userEmail}</strong>. Preséntate 10 minutos antes en recepción con tu documento de identidad.
          </p>
          <a href="#hero" class="btn-secondary" style="display: inline-block;">Volver al Inicio</a>
        </div>
      `;
    }, 450);
  });
};

/**
 * INICIALIZACIÓN GLOBAL
 * Ejecutada en el evento DOMContentLoaded
 */
const init = () => {
  initTheme();
  initStickyHeader();
  initScrollAnimations();
  initCounters();
  initFormValidation();
};

document.addEventListener('DOMContentLoaded', init);
