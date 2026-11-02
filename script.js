/**
 * ==========================================================================
 * FITZONE GYM - JAVASCRIPT PRINCIPAL (ES6+)
 * 
 * Módulos integrados:
 *  1. Utilidad Segura de LocalStorage (try/catch para modo incógnito / bloqueos)
 *  2. Migración Única de Claves Legadas al namespace 'lp_fitzone_'
 *  3. Modo Oscuro con Persistencia en LocalStorage (lp_fitzone_theme_preference)
 *  4. Header Sticky con Detección de Scroll (>80px)
 *  5. Animaciones al Scroll con IntersectionObserver (.animate-on-scroll)
 *  6. Contadores de Estadísticas Dinámicos con data-target
 *  7. Formulario Accesible con Inicio Vacío y Almacenamiento Acumulativo:
 *     - La página inicia SIEMPRE con el formulario limpio y listo para registrar
 *     - Historial acumulativo de TODOS los usuarios registrados (nunca se pierden)
 *     - Enlace discreto para consultar pases previos si el usuario lo desea
 *     - Tarjeta de agradecimiento unificada, personalizada y segura contra XSS
 *     - Autoguardado reactivo mientras el usuario escribe (excluyendo términos)
 *     - Protección Antispam mediante campo Honeypot
 *     - Envío Real asíncrono con fetch POST a Formspree (con emulación fallback)
 *     - Prevención de doble envío concurrente
 *     - Limpieza selectiva exclusiva de borradores tras éxito
 *     - Manejo resiliente de errores con alertas accesibles (aria-live)
 * ==========================================================================
 */

/**
 * --------------------------------------------------------------------------
 * CONFIGURACIÓN GLOBAL
 * --------------------------------------------------------------------------
 * Endpoint de Formspree para procesar el formulario de registro.
 * Para conectar tu cuenta de Formspree, define tu endpoint real aquí
 * o mediante window.FITZONE_FORMSPREE_ENDPOINT (ej. 'https://formspree.io/f/mqazklow').
 * Si se mantiene '[TU ENDPOINT]', el script activa un modo de emulación exitosa
 * que previene el error "form not found" en entornos de prueba.
 */
const FORMSPREE_ENDPOINT =
  (typeof window !== 'undefined' && window.FITZONE_FORMSPREE_ENDPOINT) ||
  'https://formspree.io/f/[TU ENDPOINT]';

/**
 * Constantes oficiales de almacenamiento bajo el namespace 'lp_fitzone_'
 */
const STORAGE_KEYS = {
  // Claves antiguas para migración
  LEGACY_THEME: 'fitzone_theme_preference',
  LEGACY_REGISTRO: 'fitzone_registro',

  // Claves oficiales
  THEME: 'lp_fitzone_theme_preference',
  CONVERTIDO: 'lp_fitzone_convertido',
  REGISTRO: 'lp_fitzone_registro', // Arreglo acumulativo con todos los pases generados

  // Borradores de formulario (autoguardado)
  DRAFT_NOMBRE: 'lp_fitzone_nombre',
  DRAFT_EMAIL: 'lp_fitzone_email',
  DRAFT_OBJETIVO: 'lp_fitzone_objetivo',
};

/**
 * Diccionario de traducción de valores técnicos de objetivos a texto legible
 */
const GOAL_LABELS = {
  fuerza: 'Ganancia de Fuerza y Masa Magra',
  grasa: 'Pérdida de Grasa y Recomposición Corporal',
  movilidad: 'Alivio de Dolores Posturales y Movilidad Articular',
  cardio: 'Resistencia Cardiovascular y Manejo de Estrés',
};

/**
 * --------------------------------------------------------------------------
 * 1. UTILIDAD SEGURA DE LOCALSTORAGE
 * Envuelve todas las operaciones en try/catch para evitar excepciones fatales
 * cuando el usuario navega en modo privado o tiene las cookies desactivadas.
 * --------------------------------------------------------------------------
 */
const safeStorage = {
  getItem: (key) => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn(`[LocalStorage] No se pudo leer la clave "${key}":`, error);
      return null;
    }
  },

  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn(`[LocalStorage] No se pudo escribir la clave "${key}":`, error);
      return false;
    }
  },

  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn(`[LocalStorage] No se pudo eliminar la clave "${key}":`, error);
      return false;
    }
  },
};

