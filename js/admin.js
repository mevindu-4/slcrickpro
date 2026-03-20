document.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('cricpro_admin') === 'true') {
        showAdminContent();
    }
});

function loginAdmin() {
    const un = document.getElementById('admin-username').value.trim();
    const pw = document.getElementById('admin-password').value.trim();
    if (un === 'STgamage' && pw === 'ST23gamage@') {
        sessionStorage.setItem('cricpro_admin', 'true');
        showAdminContent();
        showToast('✅ Logged in successfully', 'success');
    } else {
        showToast('❌ Invalid credentials', 'error');
    }
}

function logoutAdmin() {
    sessionStorage.removeItem('cricpro_admin');
    document.getElementById('admin-username').value = '';
    document.getElementById('admin-password').value = '';
    document.getElementById('login-section').style.display = 'block';
    document.getElementById('admin-content-section').style.display = 'none';
}

function showAdminContent() {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('admin-content-section').style.display = 'block';
    switchAdminTab('requests');
}

function switchAdminTab(tabName) {
    document.querySelectorAll('.admin-panel').forEach(p => p.style.display = 'none');
    document.getElementById('tab-' + tabName).style.display = 'block';

    document.getElementById('btn-tab-requests').className = 'btn btn-sm ' + (tabName === 'requests' ? 'btn-primary' : 'btn-ghost');
    document.getElementById('btn-tab-matches').className = 'btn btn-sm ' + (tabName === 'matches' ? 'btn-primary' : 'btn-ghost');
    document.getElementById('btn-tab-store').className = 'btn btn-sm ' + (tabName === 'store' ? 'btn-primary' : 'btn-ghost');

    if (tabName === 'requests') renderRequests();
    if (tabName === 'matches') renderSystemMatches();
    if (tabName === 'store') renderStoreItems();
}

function renderRequests() {
    const container = document.getElementById('requests-list');
    const reqs = DB.getRequests();

    if (!reqs || !reqs.length) {
        container.innerHTML = `<div class="empty-state">
          <div class="empty-state-icon">📥</div>
          <div class="empty-state-title">Inbox is empty</div>
          <div class="empty-state-sub">No pending requests to score matches</div>
        </div>`;
        return;
    }

    const pendingList = reqs.filter(r => r.status === 'pending');

    if (!pendingList.length) {
        container.innerHTML = `<div class="empty-state">
          <div class="empty-state-icon">✔️</div>
          <div class="empty-state-title">All Caught Up</div>
          <div class="empty-state-sub">All requests have been approved or processed.</div>
        </div>`;
        return;
    }

    container.innerHTML = pendingList.map(req => {
        let titleBlock = '';
        let targetType = '';
        if (req.type === 'tournament') {
            const t = DB.getTournament(req.tournamentId);
            titleBlock = t ? `🏆 ${t.name}` : 'Unknown Tournament';
            targetType = 'Tournament';
        } else {
            const m = DB.getMatch(req.matchId);
            titleBlock = m ? `${m.scheduledName || 'Match'} - ${m.tournamentName || ''} (${m.team1} vs ${m.team2})` : 'Unknown Match';
            targetType = 'Match';
        }

        const date = new Date(req.createdAt).toLocaleString();

        return `<div class="request-card">
            <div class="req-info">
                <h3>📝 ${req.requesterName} wants to manage ${targetType}</h3>
                <p><strong>${targetType}:</strong> ${titleBlock}</p>
                <p><strong>Time:</strong> ${date}</p>
                ${req.organizerPhone ? `<p><strong>Organizer Phone:</strong> ${req.organizerPhone}</p>` : ''}
                <p><strong>Requested Password:</strong> <span style="font-family: monospace; background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px;">${req.requestedPassword}</span></p>
            </div>
            <div class="req-actions">
                <button class="btn btn-green" onclick="approveRequest('${req.id}')">✅ Approve</button>
            </div>
        </div>`;
    }).join('');
}

function approveRequest(reqId) {
    if (!confirm('Approve this request? The content will be unlocked with the custom password.')) return;

    const reqs = DB.getRequests();
    const req = reqs.find(r => r.id === reqId);
    if (!req) return;

    if (req.type === 'tournament') {
        const t = DB.getTournament(req.tournamentId);
        if (t) {
            t.password = req.requestedPassword;
            t.status = 'approved';
            DB.saveTournament(t);
        }
    } else {
        const m = DB.getMatch(req.matchId);
        if (m) {
            m.password = req.requestedPassword;
            m.status = 'approved';
            DB.saveMatch(m);
        }
    }

    req.status = 'approved';
    DB.saveRequests(reqs);
    renderRequests();

    showToast('✅ Request approved!', 'success');
}

function renderSystemMatches() {
    const container = document.getElementById('matches-list');
    const matches = DB.getMatches().filter(m => ['live', 'paused', 'setup'].includes(m.status));

    if (!matches.length) {
        container.innerHTML = `<div class="empty-state">
          <div class="empty-state-icon">🏏</div>
          <div class="empty-state-title">No Ongoing Matches</div>
          <div class="empty-state-sub">There are no matches currently running in the system.</div>
        </div>`;
        return;
    }

    container.innerHTML = matches.map(m => {
        const inn = m.innings ? m.innings[m.currentInnings] : null;
        let scoreStr = m.status.toUpperCase();
        if (inn && ['live', 'paused'].includes(m.status)) {
            const bpo = m.ballsPerOver || 6;
            scoreStr = `${inn.runs}/${inn.wickets} (${Math.floor(inn.balls / bpo)}.${inn.balls % bpo})`;
        }

        const typeStr = m.type === 'tournament' ? `🏆 ${m.tournamentName}` : 'Single Match';

        return `<div class="request-card">
            <div class="req-info">
                <h3>${m.team1} vs ${m.team2}</h3>
                <p><strong>Status:</strong> ${scoreStr} · <strong>Type:</strong> ${typeStr}</p>
                <p><strong>ID:</strong> <span style="font-family: monospace; font-size:11px">${m.id}</span></p>
            </div>
            <div class="req-actions">
                <button class="btn btn-red btn-sm" onclick="forceDeleteMatch('${m.id}')">🗑️ Delete</button>
            </div>
        </div>`;
    }).join('');
}

