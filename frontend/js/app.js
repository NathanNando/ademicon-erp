const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));
const money = (value) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value || 0));

async function getSessionToken() {
  const { data } = await window.supabaseClient.auth.getSession();
  return data.session?.access_token || null;
}

async function api(path, options = {}) {
  const token = await getSessionToken();
  const response = await fetch(`${window.APP_CONFIG.API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.detail || 'Falha na comunicação com a API');
  }

  return body;
}

function showMessage(element, message, error = false) {
  if (!element) return;

  element.textContent = message;
  element.className = `message ${error ? 'error' : 'success'}`;
}

async function logout() {
  await window.supabaseClient.auth.signOut();
  window.location.href = 'login.html';
}

function bindLogoutButtons() {
  $$('[data-logout]').forEach((button) => {
    button.addEventListener('click', logout);
  });
}

async function loginPage() {
  const form = $('#login-form');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const message = $('#login-message');
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;

    try {
      const email = $("#email").value.trim();

const { data, error } =
  await window.supabaseClient.auth.signInWithPassword({
    email,
    password: $("#password").value
  });

if (error) throw error;

const fullName =
  data.user.user_metadata?.full_name ||
  email.split("@")[0];

try {
  // Cria o registro pendente caso ainda não exista.
  await api("/api/register", {
    method: "POST",
    body: JSON.stringify({
      full_name: fullName,
      email
    })
  });

  // Só permite entrar se o funcionário estiver liberado.
  await api("/api/me");

  location.href = "dashboard.html";
} catch (error) {
  await window.supabaseClient.auth.signOut();

  showMessage(
    message,
    error.message.includes("liberado") ||
    error.message.includes("Acesso não liberado")
      ? "Sua conta ainda aguarda a aprovação do administrador."
      : error.message,
    true
  );
}
    } catch (error) {
      showMessage(message, error.message || 'Não foi possível entrar.', true);
      await window.supabaseClient.auth.signOut();
    } finally {
      submit.disabled = false;
    }
  });
}

async function protectPage() {
  const token = await getSessionToken();
  if (!token) {
    window.location.href = 'login.html';
    return false;
  }

  try {
    const me = await api('/api/me');
    const name = $('#user-name');

    if (name) name.textContent = me.full_name;
    $$('[data-role="admin"]').forEach((element) => {
      element.hidden = me.role !== 'admin';
    });

    return true;
  } catch {
    await window.supabaseClient.auth.signOut();
    window.location.href = 'login.html';
    return false;
  }
}

async function dashboardPage() {
  if (!$('#sales-chart')) return;
  if (!(await protectPage())) return;

  try {
    const data = await api('/api/dashboard');

    $('#kpi-clients').textContent = data.clients_total;
    $('#kpi-proposals').textContent = data.proposals_total;
    $('#kpi-sales').textContent = money(data.sales_month);
    $('#kpi-goal').textContent = `${data.goal_percent}%`;

    const sales = data.monthly_sales.length ? data.monthly_sales : [{ month: 'Sem dados', total: 0 }];
    new Chart($('#sales-chart'), {
      type: 'line',
      data: {
        labels: sales.map((item) => item.month),
        datasets: [
          {
            label: 'Vendas confirmadas',
            data: sales.map((item) => item.total),
            borderColor: '#ed1018',
            backgroundColor: 'rgba(237,16,24,.12)',
            fill: true,
            tension: 0.35,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: { beginAtZero: true },
        },
      },
    });

    const statuses = data.proposal_status.length ? data.proposal_status : [{ status: 'Sem dados', total: 0 }];
    new Chart($('#proposal-chart'), {
      type: 'doughnut',
      data: {
        labels: statuses.map((item) => item.status),
        datasets: [
          {
            data: statuses.map((item) => item.total),
            backgroundColor: ['#ed1018', '#a60008', '#202020', '#777777', '#d9d9d9', '#ff666b'],
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' },
        },
      },
    });
  } catch (error) {
    showMessage($('#dashboard-message'), error.message, true);
  }
}

async function clientsPage() {
  const form = $('#client-form');
  if (!form) return;
  if (!(await protectPage())) return;

  const message = $('#clients-message');

  async function load(q = '') {
    const rows = await api(`/api/clients?q=${encodeURIComponent(q)}`);
    const tbody = $('#clients-body');
    tbody.replaceChildren();

    rows.forEach((client) => {
      const tr = document.createElement('tr');
      const values = [client.full_name, client.email || '—', client.phone || '—', client.document || '—'];

      values.forEach((value) => {
        const td = document.createElement('td');
        td.textContent = value;
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });

    $('#clients-empty').hidden = rows.length !== 0;
  }

  try {
    await load();
  } catch (error) {
    showMessage(message, error.message, true);
  }

  $('#client-search').addEventListener('input', async (event) => {
    try {
      await load(event.target.value);
    } catch (error) {
      showMessage(message, error.message, true);
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    try {
      await api('/api/clients', {
        method: 'POST',
        body: JSON.stringify({
          full_name: $('#client-name').value.trim(),
          email: $('#client-email').value.trim() || null,
          phone: $('#client-phone').value.trim() || null,
          document: $('#client-document').value.trim() || null,
        }),
      });

      form.reset();
      showMessage(message, 'Cliente cadastrado com sucesso.');
      await load($('#client-search').value);
    } catch (error) {
      showMessage(message, error.message, true);
    }
  });
}

async function employeesPage() {
  if (!$('#employee-form')) return;
  if (!(await protectPage())) return;

  const message = $('#employees-message');

  async function load() {
    const rows = await api('/api/admin/employees');
    const tbody = $('#employees-body');
    tbody.replaceChildren();

    rows.forEach((emp) => {
      const tr = document.createElement('tr');
      const values = [emp.full_name, emp.email, emp.role, emp.active ? 'Liberado' : 'Bloqueado'];

      values.forEach((value) => {
        const td = document.createElement('td');
        td.textContent = value;
        tr.appendChild(td);
      });

      const actionCell = document.createElement('td');
      const button = document.createElement('button');
      button.className = 'button button-small';
      button.textContent = emp.active ? 'Bloquear' : 'Liberar';

      button.addEventListener('click', async () => {
        try {
          await api(`/api/admin/employees/${emp.id}/access?active=${!emp.active}`, { method: 'PATCH' });
          await load();
        } catch (error) {
          showMessage(message, error.message, true);
        }
      });

      actionCell.appendChild(button);
      tr.appendChild(actionCell);
      tbody.appendChild(tr);
    });
  }

  try {
    await load();
  } catch (error) {
    showMessage(message, error.message, true);
  }

  $('#employee-form').addEventListener('submit', async (event) => {
    event.preventDefault();

    try {
      await api('/api/admin/employees', {
        method: 'POST',
        body: JSON.stringify({
          full_name: $('#employee-name').value.trim(),
          email: $('#employee-email').value.trim(),
          role: $('#employee-role').value,
        }),
      });

      event.target.reset();
      showMessage(message, 'Convite enviado. O acesso começa bloqueado até liberação do administrador.');
      await load();
    } catch (error) {
      showMessage(message, error.message, true);
    }
  });
}

async function signupPage() {
  const form = $('#signup-form');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const message = $('#signup-message');
    const button = form.querySelector('button[type="submit"]');
    const fullName = $('#signup-name').value.trim();
    const email = $('#signup-email').value.trim();
    const password = $('#signup-password').value;
    const confirmation = $('#signup-confirm-password').value;

    if (password.length < 8) {
      showMessage(message, 'A senha deve ter pelo menos 8 caracteres.', true);
      return;
    }

    if (password !== confirmation) {
      showMessage(message, 'As senhas não coincidem.', true);
      return;
    }

    button.disabled = true;

    try {
      const { data, error } = await window.supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });

      if (error) throw error;

      if (!data.session) {
        showMessage(
          message,
          'Conta criada! Confirme seu e-mail. Depois, entre no sistema para concluir o cadastro.',
          false,
        );
        return;
      }

      await api('/api/register', {
        method: 'POST',
        body: JSON.stringify({
          full_name: fullName,
          email,
        }),
      });

      await window.supabaseClient.auth.signOut();
      showMessage(message, 'Cadastro recebido! Aguarde a aprovação do administrador.', false);
      form.reset();
    } catch (error) {
      showMessage(message, error.message || 'Não foi possível criar a conta.', true);
    } finally {
      button.disabled = false;
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  bindLogoutButtons();
  loginPage();
  signupPage();
  dashboardPage();
  clientsPage();
  employeesPage();
});