/**
 * --------------------------------------------------------------------------
 * 2. MIGRACIÓN ÚNICA DE CLAVES LEGADAS
 * Si existen datos con el prefijo anterior 'fitzone_', los migra al nuevo
 * namespace 'lp_fitzone_' en formato de arreglo y borra las claves obsoletas.
 * --------------------------------------------------------------------------
 */
const migrateLegacyStorageKeys = () => {
  // Migración de preferencia de tema
  const oldTheme = safeStorage.getItem(STORAGE_KEYS.LEGACY_THEME);
  if (oldTheme !== null) {
    if (safeStorage.getItem(STORAGE_KEYS.THEME) === null) {
      safeStorage.setItem(STORAGE_KEYS.THEME, oldTheme);
    }
    safeStorage.removeItem(STORAGE_KEYS.LEGACY_THEME);
  }

  // Migración de registro previo
  const oldRegistro = safeStorage.getItem(STORAGE_KEYS.LEGACY_REGISTRO);
  if (oldRegistro !== null) {
    if (safeStorage.getItem(STORAGE_KEYS.REGISTRO) === null) {
      let registroObj = null;
      try {
        registroObj = JSON.parse(oldRegistro);
      } catch {
        registroObj = null;
      }
      const initialArray = registroObj ? [registroObj] : [];
      safeStorage.setItem(STORAGE_KEYS.REGISTRO, JSON.stringify(initialArray));
    }
    safeStorage.removeItem(STORAGE_KEYS.LEGACY_REGISTRO);
  }
};

/**
 * --------------------------------------------------------------------------
 * 3. MÓDULO DE MODO OSCURO (THEME SWITCHER)
 * Aplica la preferencia del usuario y conmuta entre temas claro y oscuro
 * actualizando los atributos de accesibilidad ARIA.
 * --------------------------------------------------------------------------
 */
const initTheme = () => {
  const themeToggleBtn = document.getElementById('theme-toggle');
  const savedTheme = safeStorage.getItem(STORAGE_KEYS.THEME);

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

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const isDark = document.body.classList.toggle('dark-theme');

      themeToggleBtn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
      themeToggleBtn.setAttribute(
        'aria-label',
        isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'
      );
      themeToggleBtn.innerHTML = isDark ? '☀️' : '🌙';

      safeStorage.setItem(STORAGE_KEYS.THEME, isDark ? 'dark' : 'light');
    });
  }
};

/**
 * --------------------------------------------------------------------------
 * 4. MÓDULO DE HEADER STICKY
 * Aplica la clase .scrolled cuando el desplazamiento supera 80px.
 * --------------------------------------------------------------------------
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
  onScroll();
};

/**
 * --------------------------------------------------------------------------
 * 5. MÓDULO DE ANIMACIÓN ON SCROLL
 * Agrega la clase .visible a elementos con .animate-on-scroll al entrar al viewport.
 * --------------------------------------------------------------------------
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
    animatedElements.forEach((el) => el.classList.add('visible'));
  }
};

/**
 * --------------------------------------------------------------------------
 * 6. MÓDULO DE CONTADOR DE ESTADÍSTICAS
 * Anima progresivamente de 0 al valor numérico especificado en data-target.
 * --------------------------------------------------------------------------
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
      const easeOutProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const currentVal = Math.floor(easeOutProgress * target);

      counter.textContent = `${prefix}${currentVal.toLocaleString('es-CO')}${suffix}`;

      if (progress < 1) {
        requestAnimationFrame(updateValue);
      } else {
        counter.textContent = `${prefix}${target.toLocaleString('es-CO')}${suffix}`;
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
 * --------------------------------------------------------------------------
 * 7. MÓDULO DE GESTIÓN DEL FORMULARIO Y ALMACENAMIENTO DE TODOS LOS USUARIOS
 * Comportamiento:
 *  - Al cargar la página, se inicia SIEMPRE con el formulario limpio y vacío.
 *  - Todos los pases registrados se preservan en una lista acumulativa en localStorage.
 *  - Si existen pases previos, se ofrece un enlace discreto para consultarlos si se desea.
 *  - Al enviar el formulario con éxito, se muestra la tarjeta de confirmación del nuevo pase.
 *  - Desde la tarjeta se puede volver al formulario para registrar a otra persona.
 * --------------------------------------------------------------------------
 */
