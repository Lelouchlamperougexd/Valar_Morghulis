const state = {
  accountType: "user",
  token: localStorage.getItem("auth_playground_token") || "",
  user: readStoredUser(),
  lastResponse: null,
};

const PASSWORD_RULE_MESSAGE = "Пароль должен содержать минимум 8 символов, включая строчную букву, заглавную букву, цифру и спецсимвол.";

const elements = {
  overlay: document.getElementById("overlay"),
  registerModal: document.getElementById("register-modal"),
  loginModal: document.getElementById("login-modal"),
  registerStepCaption: document.getElementById("register-step-caption"),
  registerStep1: document.getElementById("register-step-1"),
  registerStep2: document.getElementById("register-step-2"),
  registerForm: document.getElementById("registration-form"),
  loginForm: document.getElementById("login-form"),
  roleBadge: document.getElementById("role-badge"),
  userFields: document.getElementById("user-fields"),
  companyFields: document.getElementById("company-fields"),
  accountChoices: document.querySelectorAll(".choice-card"),
  apiBase: document.getElementById("api-base"),
  responseOutput: document.getElementById("response-output"),
  jwtShort: document.getElementById("jwt-short"),
  sessionUser: document.getElementById("session-user"),
  sessionRole: document.getElementById("session-role"),
  btnMe: document.getElementById("btn-me"),
  btnLogout: document.getElementById("btn-logout"),
  activationToken: document.getElementById("activation-token"),
  btnActivate: document.getElementById("btn-activate"),
};

bindOpenButtons();
bindCloseButtons();
bindRegistrationFlow();
bindLoginFlow();
bindSessionActions();
bindActivationFlow();
initActivationTokenFromUrl();
renderSession();

function bindOpenButtons() {
  const registerButtons = [
    document.getElementById("open-register"),
    document.getElementById("hero-register"),
  ];
  const loginButtons = [
    document.getElementById("open-login"),
    document.getElementById("hero-login"),
  ];

  registerButtons.forEach((btn) => {
    btn?.addEventListener("click", () => openModal("register"));
  });

  loginButtons.forEach((btn) => {
    btn?.addEventListener("click", () => openModal("login"));
  });
}

function bindCloseButtons() {
  document.querySelectorAll("[data-close]").forEach((btn) => {
    btn.addEventListener("click", () => closeAllModals());
  });

  elements.overlay.addEventListener("click", closeAllModals);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAllModals();
    }
  });
}

function bindRegistrationFlow() {
  const nextButton = document.getElementById("register-next");
  const backButton = document.getElementById("register-back");

  nextButton.addEventListener("click", () => {
    setRegisterStep(2);
  });

  backButton.addEventListener("click", () => {
    setRegisterStep(1);
  });

  elements.accountChoices.forEach((choice) => {
    choice.addEventListener("click", () => {
      const input = choice.querySelector("input");
      input.checked = true;
      state.accountType = input.value;
      updateAccountChoiceUI();
      updateRoleUI();
    });
  });

  elements.registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const termsAccepted = document.getElementById("terms").checked;
    if (!termsAccepted) {
      notifyError("Нужно принять условия, чтобы продолжить.");
      return;
    }

    try {
      if (state.accountType === "user") {
        await submitUserRegistration();
      } else {
        await submitCompanyRegistration();
      }

      closeAllModals();
      setRegisterStep(1);
    } catch (error) {
      notifyError(error.message || "Ошибка при регистрации.");
    }
  });

  updateAccountChoiceUI();
  updateRoleUI();
}

