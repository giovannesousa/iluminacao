(function() {
  const apiBase = '';
  let token = localStorage.getItem('admin_token') || null;
  let currentUser = localStorage.getItem('admin_user') || null;
  let allOccurrences = [];
  let selectedOccurrence = null;
  let map = null;
  let markers = [];

  function initMap() {
    if (map) return;
    map = L.map('map').setView([-23.55, -46.63], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(map);
  }

  function updateAuthUI() {
    const loginContainer = document.getElementById('loginContainer');
    const navbar = document.getElementById('navbar');
    const mainContainer = document.getElementById('mainContainer');
    
    if (token) {
      loginContainer.style.display = 'none';
      navbar.style.display = 'flex';
      mainContainer.classList.add('active');
      if (currentUser) {
        document.getElementById('userDisplay').textContent = currentUser;
        document.getElementById('userInitial').textContent = currentUser.charAt(0).toUpperCase();
      }
      setTimeout(() => {
        if (!map) initMap();
      }, 100);
    } else {
      loginContainer.style.display = 'flex';
      navbar.style.display = 'none';
      mainContainer.classList.remove('active');
    }
  }

  async function apiCall(path, opts = {}) {
    opts.headers = opts.headers || {};
    opts.headers['Content-Type'] = 'application/json';
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    
    const res = await fetch(path, opts);
    if (res.status === 401) {
      logout();
      throw new Error('Unauthorized');
    }
    return res.json();
  }

  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('errorMessage');
    
    try {
      errorMsg.classList.remove('show');
      const data = await apiCall('/admin/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      
      token = data.token;
      currentUser = username;
      localStorage.setItem('admin_token', token);
      localStorage.setItem('admin_user', username);
      
      document.getElementById('loginForm').reset();
      updateAuthUI();
      loadOccurrences();
    } catch (error) {
      errorMsg.textContent = '❌ Credenciais inválidas';
      errorMsg.classList.add('show');
    }
  });

  document.getElementById('btnLogout').addEventListener('click', logout);

  function logout() {
    token = null;
    currentUser = null;
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    updateAuthUI();
    clearMarkers();
  }

  async function loadOccurrences() {
    try {
      const status = document.querySelector('input[name="statusFilter"]:checked').value;
      const q = status ? `?status=${status}` : '';
      allOccurrences = await apiCall(`/admin/occurrences${q}`);
      
      renderList();
      renderStats();
      clearMarkers();
      addAllMarkers();
    } catch (error) {
      console.error('Load error:', error);
    }
  }

  function renderList() {
    const list = document.getElementById('occurrencesList');
    document.getElementById('listCount').textContent = allOccurrences.length;
    
    if (allOccurrences.length === 0) {
      list.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><div>Nenhuma ocorrência</div></div>';
      return;
    }
    
    list.innerHTML = allOccurrences.map(occ => `
      <div class="occurrence-item ${occ.status === 'resolvido' ? 'resolved' : ''} ${selectedOccurrence?.id === occ.id ? 'active' : ''}" data-id="${occ.id}">
        <div class="occurrence-item-title">#${occ.id} - ${occ.problema}</div>
        <span class="occurrence-item-status status-${occ.status}">${occ.status}</span>
      </div>
    `).join('');
    
    document.querySelectorAll('.occurrence-item').forEach(el => {
      el.addEventListener('click', () => selectOccurrence(parseInt(el.dataset.id)));
    });
  }

  function renderStats() {
    const total = allOccurrences.length;
    const pending = allOccurrences.filter(o => o.status === 'pendente').length;
    const resolved = allOccurrences.filter(o => o.status === 'resolvido').length;
    
    document.getElementById('totalCount').textContent = total;
    document.getElementById('pendingCount').textContent = pending;
    document.getElementById('resolvedCount').textContent = resolved;
  }

  function selectOccurrence(id) {
    selectedOccurrence = allOccurrences.find(o => o.id === id);
    if (!selectedOccurrence) return;
    
    renderList();
    renderDetailPanel();
    
    if (map && selectedOccurrence) {
      map.setView([selectedOccurrence.latitude, selectedOccurrence.longitude], 16);
    }
  }

  function renderDetailPanel() {
    const detailContent = document.getElementById('detailContent');
    const detailActions = document.getElementById('detailActions');
    
    if (!selectedOccurrence) {
      detailContent.innerHTML = '<div class="empty-state"><i class="fas fa-mouse-pointer"></i><div>Selecione uma ocorrência</div></div>';
      detailActions.style.display = 'none';
      return;
    }
    
    const createdAt = new Date(selectedOccurrence.data_criacao).toLocaleString('pt-BR');
    
    detailContent.innerHTML = `
      <div class="detail-item">
        <div class="detail-label">ID</div>
        <div class="detail-value">#${selectedOccurrence.id}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Problema</div>
        <div class="detail-value">${selectedOccurrence.problema}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Status</div>
        <div class="detail-value">
          <span class="occurrence-item-status status-${selectedOccurrence.status}">${selectedOccurrence.status}</span>
        </div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Data</div>
        <div class="detail-value">${createdAt}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Localização</div>
        <div class="detail-value">${selectedOccurrence.latitude.toFixed(6)}, ${selectedOccurrence.longitude.toFixed(6)}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Descrição</div>
        <div class="detail-value">${selectedOccurrence.descricao || '(sem descrição)'}</div>
      </div>
    `;
    
    if (selectedOccurrence.status === 'pendente') {
      detailActions.style.display = 'flex';
      document.getElementById('btnResolve').disabled = false;
    } else {
      detailActions.style.display = 'none';
    }
  }

  document.getElementById('btnResolve').addEventListener('click', async () => {
    if (!selectedOccurrence) return;
    
    try {
      document.getElementById('btnResolve').disabled = true;
      await apiCall(`/admin/occurrences/${selectedOccurrence.id}/resolve`, { method: 'PUT' });
      await loadOccurrences();
      selectedOccurrence = null;
      renderDetailPanel();
    } catch (error) {
      console.error('Resolve error:', error);
      document.getElementById('btnResolve').disabled = false;
    }
  });

  function addAllMarkers() {
    allOccurrences.forEach(occ => {
      const color = occ.status === 'resolvido' ? '#27ae60' : '#e74c3c';
      const icon = L.divIcon({
        html: `<i class="fas fa-map-pin" style="color: ${color}; font-size: 24px;"></i>`,
        iconSize: [24, 24],
        className: 'custom-marker'
      });
      const marker = L.marker([occ.latitude, occ.longitude], { icon }).addTo(map);
      marker.bindPopup(`
        <strong>#${occ.id} - ${occ.problema}</strong><br/>
        Status: <span class="occurrence-item-status status-${occ.status}">${occ.status}</span><br/>
        ${occ.descricao || ''}
      `);
      markers.push(marker);
    });
  }

  function clearMarkers() {
    markers.forEach(m => map.removeLayer(m));
    markers = [];
  }

  document.getElementById('btnRefresh').addEventListener('click', loadOccurrences);
  document.querySelectorAll('input[name="statusFilter"]').forEach(el => {
    el.addEventListener('change', loadOccurrences);
  });

  updateAuthUI();
  if (token) loadOccurrences();
})();
