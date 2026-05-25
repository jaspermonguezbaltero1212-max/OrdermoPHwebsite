import { db, auth } from './firebase-config.js';
import { 
    collection, 
    serverTimestamp, 
    query, 
    where, 
    getDocs, 
    onSnapshot, 
    doc, 
    setDoc, 
    updateDoc, 
    deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged, signInWithEmailAndPassword, sendPasswordResetEmail, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const money = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP'
});

const READABLE_IDS = {
    fruits: ['Mango', 'Banana', 'Apple', 'Grape', 'Peach', 'Cherry', 'Melon', 'Papaya', 'Guava', 'Lychee', 'Durian', 'Pomelo', 'Coconut', 'Pineapple', 'Strawberry'],
    animals: ['Tiger', 'Eagle', 'Panda', 'Dolphin', 'Falcon', 'Otter', 'Cobra', 'Koala', 'Raven', 'Lynx', 'Owl', 'Bear', 'Wolf', 'Hawk', 'Fox'],
    subjects: ['Math', 'Science', 'History', 'Art', 'Music', 'Physics', 'Poetry', 'Chemistry', 'Biology', 'Algebra', 'Geometry', 'Grammar', 'Geography', 'Astronomy', 'Logic']
};

function generateReadableId(category = 'fruits') {
    const list = READABLE_IDS[category] || READABLE_IDS.fruits;
    const word = list[Math.floor(Math.random() * list.length)];
    const num = Math.floor(Math.random() * 900) + 100;
    return `${word}${num}`;
}