function bindLoginFlow() {
  elements.loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const data = new FormData(elements.loginForm);
    const payload = {
      email: String(data.get("email") || "").trim(),
      password: String(data.get("password") || ""),
    };

    const adminLogin = document.getElementById("admin-login").checked;
    const endpoint = adminLogin
      ? "/authentication/admin/token"
      : "/authentication/token";

    try {
      const result = await apiRequest(endpoint, {
        method: "POST",
        body: payload,
      });

      state.token = result?.token || "";
      state.user = result?.user || null;

      localStorage.setItem("auth_playground_token", state.token);
      localStorage.setItem("auth_playground_user", JSON.stringify(state.user || null));

      renderSession();
      closeAllModals();
      notifySuccess("Логин успешен. JWT сохранен.");

      // Useful right after login: immediately verify token with /me.
      await loadCurrentUser();
    } catch (error) {
      notifyError(error.message || "Ошибка входа.");
    }
  });
}

function bindSessionActions() {
  elements.btnMe.addEventListener("click", async () => {
    try {
      await loadCurrentUser();
      notifySuccess("Профиль успешно получен.");
    } catch (error) {
      notifyError(error.message || "Не удалось получить профиль.");
    }
  });

  elements.btnLogout.addEventListener("click", () => {
    state.token = "";
    state.user = null;
    localStorage.removeItem("auth_playground_token");
    localStorage.removeItem("auth_playground_user");
    renderSession();
    pushResponse({
      info: "Токен и профиль очищены.",
    });
  });
}

function bindActivationFlow() {
  elements.btnActivate.addEventListener("click", async () => {
    const token = String(elements.activationToken.value || "").trim();
    if (!token) {
      notifyError("Вставь activation token перед активацией.");
      return;
    }

    try {
      await activateAccount(token);
      notifySuccess("Аккаунт активирован. Теперь можно выполнить вход.");
    } catch (error) {
      notifyError(error.message || "Не удалось активировать аккаунт.");
    }
  });

  elements.activationToken.addEventListener("keydown", async (event) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    elements.btnActivate.click();
  });
}

function openModal(type) {
  elements.overlay.classList.remove("hidden");

  if (type === "register") {
    elements.registerModal.classList.remove("hidden");
    requestAnimationFrame(() => {
      elements.registerModal.classList.add("active");
    });
    setRegisterStep(1);
    return;
  }

  elements.loginModal.classList.remove("hidden");
  requestAnimationFrame(() => {
    elements.loginModal.classList.add("active");
  });
}

function closeAllModals() {
  [elements.registerModal, elements.loginModal].forEach((modal) => {
    modal.classList.remove("active");
    setTimeout(() => {
      modal.classList.add("hidden");
    }, 180);
  });

  elements.overlay.classList.add("hidden");
}

function setRegisterStep(step) {
  const inFirstStep = step === 1;

  elements.registerStepCaption.textContent = inFirstStep ? "Шаг 1 из 2" : "Шаг 2 из 2";
  elements.registerStep1.classList.toggle("active", inFirstStep);
  elements.registerStep2.classList.toggle("active", !inFirstStep);
}

function updateAccountChoiceUI() {
  elements.accountChoices.forEach((choice) => {
    const input = choice.querySelector("input");
    choice.classList.toggle("selected", input.checked);
  });
}

function updateRoleUI() {
  const isUser = state.accountType === "user";

  if (isUser) {
    elements.roleBadge.textContent = "Тип: Пользователь";
    elements.userFields.classList.remove("hidden");
    elements.companyFields.classList.add("hidden");
    setRequiredForUserFields(true);
    setRequiredForCompanyFields(false);
    return;
  }

  const title = state.accountType === "agency" ? "Агентство" : "Застройщик";
  elements.roleBadge.textContent = `Тип: ${title}`;
  elements.userFields.classList.add("hidden");
  elements.companyFields.classList.remove("hidden");
  setRequiredForUserFields(false);
  setRequiredForCompanyFields(true);
}

function setRequiredForUserFields(isRequired) {
  const names = [
    "first_name",
    "last_name",
    "email",
    "phone",
    "password",
    "password_confirmation",
  ];

  names.forEach((name) => {
    const field = elements.registerForm.elements.namedItem(name);
    if (field) {
      field.required = isRequired;
    }
  });
}

