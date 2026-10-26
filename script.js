const TOKEN_KEY = 'kalendarz_admin_token';

const bookingForm = document.getElementById('bookingForm');
const adminForm = document.getElementById('adminBookingForm');
const adminSection = document.getElementById('adminSection');
const adminPanel = document.getElementById('adminPanel');
const adminPasswordInput = document.getElementById('adminPassword');
const selectedDateLabel = document.getElementById('selectedDateLabel');
const calendarGrid = document.getElementById('calendarGrid');
const currentMonthLabel = document.getElementById('currentMonth');
const dayBookingsList = document.getElementById('dayBookings');
const adminBookingList = document.getElementById('adminBookingList');

const state = {
  currentMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  selectedDate: formatDateKey(new Date()),
  bookings: [],
  meta: {},
  adminToken: null,
  adminLoggedIn: false,
};

initialize();

async function initialize() {
  setDefaultDateInputs();
  bindEvents();
  renderCalendar();
  renderSelectedDateBookings();
  renderAdminBookings();

  try {
    state.adminToken = sessionStorage.getItem(TOKEN_KEY);
  } catch (error) {
    state.adminToken = null;
  }

  await refreshBookings();

  if (state.adminToken) {
    await showAdminPanel();
  }
}

async function refreshBookings() {
  try {
    state.bookings = await loadBookings();
  } catch (error) {
    alert('Nie udało się wczytać spotkań. Sprawdź config.js i połączenie.');
  }
  renderCalendar();
  renderSelectedDateBookings();
  renderAdminBookings();
}

async function showAdminPanel() {
  try {
    state.meta = await loadMeta();
  } catch (error) {
    // token wygasł lub jest nieprawidłowy
    state.adminToken = null;
    try {
      sessionStorage.removeItem(TOKEN_KEY);
    } catch (e) {}
    return;
  }
  state.adminLoggedIn = true;
  adminSection.classList.remove('hidden');
  document.getElementById('toggleAdmin').textContent = 'Ukryj panel';
  adminPanel.classList.remove('hidden');
  renderAdminBookings();
}

function bindEvents() {
  bookingForm.addEventListener('submit', handleBookingSubmit);
  adminForm.addEventListener('submit', handleAdminBookingSubmit);
  document.getElementById('prevMonth').addEventListener('click', () => {
    state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() - 1, 1);
    renderCalendar();
  });

  document.getElementById('nextMonth').addEventListener('click', () => {
    state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() + 1, 1);
    renderCalendar();
  });

  document.getElementById('toggleAdmin').addEventListener('click', () => {
    const isHidden = adminSection.classList.contains('hidden');
    adminSection.classList.toggle('hidden', !isHidden);
    document.getElementById('toggleAdmin').textContent = isHidden ? 'Ukryj panel' : 'Pokaż panel';
  });

  document.getElementById('loginAdmin').addEventListener('click', async () => {
    const email = document.getElementById('adminEmail').value.trim();
    const password = adminPasswordInput.value;

    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      alert('Nieprawidłowy e-mail lub hasło.');
      return;
    }

    const { access_token: token } = await response.json();
    state.adminToken = token;
    try {
      sessionStorage.setItem(TOKEN_KEY, token);
    } catch (error) {}
    adminPasswordInput.value = '';
    await showAdminPanel();
  });
}

function setDefaultDateInputs() {
  const today = new Date();
  const formattedToday = formatDateKey(today);
  const defaultTime = '09:00';
  document.getElementById('meetingDate').value = formattedToday;
  document.getElementById('meetingTime').value = defaultTime;
  document.getElementById('adminMeetingDate').value = formattedToday;
  document.getElementById('adminMeetingTime').value = defaultTime;
}