const initDashboard = async () => {
    const merchantProfile = JSON.parse(localStorage.getItem('ordermo_merchant_profile') || 'null');
    const loginSection = document.getElementById('merchantLoginSection');
    const dashboardMain = document.getElementById('merchantDashboardMain');
    const loginForm = document.getElementById('merchantLoginForm');

    function showDashboard() {
        if (loginSection) loginSection.style.display = 'none';
        if (dashboardMain) dashboardMain.style.display = 'block';
        const lo = document.getElementById('logoutBtn');
        if (lo) lo.style.display = '';
    }

    function showLogin() {
        if (loginSection) loginSection.style.display = 'block';
        if (dashboardMain) dashboardMain.style.display = 'none';
        const lo = document.getElementById('logoutBtn');
        if (lo) lo.style.display = 'none';
    }

    let resolvedProfile = merchantProfile;

    const updateDisplayName = () => {
        const el = document.getElementById('merchantDisplayName');
        if (el) el.textContent = resolvedProfile ? (resolvedProfile.contact_name || resolvedProfile.business_name) : (auth.currentUser?.email?.split('@')[0] || 'Merchant Partner');
    };

    const updateBadge = () => {
        const badge = document.getElementById('approvalBadge');
        if (badge && resolvedProfile) {
            if (resolvedProfile.status === 'approved') {
                badge.className = 'approval-badge approved';
                badge.textContent = '✓ Approved';
                badge.style.display = 'inline-flex';
            } else {
                badge.className = 'approval-badge pending';
                badge.textContent = '⏳ Pending Approval';
                badge.style.display = 'inline-flex';
            }
        }
    };

    const fetchAndShow = async () => {
        if (!auth.currentUser) { showLogin(); return; }
        try {
            const uid = auth.currentUser.uid;
            const email = auth.currentUser.email;
            const collections = ['merchants', 'merchant_applications'];
            for (const col of collections) {
                let snap = await getDocs(query(collection(db, col), where('userId', '==', uid)));
                if (snap.empty && email) {
                    snap = await getDocs(query(collection(db, col), where('email', '==', email)));
                }
                if (!snap.empty) {
                    const data = snap.docs[0].data();
                    localStorage.setItem('ordermo_merchant_profile', JSON.stringify(data));
                    resolvedProfile = data;
                    showDashboard();
                    updateDisplayName();
                    updateBadge();
                    return;
                }
            }
            // Auto-create minimal merchant document
            const newDoc = {
                userId: uid,
                email: email,
                business_name: email.split('@')[0] + "'s Store",
                contact_name: email.split('@')[0],
                address: '',
                province: '',
                city: '',
                phone: '',
                category: 'restaurant',
                status: 'approved',
                approvedAt: new Date().toISOString()
            };
            const merchId = 'merchant_' + uid.substring(0, 8);
            await setDoc(doc(db, 'merchant_applications', merchId), newDoc);
            await setDoc(doc(db, 'merchants', merchId), newDoc);
            localStorage.setItem('ordermo_merchant_profile', JSON.stringify(newDoc));
            resolvedProfile = newDoc;
        } catch (err) {
            console.error("[Merchant Dashboard] Error fetching/creating merchant profile:", err);
        }
        showDashboard();
        updateDisplayName();
        updateBadge();
    };

    // Already logged in via localStorage profile
    if (merchantProfile) {
        resolvedProfile = merchantProfile;
        showDashboard();
        updateDisplayName();
        updateBadge();
    } 
    // Not logged in - try Firebase Auth session
    else if (auth.currentUser) {
        await fetchAndShow();
    }
    // No auth at all - show login form
    else {
        showLogin();
    }

    // Handle login form
    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(loginForm);
        const email = formData.get('email');
        const password = formData.get('password');
        const btn = loginForm.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Signing in...';
        try {
            await signInWithEmailAndPassword(auth, email, password);
            alert('Signed in successfully! Loading dashboard...');
            location.reload();
        } catch (err) {
            btn.disabled = false;
            btn.textContent = 'Sign In';
            if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                alert('Invalid email or password. Please try again.');
            } else if (err.code === 'auth/invalid-email') {
                alert('Please enter a valid email address.');
            } else {
                alert('Login failed: ' + (err.message || 'Unknown error'));
            }
        }
    });

    // Forgot password
    const forgotPwBtn = document.getElementById('merchantForgotPw');
    const resetMsg = document.getElementById('merchantResetMsg');
    forgotPwBtn?.addEventListener('click', async (e) => {
        e.preventDefault();
        const emailInput = loginForm?.querySelector('input[name="email"]');
        const email = emailInput?.value.trim();
        if (!email) {
            if (resetMsg) { resetMsg.className = 'reset-msg error'; resetMsg.textContent = 'Please enter your email address first.'; }
            return;
        }
        try {
            await sendPasswordResetEmail(auth, email);
            if (resetMsg) { resetMsg.className = 'reset-msg success'; resetMsg.textContent = 'Password reset email sent! Check your inbox.'; }
        } catch (err) {
            let msg = 'Failed to send reset email.';
            if (err.code === 'auth/user-not-found') msg = 'No account found with this email.';
            else if (err.code === 'auth/invalid-email') msg = 'Invalid email address.';
            if (resetMsg) { resetMsg.className = 'reset-msg error'; resetMsg.textContent = msg; }
        }
    });

    const modal = document.getElementById('addItemModal');
    const openBtn = document.getElementById('openAddItemModal');
    const closeBtn = document.getElementById('closeItemModal');
    const addForm = document.getElementById('addItemForm');
    const merchantDisplayName = document.getElementById('merchantDisplayName');
    const logoutBtn = document.getElementById('logoutBtn');

    // Apply Dynamic Terminology
    const category = (resolvedProfile?.category || 'restaurant').toLowerCase();
    const isRetail = category === 'grocery' || category === 'others';
    
    const terms = {
        btnText: isRetail ? '+ Add New Product' : '+ Add New Dish',
        modalTitle: isRetail ? 'Add New Product' : 'Add Menu Item',
        itemNameLabel: isRetail ? 'Product Name' : 'Dish Name',
        itemPlaceholder: isRetail ? 'e.g. Fresh Eggs (Dozen)' : 'e.g. Special Burger',
        descPlaceholder: isRetail ? 'Product details, weight, or size.' : 'What\'s in this dish?',
        sectionTitle: isRetail ? 'Your Products' : 'Your Menu Items',
        tabLabel: isRetail ? 'Inventory Management' : 'Menu Management',
        subtext: isRetail ? 'Manage your products and store settings' : 'Manage your menu and store settings'
    };

    if (openBtn) openBtn.textContent = terms.btnText;
    const modalTitle = document.getElementById('modalTitle');
    if (modalTitle) modalTitle.textContent = terms.modalTitle;
    
    const dashboardSubtext = document.getElementById('dashboardStoreName');
    const nameLabel = document.getElementById('itemNameLabel');
    const nameInput = addForm?.querySelector('input[name="name"]');
    const descArea = addForm?.querySelector('textarea[name="description"]');
    const sectionTitle = document.getElementById('menuSectionTitle');
    const menuTabBtn = document.getElementById('menuTabBtn');
    const categorySelect = document.getElementById('itemCategorySelect');

    if (dashboardSubtext) {
        const city = resolvedProfile?.city || '';
        const prov = resolvedProfile?.province || '';
        const loc = city && prov ? `${city}, ${prov}` : prov || city || '';
        dashboardSubtext.textContent = loc ? `${terms.subtext} — ${loc}` : terms.subtext;
    }
    if (nameLabel) nameLabel.textContent = terms.itemNameLabel;
    if (nameInput) nameInput.placeholder = terms.itemPlaceholder;
    if (descArea) descArea.placeholder = terms.descPlaceholder;
    if (sectionTitle) sectionTitle.textContent = terms.sectionTitle;
    if (menuTabBtn) menuTabBtn.textContent = terms.tabLabel;

    if (categorySelect) {
        if (isRetail) {
            categorySelect.innerHTML = `
                <option value="Essentials">Essentials / Staples</option>
                <option value="Produce">Fresh Produce</option>
                <option value="Personal Care">Personal Care</option>
                <option value="Household">Household Items</option>
            `;
        } else {
            categorySelect.innerHTML = `
                <option value="Main Course">Main Course / Meals</option>
                <option value="Sides">Sides / Appetizers</option>
                <option value="Drinks">Drinks / Beverages</option>
                <option value="Desserts">Desserts / Sweets</option>
            `;
        }
    }

    // Modal Control
    const cancelBtn = document.getElementById('cancelItemBtn');
    const descTextarea = addForm?.querySelector('textarea[name="description"]');
    const charCount = document.querySelector('.char-count');

    function openModal() {
        modal.classList.add('active');
        addForm?.reset();
        if (charCount) charCount.textContent = '0 / 500';
    }

    function closeModal() {
        modal.classList.remove('active');
        addForm?.reset();
        if (charCount) charCount.textContent = '0 / 500';
    }

    openBtn?.addEventListener('click', openModal);
    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    // Character counter
    descTextarea?.addEventListener('input', () => {
        const len = descTextarea.value.length;
        const max = descTextarea.getAttribute('maxlength') || 500;
        if (charCount) charCount.textContent = `${len} / ${max}`;
    });

    // Tab Switching
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            tab.classList.add('active');
            const target = tab.dataset.tab === 'menu' ? 'menuTab' : 'ordersTab';
            document.getElementById(target)?.classList.add('active');
        });
    });

    // Add Item logic
    addForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userId = auth.currentUser ? auth.currentUser.uid : (merchantProfile ? 'local_merchant' : 'test_user');

        const formData = new FormData(addForm);
        const profile = JSON.parse(localStorage.getItem('ordermo_merchant_profile') || '{}');
        const newItem = {
            merchantId: userId,
            merchantName: profile.business_name || auth.currentUser?.displayName || "Pinirito",
            name: formData.get('name'),
            category: formData.get('category'),
            price: Number(formData.get('price')),
            description: formData.get('description'),
            available: true,
            createdAt: serverTimestamp()
        };

        try {
            const itemId = generateReadableId('subjects');
            await setDoc(doc(db, 'merchant_items', itemId), newItem);
            addForm.reset();
            if (charCount) charCount.textContent = '0 / 500';
            modal.classList.remove('active');
        } catch (err) {
            console.error("Error adding item:", err);
            alert("Failed to save item.");
        }
    });

    // Logout
    logoutBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('ordermo_merchant_profile');
        if (auth.currentUser) {
            signOut(auth).then(() => {
                window.location.replace('index.html#home');
            });
        } else {
            window.location.replace('index.html#home');
        }
    });

    // Create Test Order button
    document.getElementById('createTestOrderBtn')?.addEventListener('click', async () => {
        if (!auth.currentUser) {
            alert('Please sign in first.');
            return;
        }
        const profile = JSON.parse(localStorage.getItem('ordermo_merchant_profile') || '{}');
        const businessName = profile.business_name || auth.currentUser.displayName || 'Test Store';
        const uid = auth.currentUser.uid;
        try {
            const orderId = generateReadableId('fruits');
            await setDoc(doc(db, 'orders', orderId), {
                userId: uid,
                customerName: 'Test Customer',
                items: [
                    { id: 'test-item-1', name: 'Sample Food Item', merchant: businessName, merchantId: uid, area: 'Test Area', price: 150, quantity: 2 },
                    { id: 'test-item-2', name: 'Sample Drink', merchant: businessName, merchantId: uid, area: 'Test Area', price: 50, quantity: 1 }
                ],
                merchantIds: [uid],
                deliveryAddress: { houseNo: '123', street: 'Test Street', barangay: 'Brgy Test', city: 'Test City' },
                paymentMethod: 'Cash',
                subtotal: 350,
                deliveryFee: 49,
                total: 399,
                status: 'Pending merchant',
                createdAt: new Date().toISOString(),
                timestamp: serverTimestamp()
            });
            alert('Test order created! It will appear in the approval area above.');
        } catch (err) {
            console.error('Test order error:', err);
            alert('Failed to create test order. Check console for details.\nError: ' + err.message);
        }
    });

    // Listeners for Data
    let unsubscribeItems = null;
    let unsubscribeOrders = null;

    const setupListeners = (user) => {
        if (unsubscribeItems) unsubscribeItems();
        if (unsubscribeOrders) unsubscribeOrders();

        // Show dashboard when user is authenticated (handles delayed auth resolution)
        if (user && loginSection && dashboardMain) {
            showDashboard();
        }

        const userId = user ? user.uid : (merchantProfile ? 'local_merchant' : 'test_user');
        
        // Items Listener
        const qItems = query(collection(db, 'merchant_items'), where('merchantId', '==', userId));
        unsubscribeItems = onSnapshot(qItems, (snapshot) => {
            renderDashboardItems(snapshot);
        });

        // Orders Listener - fetch ALL orders, filter client-side for reliability
        const qOrders = query(collection(db, 'orders'));
        unsubscribeOrders = onSnapshot(qOrders, (snapshot) => {
            renderDashboardOrders(snapshot);
        });
    };

    onAuthStateChanged(auth, setupListeners);
};