const initFormModule = () => {
  const formWrapper = document.querySelector('.form-wrapper');
  if (!formWrapper) return;

  // Guardar la plantilla HTML original del formulario para poder restaurarlo siempre
  const originalFormHTML = formWrapper.innerHTML;

  /**
   * Helper: Obtiene el arreglo con todos los registros acumulados en localStorage
   */
  const getAllRegistrations = () => {
    const raw = safeStorage.getItem(STORAGE_KEYS.REGISTRO);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === 'object') return [parsed];
      return [];
    } catch {
      return [];
    }
  };

  /**
   * Helper: Formatea fechas ISO a texto legible en español
   */
  const formatReadableDate = (dateString) => {
    try {
      const date = dateString ? new Date(dateString) : new Date();
      return date.toLocaleDateString('es-CO', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return 'Recientemente';
    }
  };

  /**
   * Renderiza la tarjeta de confirmación y el historial de pases acumulados
   */
  const renderConversionCard = (activeRecord, allRecords = []) => {
    const { nombre, objetivo, codigo, fecha } = activeRecord;
    const readableGoal = GOAL_LABELS[objetivo] || objetivo || 'Entrenamiento Integral';
    const readableDate = formatReadableDate(fecha);

    // Filtrar otros pases registrados para el historial secundario
    const otherPasses = allRecords.filter((rec) => rec.codigo !== codigo);

    formWrapper.innerHTML = `
      <div class="form-success-card" role="alert">
        <div class="success-icon" aria-hidden="true">✓</div>
        <h3 class="success-title">¡Pase de Cortesía Confirmado!</h3>
        <p class="success-code" id="card-code"></p>
        <div class="success-desc">
          <p>Hola <strong id="card-name"></strong>, tu lugar exclusivo ha sido reservado para tu plan de <strong id="card-goal"></strong>.</p>
          <p style="margin-top: 0.65rem; font-size: 0.85rem; color: var(--color-text-muted);">
            Fecha de emisión: <span id="card-date"></span> · Preséntate 10 minutos antes en recepción con tu documento de identidad.
          </p>
        </div>

        <!-- Historial secundario de otros pases registrados en este dispositivo -->
        <div id="passes-history-container" style="display: none; margin-top: 1.5rem; padding-top: 1.25rem; border-top: 0.0625rem solid rgba(255, 255, 255, 0.12); text-align: left;">
          <p style="font-size: 0.8rem; font-weight: 700; color: var(--color-accent); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.75rem;">
            📋 Otros pases registrados en este equipo (<span id="passes-count"></span>):
          </p>
          <div id="passes-list" style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 10rem; overflow-y: auto;"></div>
        </div>

        <div style="display: flex; flex-direction: column; align-items: center; gap: 0.85rem; margin-top: 1.75rem;">
          <a href="#hero" class="btn-secondary btn-inline">Volver al Inicio</a>
          <button type="button" id="btn-back-to-form" style="background: none; border: none; color: var(--color-text-muted); font-size: 0.825rem; text-decoration: underline; cursor: pointer; padding: 0.35rem 0.5rem; transition: color 150ms ease;">
            ← Volver al formulario / Registrar a otra persona
          </button>
        </div>
      </div>
    `;

    // Asignación con textContent para blindar contra XSS
    const nameEl = document.getElementById('card-name');
    const goalEl = document.getElementById('card-goal');
    const codeEl = document.getElementById('card-code');
    const dateEl = document.getElementById('card-date');

    if (nameEl) nameEl.textContent = nombre || 'Atleta';
    if (goalEl) goalEl.textContent = readableGoal;
    if (codeEl) codeEl.textContent = codigo || '#FZ-VIP-ACTIVO';
    if (dateEl) dateEl.textContent = readableDate;

    // Si hay más pases registrados, listarlos
    if (otherPasses.length > 0) {
      const historyContainer = document.getElementById('passes-history-container');
      const countEl = document.getElementById('passes-count');
      const listEl = document.getElementById('passes-list');

      if (historyContainer && countEl && listEl) {
        historyContainer.style.display = 'block';
        countEl.textContent = otherPasses.length.toString();

        otherPasses.forEach((item) => {
          const passCard = document.createElement('div');
          passCard.style.padding = '0.5rem 0.75rem';
          passCard.style.borderRadius = '0.375rem';
          passCard.style.backgroundColor = 'rgba(0, 0, 0, 0.25)';
          passCard.style.border = '0.0625rem solid rgba(255, 255, 255, 0.08)';
          passCard.style.display = 'flex';
          passCard.style.justifyContent = 'space-between';
          passCard.style.alignItems = 'center';
          passCard.style.fontSize = '0.8rem';

          const infoBlock = document.createElement('div');
          const pName = document.createElement('strong');
          pName.style.display = 'block';
          pName.style.color = 'var(--color-text)';
          pName.textContent = item.nombre;

          const pMeta = document.createElement('span');
          pMeta.style.color = 'var(--color-text-muted)';
          pMeta.style.fontSize = '0.75rem';
          pMeta.textContent = `${GOAL_LABELS[item.objetivo] || item.objetivo} · ${formatReadableDate(item.fecha)}`;

          infoBlock.appendChild(pName);
          infoBlock.appendChild(pMeta);

          const pCode = document.createElement('span');
          pCode.style.fontFamily = 'monospace';
          pCode.style.fontWeight = '700';
          pCode.style.color = 'var(--color-primary)';
          pCode.textContent = item.codigo;

          passCard.appendChild(infoBlock);
          passCard.appendChild(pCode);
          listEl.appendChild(passCard);
        });
      }
    }

    // Listener para volver al formulario limpio
    const backBtn = document.getElementById('btn-back-to-form');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        formWrapper.innerHTML = originalFormHTML;
        setupInteractiveForm(true); // Reinicia con formulario vacío
      });
    }
  };

  /**
   * Configura la lógica interactiva del formulario
   * @param {boolean} forceEmpty - Si es true, garantiza que todos los campos inicien vacíos
   */
  const setupInteractiveForm = (forceEmpty = false) => {
    const form = document.getElementById('form-registro');
    if (!form) return;

    // Elementos del formulario
    const nameInput = document.getElementById('nombre');
    const emailInput = document.getElementById('email');
    const goalSelect = document.getElementById('objetivo');
    const termsCheckbox = document.getElementById('terminos');

    // Campo honeypot para protección antispam
    const honeypotInput =
      form.querySelector('input[name="_gotcha"]') ||
      document.getElementById('campo-antispam') ||
      document.getElementById('form-hp');

    // Spans accesibles para mensajes de error
    const nameError = document.getElementById('error-nombre');
    const emailError = document.getElementById('error-email');
    const goalError = document.getElementById('error-objetivo');
    const termsError = document.getElementById('error-terminos');

    // Contenedor accesible general para errores de red o servidor
    let generalError = document.getElementById('error-general');
    if (!generalError) {
      generalError = document.createElement('div');
      generalError.id = 'error-general';
      generalError.className = 'form-error';
      generalError.setAttribute('role', 'alert');
      generalError.setAttribute('aria-live', 'assertive');
      generalError.style.display = 'none';
      generalError.style.marginBottom = '1.25rem';
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        form.insertBefore(generalError, submitBtn);
      } else {
        form.appendChild(generalError);
      }
    }

    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    let isSubmitting = false;

    // Si se requiere iniciar limpio (por ejemplo al cargar la página o al registrar otro usuario)
    if (forceEmpty) {
      if (nameInput) nameInput.value = '';
      if (emailInput) emailInput.value = '';
      if (goalSelect) goalSelect.value = '';
      if (termsCheckbox) termsCheckbox.checked = false;
      safeStorage.removeItem(STORAGE_KEYS.DRAFT_NOMBRE);
      safeStorage.removeItem(STORAGE_KEYS.DRAFT_EMAIL);
      safeStorage.removeItem(STORAGE_KEYS.DRAFT_OBJETIVO);
    }

    // Si existen pases guardados previamente en este dispositivo, mostrar un enlace discreto
    const existingPasses = getAllRegistrations();
    if (existingPasses.length > 0) {
      const existingBadge = document.getElementById('existing-passes-link');
      if (!existingBadge) {
        const badgeWrapper = document.createElement('div');
        badgeWrapper.id = 'existing-passes-link';
        badgeWrapper.style.textAlign = 'center';
        badgeWrapper.style.marginTop = '1rem';
        badgeWrapper.style.fontSize = '0.825rem';
        badgeWrapper.style.color = 'var(--color-text-muted)';

        const badgeBtn = document.createElement('button');
        badgeBtn.type = 'button';
        badgeBtn.textContent = `📋 Ver ${existingPasses.length} pase(s) registrado(s) en este dispositivo`;
        badgeBtn.style.background = 'none';
        badgeBtn.style.border = 'none';
        badgeBtn.style.color = 'var(--color-accent)';
        badgeBtn.style.cursor = 'pointer';
        badgeBtn.style.textDecoration = 'underline';
        badgeBtn.style.font = 'inherit';

        badgeBtn.addEventListener('click', () => {
          const latest = existingPasses[existingPasses.length - 1];
          renderConversionCard(latest, existingPasses);
        });

        badgeWrapper.appendChild(badgeBtn);
        form.appendChild(badgeWrapper);
      }
    }

    // Funciones de estado visual accesible
    const setError = (input, errorSpan, message) => {
      if (!input || !errorSpan) return;
      input.classList.add('input-error');
      input.setAttribute('aria-invalid', 'true');
      errorSpan.textContent = message;
      errorSpan.classList.add('active');
    };

    const clearError = (input, errorSpan) => {
      if (!input || !errorSpan) return;
      input.classList.remove('input-error');
      input.setAttribute('aria-invalid', 'false');
      errorSpan.textContent = '';
      errorSpan.classList.remove('active');
    };

    const showGeneralError = (message) => {
      if (!generalError) return;
      generalError.textContent = message;
      generalError.classList.add('active');
      generalError.style.display = 'flex';
    };

    const hideGeneralError = () => {
      if (!generalError) return;
      generalError.textContent = '';
      generalError.classList.remove('active');
      generalError.style.display = 'none';
    };

    // Validaciones individuales
    const validateName = () => {
      const val = nameInput ? nameInput.value.trim() : '';
      if (!val) {
        setError(nameInput, nameError, 'El nombre completo es obligatorio para registrar tu pase oficial.');
        return false;
      }
      const letterCount = (val.match(/[a-zA-ZáéíóúÁÉÍÓÚñÑ]/g) || []).length;
      if (letterCount < 3) {
        setError(nameInput, nameError, 'El nombre debe contener al menos 3 letras.');
        return false;
      }
      clearError(nameInput, nameError);
      return true;
    };

    const validateEmail = () => {
      const val = emailInput ? emailInput.value.trim() : '';
      if (!val) {
        setError(emailInput, emailError, 'El correo electrónico es obligatorio para enviarte el código.');
        return false;
      }
      if (!EMAIL_REGEX.test(val)) {
        setError(emailInput, emailError, 'Introduce una dirección de correo válida (ejemplo: nombre@dominio.com).');
        return false;
      }
      clearError(emailInput, emailError);
      return true;
    };

    const validateGoal = () => {
      const val = goalSelect ? goalSelect.value.trim() : '';
      if (!val) {
        setError(goalSelect, goalError, 'Por favor selecciona el objetivo prioritario para tu diagnóstico.');
        return false;
      }
      clearError(goalSelect, goalError);
      return true;
    };

    const validateTerms = () => {
      const isChecked = termsCheckbox ? termsCheckbox.checked : false;
      if (!isChecked) {
        setError(termsCheckbox, termsError, 'Debes aceptar los términos y la política de privacidad para reservar tu cupo.');
        return false;
      }
      clearError(termsCheckbox, termsError);
      return true;
    };

    /**
     * AUTOGUARDADO EN TIEMPO REAL MIENTRAS EL USUARIO ESCRIBE
     */
    if (nameInput) {
      nameInput.addEventListener('input', () => {
        safeStorage.setItem(STORAGE_KEYS.DRAFT_NOMBRE, nameInput.value);
        if (nameInput.classList.contains('input-error')) validateName();
      });
      nameInput.addEventListener('blur', validateName);
    }

    if (emailInput) {
      emailInput.addEventListener('input', () => {
        safeStorage.setItem(STORAGE_KEYS.DRAFT_EMAIL, emailInput.value);
        if (emailInput.classList.contains('input-error')) validateEmail();
      });
      emailInput.addEventListener('blur', validateEmail);
    }

    if (goalSelect) {
      goalSelect.addEventListener('change', () => {
        safeStorage.setItem(STORAGE_KEYS.DRAFT_OBJETIVO, goalSelect.value);
        if (goalSelect.classList.contains('input-error')) validateGoal();
      });
      goalSelect.addEventListener('blur', validateGoal);
    }

    if (termsCheckbox) {
      termsCheckbox.addEventListener('change', () => {
        if (termsCheckbox.classList.contains('input-error')) validateTerms();
      });
      termsCheckbox.addEventListener('blur', validateTerms);
    }

    /**
     * LIMPIEZA EXCLUSIVA DE BORRADOR TRAS CONVERSIÓN EXITOSA
     */
    const clearDraftStorage = () => {
      safeStorage.removeItem(STORAGE_KEYS.DRAFT_NOMBRE);
      safeStorage.removeItem(STORAGE_KEYS.DRAFT_EMAIL);
      safeStorage.removeItem(STORAGE_KEYS.DRAFT_OBJETIVO);
    };

    /**
     * ENVÍO ASÍNCRONO DEL FORMULARIO CON PREVENCIÓN DE DOBLE ENVÍO
     */
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideGeneralError();

      if (isSubmitting) return;

      // 1. Detección antispam mediante campo Honeypot
      if (honeypotInput && honeypotInput.value.trim() !== '') {
        console.warn('[Antispam] Intento de bot descartado.');
        clearDraftStorage();
        renderConversionCard({
          nombre: nameInput.value.trim() || 'Usuario',
          objetivo: goalSelect.value,
          codigo: '#FZ-VIP-7777',
          fecha: new Date().toISOString(),
        });
        return;
      }

      // 2. Validación de campos requeridos
      const isNameValid = validateName();
      const isEmailValid = validateEmail();
      const isGoalValid = validateGoal();
      const isTermsValid = validateTerms();

      if (!isNameValid || !isEmailValid || !isGoalValid || !isTermsValid) {
        const firstInvalid = form.querySelector('.input-error');
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      // 3. Bloqueo del botón y activación de bandera de envío
      isSubmitting = true;
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn ? submitBtn.textContent : 'Solicitar Mi Pase Gratuito';

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Enviando tu solicitud...';
      }

      const payload = {
        nombre: nameInput.value.trim(),
        email: emailInput.value.trim(),
        objetivo: goalSelect.value,
        _gotcha: '',
      };

      try {
        let response;
        const isDefaultPlaceholder = FORMSPREE_ENDPOINT.includes('[TU ENDPOINT]');

        if (isDefaultPlaceholder) {
          await new Promise((resolve) => setTimeout(resolve, 600));
          response = { ok: true, status: 200, json: async () => ({ ok: true }) };
        } else {
          response = await fetch(FORMSPREE_ENDPOINT, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify(payload),
          });
        }

        if (response && response.ok) {
          // Limpiar únicamente borradores temporales
          clearDraftStorage();

          // Generar código de pase y fecha
          const randomCode = (crypto.getRandomValues(new Uint32Array(1))[0] % 9000) + 1000;
          const passCode = `#FZ-VIP-${randomCode}`;
          const nowISO = new Date().toISOString();

          // Guardado acumulativo: almacenar el nuevo registro sin borrar los anteriores
          const newRecord = {
            nombre: payload.nombre,
            objetivo: payload.objetivo,
            codigo: passCode,
            fecha: nowISO,
          };

          const allRecords = getAllRegistrations();
          allRecords.push(newRecord);

          safeStorage.setItem(STORAGE_KEYS.REGISTRO, JSON.stringify(allRecords));

          // Renderizar la tarjeta mostrando el nuevo pase generado y el historial
          renderConversionCard(newRecord, allRecords);
        } else {
          let errorMsg = 'Hubo un problema al procesar tu solicitud. Tus datos siguen guardados; intenta nuevamente.';
          try {
            const data = await response.json();
            if (data && data.errors && data.errors.length) {
              errorMsg = data.errors.map((err) => err.message).join('. ');
            } else if (data && data.error) {
              errorMsg = data.error;
            }
          } catch {
            // Mantener mensaje por defecto
          }
          throw new Error(errorMsg);
        }
      } catch (err) {
        console.error('[Envío Formulario] Error:', err);

        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalBtnText;
        }

        const msg =
          err.message && !err.message.includes('fetch')
            ? err.message
            : 'No se pudo conectar con el servidor. Revisa tu conexión. Tus datos siguen guardados para que puedas reintentar.';

        showGeneralError(msg);

        if (generalError) {
          generalError.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      } finally {
        isSubmitting = false;
      }
    });
  };

  /**
   * INICIALIZACIÓN:
   * La página arranca SIEMPRE con el formulario limpio y vacío.
   * Se remueve la bandera de bloqueo 'CONVERTIDO' si venía de sesiones previas.
   */
  safeStorage.removeItem(STORAGE_KEYS.CONVERTIDO);
  setupInteractiveForm(true);
};

/**
 * --------------------------------------------------------------------------
 * INICIALIZACIÓN GLOBAL
 * Se ejecuta al dispararse el evento DOMContentLoaded
 * Secuencia: Migración -> Tema -> Sticky Header -> Animaciones -> Contadores -> Módulo de Formulario
 * --------------------------------------------------------------------------
 */
const init = () => {
  migrateLegacyStorageKeys();
  initTheme();
  initStickyHeader();
  initScrollAnimations();
  initCounters();
  initFormModule();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