function setRequiredForCompanyFields(isRequired) {
  const names = [
    "company_name",
    "registration_number",
    "city",
    "company_email",
    "company_phone",
    "contact_first_name",
    "contact_last_name",
    "job_title",
    "company_password",
    "company_password_confirmation",
  ];

  names.forEach((name) => {
    const field = elements.registerForm.elements.namedItem(name);
    if (field) {
      field.required = isRequired;
    }
  });
}

async function submitUserRegistration() {
  const data = new FormData(elements.registerForm);
  const payload = {
    first_name: String(data.get("first_name") || "").trim(),
    last_name: String(data.get("last_name") || "").trim(),
    email: String(data.get("email") || "").trim(),
    phone: String(data.get("phone") || "").trim(),
    password: String(data.get("password") || ""),
    password_confirmation: String(data.get("password_confirmation") || ""),
  };

  if (payload.password !== payload.password_confirmation) {
    throw new Error("Пароли не совпадают.");
  }

  if (!isStrongPassword(payload.password)) {
    throw new Error(PASSWORD_RULE_MESSAGE);
  }

  const response = await apiRequest("/authentication/user", {
    method: "POST",
    body: payload,
  });

  if (response?.token) {
    elements.activationToken.value = response.token;
  }

  // Registration returns activation token, not JWT. Keep it only in console.
  pushResponse({
    action: "register-user",
    response,
    hint: "Для JWT используй форму входа (Войти).",
  });

  const loginEmailField = elements.loginForm.elements.namedItem("email");
  if (loginEmailField) {
    loginEmailField.value = payload.email;
  }

  notifySuccess("Пользователь зарегистрирован. Проверь API Console.");
}

async function submitCompanyRegistration() {
  const data = new FormData(elements.registerForm);
  const payload = {
    company_name: String(data.get("company_name") || "").trim(),
    registration_number: String(data.get("registration_number") || "").trim(),
    city: String(data.get("city") || "").trim(),
    company_email: String(data.get("company_email") || "").trim(),
    company_phone: String(data.get("company_phone") || "").trim(),
    company_type: state.accountType,
    first_name: String(data.get("contact_first_name") || "").trim(),
    last_name: String(data.get("contact_last_name") || "").trim(),
    job_title: String(data.get("job_title") || "").trim(),
    password: String(data.get("company_password") || ""),
    password_confirmation: String(data.get("company_password_confirmation") || ""),
    invite_token: String(data.get("invite_token") || "").trim(),
  };

  if (payload.password !== payload.password_confirmation) {
    throw new Error("Пароли не совпадают.");
  }

  if (!isStrongPassword(payload.password)) {
    throw new Error(PASSWORD_RULE_MESSAGE);
  }

  if (!payload.invite_token) {
    delete payload.invite_token;
  }

  const response = await apiRequest("/authentication/company", {
    method: "POST",
    body: payload,
  });

  if (response?.token) {
    elements.activationToken.value = response.token;
  }

  pushResponse({
    action: "register-company",
    response,
    hint: "Для JWT используй форму входа (Войти).",
  });

  const loginEmailField = elements.loginForm.elements.namedItem("email");
  if (loginEmailField) {
    loginEmailField.value = payload.company_email;
  }

  notifySuccess("Компания зарегистрирована. Проверь API Console.");
}

async function loadCurrentUser() {
  if (!state.token) {
    throw new Error("Нет JWT. Сначала выполни вход.");
  }

  const user = await apiRequest("/authentication/me", {
    method: "GET",
    token: state.token,
  });

  state.user = user;
  localStorage.setItem("auth_playground_user", JSON.stringify(state.user));
  renderSession();
}

async function activateAccount(token) {
  const normalized = String(token || "").trim();
  await apiRequest(`/users/activate/${encodeURIComponent(normalized)}`, {
    method: "PUT",
  });

  pushResponse({
    action: "activate-user",
    token: normalized,
    result: "ok",
  });
}