function renderDashboardOrders(snapshot) {
    const badge = document.getElementById('orderBadge');
    const approvalList = document.getElementById('approvalOrdersList');
    const progressList = document.getElementById('progressOrdersList');
    const deliveryList = document.getElementById('deliveryOrdersList');
    const completedList = document.getElementById('completedOrdersList');
    if (!approvalList) return;

    const merchantProfile = JSON.parse(localStorage.getItem('ordermo_merchant_profile') || '{}');
    const businessName = (merchantProfile.business_name || '').trim().toLowerCase();
    const myUserId = merchantProfile.userId || (auth.currentUser ? auth.currentUser.uid : '');
    console.log("[Merchant Dashboard] Orders snapshot size:", snapshot.size, "userId:", myUserId);

    // Clear all lists
    approvalList.innerHTML = '';
    progressList.innerHTML = '';
    deliveryList.innerHTML = '';
    completedList.innerHTML = '';

    if (snapshot.empty) {
        approvalList.innerHTML = '<p class="empty-msg">No orders yet. Make sure you added menu items and a customer ordered them.</p>';
        if (badge) badge.style.display = 'none';
        return;
    }

    let pendingCount = 0;
    const sections = { approval: [], progress: [], delivery: [], completed: [] };
    
    snapshot.forEach((docSnap) => {
        const order = docSnap.data();
        const id = docSnap.id;

        if (order.status === 'Pending merchant') {
            pendingCount++;
        }

        const statusClass = `status-${order.status.toLowerCase().replace(/\s+/g, '-')}`;
        const addr = order.deliveryAddress || {};
        const addrStr = `${addr.houseNo || ''} ${addr.street || ''}, ${addr.barangay || ''}, ${addr.city || ''}`;
        const estTime = order.estimatedMinutes ? `⏱ ~${order.estimatedMinutes} mins` : '';
        const cardHtml = `
            <div class="order-card">
                <div class="order-card-header">
                    <div>
                        <span class="order-id">Order #${id.slice(-6).toUpperCase()}</span>
                        <h4 class="customer-name">${order.customerName || 'Customer'}</h4>
                    </div>
                    <span class="order-status-pill ${statusClass}">${order.status}</span>
                </div>
                ${estTime ? `<div class="order-est-time">${estTime}</div>` : ''}
                <div class="order-delivery-addr">
                    📍 ${addrStr || 'No address'}
                </div>
                <div class="order-items">
                    ${order.items.map(item => `
                        <div class="order-item-row">
                            <span>${item.quantity}x ${item.name}</span>
                            <span>${money.format(item.price * item.quantity)}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="order-footer">
                    <span class="order-total">Total: ${money.format(order.total || 0)}</span>
                    <div class="order-actions">
                        ${order.status === 'Pending merchant' ? 
                            `<button class="btn-accept" data-order-id="${id}">✓ Approve Order</button>
                             <button class="btn-reject" data-order-id="${id}">✕ Reject</button>` : ''}
        ${order.status === 'Waiting for rider' ? 
            `<span class="waiting-rider-msg">Rider will be assigned shortly...</span>` : ''}
                    </div>
                </div>
                ${order.status === 'Out for delivery' && order.riderName ? 
                    `<div class="rider-info"><span>🛵 Rider: ${order.riderName}</span></div>` : ''}
                ${order.status === 'Out for delivery' ? `<div id="merchantMap_${id}" class="tracking-map-sm"></div>` : ''}
                ${order.status === 'Out for delivery' ? 
                    `<a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addrStr)}" target="_blank" class="btn-submit" style="justify-content:center;margin-top:8px;font-size:12px;padding:6px 12px;">Open in Google Maps</a>` : ''}
            </div>
        `;

        if (order.status === 'Pending merchant') {
            sections.approval.push({ id, ...order, _cardHtml: cardHtml });
        } else if (order.status === 'Waiting for rider') {
            sections.progress.push({ id, ...order, _cardHtml: cardHtml });
        } else if (order.status === 'Out for delivery') {
            sections.delivery.push({ id, ...order, _cardHtml: cardHtml });
        } else {
            sections.completed.push({ id, ...order, _cardHtml: cardHtml });
        }
    });

    const renderSection = (listEl, orders, emptyMsg) => {
        if (orders.length === 0) { listEl.innerHTML = `<p class="empty-msg">${emptyMsg}</p>`; return; }
        orders.forEach(o => {
            const wrapper = document.createElement('div');
            wrapper.innerHTML = o._cardHtml;
            listEl.appendChild(wrapper.firstElementChild);
        });
    };

    renderSection(approvalList, sections.approval, 'No orders waiting for approval.');
    renderSection(progressList, sections.progress, 'No orders in progress.');
    renderSection(deliveryList, sections.delivery, 'No orders out for delivery.');
    renderSection(completedList, sections.completed, 'No completed orders.');

    document.getElementById('approvalCount').textContent = sections.approval.length;
    document.getElementById('progressCount').textContent = sections.progress.length;
    document.getElementById('deliveryCount').textContent = sections.delivery.length;
    document.getElementById('completedCount').textContent = sections.completed.length;

    if (badge) {
        badge.textContent = pendingCount;
        badge.style.display = pendingCount > 0 ? 'inline-block' : 'none';
    }

    // --- Approval Area (always visible at top) ---
    const approvalArea = document.getElementById('approvalArea');
    const approvalAreaOrders = document.getElementById('approvalAreaOrders');
    const approvalAreaCount = document.getElementById('approvalAreaCount');
    if (approvalArea && approvalAreaOrders) {
        approvalAreaOrders.innerHTML = '';
        if (sections.approval.length > 0) {
            sections.approval.forEach(o => {
                const wrapper = document.createElement('div');
                wrapper.innerHTML = o._cardHtml;
                approvalAreaOrders.appendChild(wrapper.firstElementChild);
            });
        } else {
            approvalAreaOrders.innerHTML = '<p class="empty-msg">No orders waiting for approval yet. Add menu items so customers can order!</p>';
        }
        if (approvalAreaCount) approvalAreaCount.textContent = sections.approval.length;
    }

    // Event listeners
    document.querySelectorAll('.btn-accept').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.dataset.orderId;
            const mins = prompt('Estimated total time (minutes):', '30');
            if (mins === null) return;
            const estimatedMinutes = parseInt(mins) || 30;
            try {
                await updateDoc(doc(db, 'orders', id), { status: 'Waiting for rider', estimatedMinutes });
            } catch (err) { console.error("Accept error:", err); }
        });
    });
    document.querySelectorAll('.btn-reject').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.dataset.orderId;
            try {
                await updateDoc(doc(db, 'orders', id), { status: 'Rejected' });
            } catch (err) { console.error("Reject error:", err); }
        });
    });

    // Live tracking maps for Out for delivery orders
    const merchantMaps = window._merchantMaps || (window._merchantMaps = {});
    sections.delivery.forEach(order => {
        const mapId = `merchantMap_${order.id}`;
        if (typeof L === 'undefined') return;
        if (!merchantMaps[order.id] && order.riderLat && order.riderLng) {
            setTimeout(() => {
                const mapEl = document.getElementById(mapId);
                if (!mapEl) return;
                const m = L.map(mapEl).setView([order.riderLat, order.riderLng], 14);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(m);
                const riderMrk = L.marker([order.riderLat, order.riderLng], {
                    icon: L.divIcon({ html: '🛵', iconSize: [24,24], className: '' })
                }).addTo(m).bindPopup('Rider');
                merchantMaps[order.id] = { map: m, riderMarker: riderMrk, destMarker: null };
                const addr = order.deliveryAddress || {};
                const addrStr = `${addr.houseNo || ''} ${addr.street || ''}, ${addr.barangay || ''}, ${addr.city || ''}`;
                fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addrStr)}&limit=1`)
                    .then(r => r.json()).then(geo => {
                        if (geo.length > 0) {
                            const dm = L.marker([parseFloat(geo[0].lat), parseFloat(geo[0].lon)], {
                                icon: L.divIcon({ html: '📍', iconSize: [24,24], className: '' })
                            }).addTo(m).bindPopup('Delivery Address');
                            merchantMaps[order.id].destMarker = dm;
                        }
                    }).catch(() => {});
            }, 100);
        } else if (merchantMaps[order.id] && order.riderLat && order.riderLng) {
            // Live update rider position
            merchantMaps[order.id].riderMarker.setLatLng([order.riderLat, order.riderLng]);
            merchantMaps[order.id].map.setView([order.riderLat, order.riderLng], 14);
        }
    });
    // Clean up maps for orders no longer out for delivery
    Object.keys(merchantMaps).forEach(id => {
        if (!sections.delivery.find(o => o.id === id)) {
            merchantMaps[id].map.remove();
            delete merchantMaps[id];
        }
    });
}