function forceDeleteMatch(mId) {
    if (!confirm('Are you strictly sure you want to delete this match? It will be removed from the system completely.')) return;
    DB.deleteMatch(mId);
    showToast('✅ Match deleted completely', 'success');
    renderSystemMatches();
}

function renderStoreItems() {
    const container = document.getElementById('store-list');
    const products = DB.getProducts();

    container.innerHTML = products.map(p => {
        let imgHtml = '';
        if (p.img) {
            imgHtml = `<img src="${p.img}" alt="${p.name}" onerror="this.src=''; this.style.display='none';" />`;
        } else {
            imgHtml = `<div style="font-size:48px;text-align:center;margin-bottom:12px;background:rgba(0,0,0,0.2);padding:20px;border-radius:8px">${p.imgFallback || '📦'}</div>`;
        }

        return `<div class="product-card">
            ${imgHtml}
            <h4>${p.name}</h4>
            <p style="color:var(--c-amber);font-weight:700;margin-bottom:6px">Rs. ${p.price}</p>
            <p style="color:var(--c-muted);font-size:13px;margin-bottom:16px">Stock: ${p.stock}</p>
            <div style="display: flex; gap: 8px; margin-top: auto;">
                <button class="btn btn-ghost btn-sm" style="flex:1" onclick="openEditProduct('${p.id}')">✏️ Edit</button>
                <button class="btn btn-red btn-sm" style="flex:1" onclick="deleteProduct('${p.id}')">🗑️ Delete</button>
            </div>
        </div>`;
    }).join('');
}

function openEditProduct(pId) {
    const p = DB.getProducts().find(x => x.id === pId);
    if (!p) return;
    document.getElementById('edit-prod-id').value = p.id;
    document.getElementById('edit-prod-name').value = p.name;
    document.getElementById('edit-prod-price').value = p.price;
    document.getElementById('edit-prod-stock').value = p.stock;
    document.getElementById('edit-prod-img').value = p.img || '';

    document.getElementById('modal-edit-product').style.display = 'flex';
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

function saveProductEdit() {
    const pId = document.getElementById('edit-prod-id').value;
    const prods = DB.getProducts();
    const idx = prods.findIndex(x => x.id === pId);
    if (idx !== -1) {
        prods[idx].name = document.getElementById('edit-prod-name').value.trim();
        prods[idx].price = parseFloat(document.getElementById('edit-prod-price').value) || 0;
        prods[idx].stock = parseInt(document.getElementById('edit-prod-stock').value) || 0;
        prods[idx].img = document.getElementById('edit-prod-img').value.trim();
        DB.saveProducts(prods);

        showToast('✅ Product updated!', 'success');
        closeModal('modal-edit-product');
        renderStoreItems();
    }
}

function showToast(msg, type = 'default') {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'toast show' + (type === 'error' ? ' toast-error' : type === 'success' ? ' toast-success' : '');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.className = 'toast'; }, 3200);
}

function encodeProductImage(input, targetId) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            document.getElementById(targetId).value = e.target.result;
            showToast('✅ Image loaded!', 'success');
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function openAddProduct() {
    document.getElementById('add-prod-name').value = '';
    document.getElementById('add-prod-price').value = '';
    document.getElementById('add-prod-stock').value = '';
    document.getElementById('add-prod-emoji').value = '📦';
    document.getElementById('add-prod-img').value = '';
    document.getElementById('add-prod-desc').value = '';
    document.getElementById('add-prod-category').value = 'bat';

    document.getElementById('modal-add-product').style.display = 'flex';
}

function saveNewProduct() {
    const name = document.getElementById('add-prod-name').value.trim();
    if (!name) {
        showToast('❌ Name is required', 'error');
        return;
    }
    const price = parseFloat(document.getElementById('add-prod-price').value) || 0;
    const stock = parseInt(document.getElementById('add-prod-stock').value) || 0;
    const imgFallback = document.getElementById('add-prod-emoji').value.trim() || '📦';
    const img = document.getElementById('add-prod-img').value.trim();
    const desc = document.getElementById('add-prod-desc').value.trim();
    const category = document.getElementById('add-prod-category').value || 'misc';

    const catLabels = { bat: 'Bat', ball: 'Ball', gear: 'Gear', equipment: 'Equipment', bag: 'Bag', shoes: 'Shoes', service: 'Service', misc: 'Misc' };

    const newProd = {
        id: 'PROD-' + Date.now().toString(36).toUpperCase(),
        name,
        price,
        stock,
        imgFallback,
        img,
        desc,
        category,
        rating: 4.0,
        brand: 'SLCRICKPRO',
        type: catLabels[category] || 'Misc'
    };

    const prods = DB.getProducts();
    prods.push(newProd);
    DB.saveProducts(prods);

    showToast('✅ Product added!', 'success');
    closeModal('modal-add-product');
    renderStoreItems();
}

function deleteProduct(pId) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    const prods = DB.getProducts();
    const updated = prods.filter(p => p.id !== pId);
    DB.saveProducts(updated);
    DB.deleteProductFromCloud(pId);
    showToast('✅ Product deleted!', 'success');
    renderStoreItems();
}