async function handleBookingSubmit(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const firstName = document.getElementById('firstName').value.trim();
  const lastName = document.getElementById('lastName').value.trim();
  const meetingDate = document.getElementById('meetingDate').value;
  const meetingTime = document.getElementById('meetingTime').value;
  const urgent = document.getElementById('urgent').checked;

  if (!firstName || !lastName || !meetingDate || !meetingTime) {
    alert('Uzupełnij imię, nazwisko, datę i godzinę spotkania.');
    return;
  }

  const newBooking = {
    id: crypto.randomUUID(),
    firstName,
    lastName,
    date: meetingDate,
    time: meetingTime,
    urgent,
    createdAt: new Date().toISOString(),
  };

  try {
    await saveBooking(newBooking);
  } catch (error) {
    alert('Nie udało się zapisać spotkania. Spróbuj ponownie.');
    return;
  }

  state.bookings.push(newBooking);
  state.selectedDate = meetingDate;
  const selectedDateObj = new Date(`${meetingDate}T12:00:00`);
  state.currentMonth = new Date(selectedDateObj.getFullYear(), selectedDateObj.getMonth(), 1);
  renderCalendar();
  renderSelectedDateBookings();
  renderAdminBookings();
  form.reset();
  document.getElementById('meetingDate').value = meetingDate;
  document.getElementById('meetingTime').value = meetingTime;
  document.getElementById('selectedDateLabel').textContent = formatDisplayDate(meetingDate);
}

async function handleAdminBookingSubmit(event) {
  event.preventDefault();

  if (!state.adminLoggedIn) {
    alert('Zaloguj się do panelu administratora.');
    return;
  }

  const firstName = document.getElementById('adminFirstName').value.trim();
  const lastName = document.getElementById('adminLastName').value.trim();
  const meetingDate = document.getElementById('adminMeetingDate').value;
  const meetingTime = document.getElementById('adminMeetingTime').value;
  const urgent = document.getElementById('adminUrgent').checked;

  if (!firstName || !lastName || !meetingDate || !meetingTime) {
    alert('Uzupełnij dane spotkania w panelu administratora.');
    return;
  }

  const newBooking = {
    id: crypto.randomUUID(),
    firstName,
    lastName,
    date: meetingDate,
    time: meetingTime,
    urgent,
    createdAt: new Date().toISOString(),
  };

  try {
    await saveBooking(newBooking);
  } catch (error) {
    alert('Nie udało się zapisać spotkania. Spróbuj ponownie.');
    return;
  }

  state.bookings.push(newBooking);
  state.meta = await loadMeta().catch(() => state.meta);
  state.selectedDate = meetingDate;
  const selectedDateObj = new Date(`${meetingDate}T12:00:00`);
  state.currentMonth = new Date(selectedDateObj.getFullYear(), selectedDateObj.getMonth(), 1);
  renderCalendar();
  renderSelectedDateBookings();
  renderAdminBookings();
  adminForm.reset();
  document.getElementById('adminMeetingDate').value = meetingDate;
  document.getElementById('adminMeetingTime').value = meetingTime;
}

function renderCalendar() {
  currentMonthLabel.textContent = new Intl.DateTimeFormat('pl-PL', {
    month: 'long',
    year: 'numeric',
  }).format(state.currentMonth);

  const firstDayOfMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth(), 1);
  const startWeekday = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() + 1, 0).getDate();
  const previousMonthDays = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth(), 0).getDate();
  const cellsCount = Math.ceil((startWeekday + daysInMonth) / 7) * 7;

  calendarGrid.innerHTML = '';

  for (let i = 0; i < cellsCount; i += 1) {
    const dateNumber = i - startWeekday + 1;
    const day = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth(), dateNumber);
    const isCurrentMonth = day.getMonth() === state.currentMonth.getMonth();
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'day-cell';

    if (!isCurrentMonth) {
      cell.classList.add('outside-month');
    }

    if (formatDateKey(day) === state.selectedDate) {
      cell.classList.add('selected');
    }

    if (formatDateKey(day) === formatDateKey(new Date())) {
      cell.classList.add('today');
    }

    if (isCurrentMonth) {
      const bookingsForDay = state.bookings.filter((booking) => booking.date === formatDateKey(day));
      const urgentCount = bookingsForDay.filter((booking) => booking.urgent).length;
      const normalCount = bookingsForDay.length - urgentCount;

      const dayNumber = document.createElement('span');
      dayNumber.className = 'day-number';
      dayNumber.textContent = dateNumber;
      cell.appendChild(dayNumber);

      const badges = document.createElement('div');
      badges.className = 'day-badges';

      if (urgentCount > 0) {
        const urgentBadge = document.createElement('span');
        urgentBadge.className = 'badge urgent';
        urgentBadge.textContent = `!${urgentCount}`;
        badges.appendChild(urgentBadge);
      }

      if (normalCount > 0) {
        const normalBadge = document.createElement('span');
        normalBadge.className = 'badge normal';
        normalBadge.textContent = `${normalCount}`;
        badges.appendChild(normalBadge);
      }

      cell.appendChild(badges);
    } else {
      const placeholder = document.createElement('span');
      placeholder.className = 'day-number';
      placeholder.textContent = i < startWeekday ? previousMonthDays - startWeekday + i + 1 : dateNumber;
      cell.appendChild(placeholder);
    }

    cell.addEventListener('click', () => {
      state.selectedDate = formatDateKey(day);
      renderCalendar();
      renderSelectedDateBookings();
    });

    calendarGrid.appendChild(cell);
  }
}