async function apiRequest(path, options) {
  const base = normalizeBase(elements.apiBase.value);
  const url = `${base}${path}`;

  const headers = {
    "Content-Type": "application/json",
  };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const fetchOptions = {
    method: options.method || "GET",
    headers,
  };

  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  let response;
  try {
    response = await fetch(url, fetchOptions);
  } catch (error) {
    pushResponse({
      path,
      request: options.body || null,
      network_error: error.message,
    });
    throw new Error("Сеть недоступна. Проверь backend и CORS.");
  }

  const text = await response.text();
  const parsed = safeJsonParse(text);

  pushResponse({
    url,
    method: fetchOptions.method,
    status: response.status,
    request: options.body || null,
    response: parsed,
  });

  if (!response.ok) {
    const reason = parsed?.error || parsed?.message || text || "Ошибка запроса";
    const normalizedReason =
      typeof reason === "string" && reason.includes("failed on the 'password' tag")
        ? PASSWORD_RULE_MESSAGE
        : reason;
    throw new Error(normalizedReason);
  }

  return unwrapApiData(parsed);
}

function unwrapApiData(payload) {
  if (!payload || typeof payload !== "object") {
    return payload;
  }

  if (Object.prototype.hasOwnProperty.call(payload, "data")) {
    return payload.data;
  }

  return payload;
}

function initActivationTokenFromUrl() {
  const tokenFromUrl = parseTokenFromLocation();
  if (!tokenFromUrl) {
    return;
  }

  elements.activationToken.value = tokenFromUrl;
  pushResponse({
    info: "Токен активации найден в URL. Нажми кнопку 'Активировать'.",
    token: tokenFromUrl,
  });
}

function parseTokenFromLocation() {
  const queryToken = new URLSearchParams(window.location.search).get("token");
  if (queryToken) {
    return decodeURIComponent(queryToken);
  }

  const hash = String(window.location.hash || "");
  const hashMatch = hash.match(/token=([^&]+)/);
  if (hashMatch?.[1]) {
    return decodeURIComponent(hashMatch[1]);
  }

  const path = String(window.location.pathname || "");
  const confirmMatch = path.match(/^\/confirm\/([^/]+)$/);
  if (confirmMatch?.[1]) {
    return decodeURIComponent(confirmMatch[1]);
  }

  const activateMatch = path.match(/^\/activate\/([^/]+)$/);
  if (activateMatch?.[1]) {
    return decodeURIComponent(activateMatch[1]);
  }

  return "";
}

function isStrongPassword(password) {
  const value = String(password || "");
  const hasLower = /[a-z]/.test(value);
  const hasUpper = /[A-Z]/.test(value);
  const hasDigit = /\d/.test(value);
  const hasSpecial = /[^A-Za-z0-9]/.test(value);
  return value.length >= 8 && hasLower && hasUpper && hasDigit && hasSpecial;
}

function renderSession() {
  const tokenPreview = state.token
    ? `${state.token.slice(0, 20)}...${state.token.slice(-10)}`
    : "нет";

  const username = state.user?.username || state.user?.email || "не авторизован";
  const role = state.user?.role?.name || state.user?.role || "-";

  elements.jwtShort.textContent = tokenPreview;
  elements.sessionUser.textContent = username;
  elements.sessionRole.textContent = role;
}

function pushResponse(payload) {
  state.lastResponse = payload;
  elements.responseOutput.textContent = JSON.stringify(payload, null, 2);
}

function notifySuccess(message) {
  pushResponse({
    success: true,
    message,
    last_response: state.lastResponse,
  });
}

function notifyError(message) {
  pushResponse({
    success: false,
    error: message,
    last_response: state.lastResponse,
  });
}

function normalizeBase(base) {
  let value = String(base || "").trim();

  if (!value) {
    value = "http://localhost:8080/v1";
    elements.apiBase.value = value;
  }

  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function safeJsonParse(text) {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function readStoredUser() {
  const raw = localStorage.getItem("auth_playground_user");
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