function renderDashboardItems(snapshot) {
    const list = document.getElementById('merchantItemsList');
    const totalEl = document.getElementById('statTotalItems');
    const activeEl = document.getElementById('statActiveItems');
    if (!list) return;

    let total = 0;
    let active = 0;

    if (snapshot.empty) {
        list.innerHTML = '<p class="empty-msg">No items found. Add your first product!</p>';
        if (totalEl) totalEl.textContent = '0';
        if (activeEl) activeEl.textContent = '0';
        return;
    }

    list.innerHTML = '';
    snapshot.forEach((docSnap) => {
        const item = docSnap.data();
        const id = docSnap.id;
        total++;
        if (item.available) active++;

        const row = document.createElement('div');
        row.className = 'menu-item-row';
        row.innerHTML = `
            <div class="item-info-cell">
                <strong>${item.name}</strong>
                <span>${item.description || 'No description'}</span>
            </div>
            <div class="category-cell">${item.category}</div>
            <div class="price-cell">PHP ${item.price.toFixed(2)}</div>
            <div class="availability-cell">
                <label class="switch">
                    <input type="checkbox" ${item.available ? 'checked' : ''} data-toggle-id="${id}">
                    <span class="slider"></span>
                </label>
            </div>
            <div class="actions-cell">
                <button class="btn-delete" data-delete-id="${id}">Delete</button>
            </div>
        `;
        list.appendChild(row);
    });

    if (totalEl) totalEl.textContent = total;
    if (activeEl) activeEl.textContent = active;

    list.querySelectorAll('[data-toggle-id]').forEach(checkbox => {
        checkbox.addEventListener('change', async (e) => {
            const id = e.target.dataset.toggleId;
            const isChecked = e.target.checked;
            try {
                await updateDoc(doc(db, 'merchant_items', id), { available: isChecked });
            } catch (err) {
                console.error("Update error:", err);
                e.target.checked = !isChecked;
            }
        });
    });

    list.querySelectorAll('[data-delete-id]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if (confirm("Are you sure you want to delete this item?")) {
                try {
                    await deleteDoc(doc(db, 'merchant_items', e.target.dataset.deleteId));
                } catch (err) {
                    console.error("Delete error:", err);
                }
            }
        });
    });
}

initDashboard();