function renderSelectedDateBookings() {
  const dateLabel = formatDisplayDate(state.selectedDate);
  selectedDateLabel.textContent = dateLabel;

  const bookingsForDate = state.bookings
    .filter((booking) => booking.date === state.selectedDate)
    .sort((a, b) => {
      const timeA = a.time || '00:00';
      const timeB = b.time || '00:00';
      const result = timeA.localeCompare(timeB);
      if (result !== 0) return result;
      return Number(b.urgent) - Number(a.urgent);
    });

  if (!bookingsForDate.length) {
    dayBookingsList.innerHTML = '<li class="empty-state">Brak rezerwacji na ten dzień.</li>';
    return;
  }

  dayBookingsList.innerHTML = bookingsForDate
    .map(
      (booking) => `
        <li>
          <div class="booking-item">
            <div class="booking-item-info">
              <strong>${escapeHtml(booking.firstName)} ${escapeHtml(booking.lastName)}</strong>
              <span class="meta">${formatDisplayDate(booking.date)} · ${booking.time || '00:00'}</span>
            </div>
            <span class="pill ${booking.urgent ? 'urgent' : 'normal'}">${booking.urgent ? 'Pilne' : 'Normalne'}</span>
          </div>
        </li>
      `,
    )
    .join('');
}

function renderAdminBookings() {
  if (!state.adminLoggedIn) {
    adminBookingList.innerHTML = '<li class="empty-state">Zaloguj się, aby zarządzać spotkaniami.</li>';
    return;
  }

  const sortedBookings = [...state.bookings].sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.time || '00:00'}`);
    const dateB = new Date(`${b.date}T${b.time || '00:00'}`);
    return dateA - dateB;
  });

  if (!sortedBookings.length) {
    adminBookingList.innerHTML = '<li class="empty-state">Brak spotkań do zarządzania.</li>';
    return;
  }

  adminBookingList.innerHTML = sortedBookings
    .map(
      (booking) => `
        <li>
          <div class="admin-item-info">
            <strong>${escapeHtml(booking.firstName)} ${escapeHtml(booking.lastName)}</strong>
            <span class="meta">${formatDisplayDate(booking.date)} · ${booking.time || '00:00'}</span>
            <span class="pill ${booking.urgent ? 'urgent' : 'normal'}">${booking.urgent ? 'Pilne' : 'Normalne'}</span>
            ${renderMeta(state.meta[booking.id])}
          </div>
          <button class="delete-btn" type="button" data-id="${booking.id}">Usuń</button>
        </li>
      `,
    )
    .join('');

  adminBookingList.querySelectorAll('.delete-btn').forEach((button) => {
    button.addEventListener('click', async () => {
      const id = button.dataset.id;
      try {
        await deleteBooking(id);
      } catch (error) {
        alert('Nie udało się usunąć spotkania.');
        return;
      }
      state.bookings = state.bookings.filter((booking) => booking.id !== id);
      renderCalendar();
      renderSelectedDateBookings();
      renderAdminBookings();
    });
  });
}

async function api(path, { method = 'GET', body, prefer } = {}) {
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${state.adminToken || SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  };
  if (prefer) headers.Prefer = prefer;

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`${method} ${path}: ${response.status}`);
  }
  return method === 'GET' ? response.json() : null;
}

async function loadBookings() {
  const rows = await api('bookings?select=*&order=date,time');
  return rows.map((row) => ({
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    date: row.date,
    time: row.time.slice(0, 5),
    urgent: row.urgent,
    createdAt: row.created_at,
  }));
}

async function loadMeta() {
  const rows = await api('booking_meta?select=*');
  return Object.fromEntries(rows.map((row) => [row.booking_id, row]));
}

async function saveBooking(booking) {
  await api('bookings', {
    method: 'POST',
    prefer: 'return=minimal',
    body: {
      id: booking.id,
      first_name: booking.firstName,
      last_name: booking.lastName,
      date: booking.date,
      time: booking.time,
      urgent: booking.urgent,
    },
  });

  // IP dopisuje serwer (trigger), po stronie klienta zbieramy resztę
  await api('booking_meta', {
    method: 'POST',
    prefer: 'return=minimal',
    body: { booking_id: booking.id, device: await collectDeviceInfo() },
  }).catch(() => {});
}

async function deleteBooking(id) {
  await api(`bookings?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
}

async function collectDeviceInfo() {
  const nav = navigator;
  let highEntropy = {};
  try {
    highEntropy = (await nav.userAgentData?.getHighEntropyValues([
      'platform',
      'platformVersion',
      'architecture',
      'model',
      'fullVersionList',
    ])) || {};
  } catch (error) {}

  let gpu = null;
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
    if (ext) gpu = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
  } catch (error) {}

  const connection = nav.connection || {};

  let battery = null;
  try {
    const b = await nav.getBattery?.();
    if (b) battery = { level: b.level, charging: b.charging };
  } catch (error) {}

  let storage = null;
  try {
    const estimate = await nav.storage?.estimate?.();
    if (estimate) storage = { quotaMB: Math.round(estimate.quota / 1048576), usageMB: Math.round(estimate.usage / 1048576) };
  } catch (error) {}

  const matches = (query) => window.matchMedia(query).matches;

  return {
    battery,
    storage,
    online: nav.onLine,
    vendor: nav.vendor,
    screenAvailable: `${screen.availWidth}x${screen.availHeight}`,
    orientation: screen.orientation?.type,
    prefersDark: matches('(prefers-color-scheme: dark)'),
    prefersReducedMotion: matches('(prefers-reduced-motion: reduce)'),
    hdr: matches('(dynamic-range: high)'),
    pointerFine: matches('(pointer: fine)'),
    hoverCapable: matches('(hover: hover)'),
    saveData: connection.saveData,
    pdfViewer: nav.pdfViewerEnabled,
    webdriver: nav.webdriver,
    localTime: new Date().toString(),
    userAgent: nav.userAgent,
    uaData: highEntropy,
    platform: nav.platform,
    language: nav.language,
    languages: nav.languages,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset: new Date().getTimezoneOffset(),
    screen: `${screen.width}x${screen.height}`,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    pixelRatio: window.devicePixelRatio,
    colorDepth: screen.colorDepth,
    cpuCores: nav.hardwareConcurrency,
    memoryGB: nav.deviceMemory,
    touchPoints: nav.maxTouchPoints,
    gpu,
    connection: { type: connection.effectiveType, downlink: connection.downlink, rtt: connection.rtt },
    cookiesEnabled: nav.cookieEnabled,
    doNotTrack: nav.doNotTrack,
    referrer: document.referrer,
    page: location.href,
  };
}

function renderMeta(meta) {
  if (!meta) return '';
  const device = meta.device || {};
  const summary = `IP: ${meta.ip || 'brak'} · ${device.platform || '?'} · ${device.screen || '?'}`;
  return `
    <details class="meta-details">
      <summary class="meta">${escapeHtml(summary)}</summary>
      <pre class="meta">${escapeHtml(JSON.stringify(device, null, 2))}</pre>
    </details>
  `;
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateKey) {
  if (!dateKey) return 'Brak daty';

  const date = new Date(`${dateKey}T12:00:00`);
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
