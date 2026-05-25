import { db, auth } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    serverTimestamp, 
    query, 
    where, 
    onSnapshot, 
    doc, 
    updateDoc, 
    deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const money = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP'
});

const initDashboard = () => {
    const merchantProfile = JSON.parse(localStorage.getItem('ordermo_merchant_profile') || 'null');
    
    // 1. Auth Guard - Only merchants allowed
    if (!merchantProfile && !auth.currentUser) {
        window.location.replace('index.html#login');
        return;
    }

    const modal = document.getElementById('addItemModal');
    const openBtn = document.getElementById('openAddItemModal');
    const closeBtn = document.getElementById('closeItemModal');
    const addForm = document.getElementById('addItemForm');
    const merchantDisplayName = document.getElementById('merchantDisplayName');
    const logoutBtn = document.getElementById('logoutBtn');

    if (merchantDisplayName) {
        merchantDisplayName.textContent = merchantProfile ? merchantProfile.business_name : "Merchant Partner";
    }

    // Apply Dynamic Terminology
    const category = (merchantProfile?.category || 'restaurant').toLowerCase();
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

    if (dashboardSubtext) dashboardSubtext.textContent = terms.subtext;
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
    openBtn?.addEventListener('click', () => modal.classList.add('active'));
    closeBtn?.addEventListener('click', () => modal.classList.remove('active'));
    window.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });

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
        const newItem = {
            merchantId: userId,
            merchantName: auth.currentUser ? (auth.currentUser.displayName || "My Store") : (merchantProfile ? merchantProfile.business_name : "Demo Store"),
            name: formData.get('name'),
            category: formData.get('category'),
            price: Number(formData.get('price')),
            description: formData.get('description'),
            available: true,
            createdAt: serverTimestamp()
        };

        try {
            await addDoc(collection(db, 'merchant_items'), newItem);
            addForm.reset();
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

    // Listeners for Data
    let unsubscribeItems = null;
    let unsubscribeOrders = null;

    const setupListeners = (user) => {
        if (unsubscribeItems) unsubscribeItems();
        if (unsubscribeOrders) unsubscribeOrders();

        const userId = user ? user.uid : (merchantProfile ? 'local_merchant' : 'test_user');
        
        // Items Listener
        const qItems = query(collection(db, 'merchant_items'), where('merchantId', '==', userId));
        unsubscribeItems = onSnapshot(qItems, (snapshot) => {
            renderDashboardItems(snapshot);
        });

        // Orders Listener
        const qOrders = query(collection(db, 'orders'));
        unsubscribeOrders = onSnapshot(qOrders, (snapshot) => {
            renderDashboardOrders(snapshot);
        });
    };

    onAuthStateChanged(auth, setupListeners);
};

function renderDashboardOrders(snapshot) {
    const list = document.getElementById('merchantOrdersList');
    const badge = document.getElementById('orderBadge');
    if (!list) return;

    const merchantProfile = JSON.parse(localStorage.getItem('ordermo_merchant_profile') || '{}');
    const businessName = (merchantProfile.business_name || '').toLowerCase();

    if (snapshot.empty) {
        list.innerHTML = '<p class="empty-msg">No orders received yet.</p>';
        if (badge) badge.style.display = 'none';
        return;
    }

    let pendingCount = 0;
    list.innerHTML = '';
    
    snapshot.forEach((docSnap) => {
        const order = docSnap.data();
        const id = docSnap.id;

        // Only show orders containing items from this merchant
        const hasMyItems = (order.items || []).some(
            item => (item.merchant || '').toLowerCase() === businessName
        );
        if (!hasMyItems) return;
        
        if (order.status === 'Pending merchant' || order.status === 'Preparing') {
            pendingCount++;
        }

        const card = document.createElement('div');
        card.className = 'order-card';
        const statusClass = `status-${order.status.toLowerCase().replace(/\s+/g, '-')}`;
        
        card.innerHTML = `
            <div class="order-card-header">
                <div>
                    <span class="order-id">Order #${id.slice(-6).toUpperCase()}</span>
                    <h4 class="customer-name">${order.customerName}</h4>
                </div>
                <span class="order-status-pill ${statusClass}">${order.status}</span>
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
                <span class="order-total">Total: ${money.format(order.total)}</span>
                <div class="order-actions">
                    ${order.status === 'Pending merchant' ? 
                        `<button class="btn-accept" data-order-id="${id}">Accept Order</button>
                         <button class="btn-reject" data-order-id="${id}">Reject</button>` : ''}
                    ${order.status === 'Preparing' ? 
                        `<button class="btn-prepared" data-order-id="${id}">Mark Prepared</button>` : ''}
                </div>
            </div>
        `;
        list.appendChild(card);
    });

    if (badge) {
        badge.textContent = pendingCount;
        badge.style.display = pendingCount > 0 ? 'inline-block' : 'none';
    }

    list.querySelectorAll('.btn-accept').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.dataset.orderId;
            try {
                await updateDoc(doc(db, 'orders', id), { status: 'Preparing' });
            } catch (err) {
                console.error("Order update error:", err);
            }
        });
    });

    list.querySelectorAll('.btn-reject').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.dataset.orderId;
            try {
                await updateDoc(doc(db, 'orders', id), { status: 'Rejected' });
            } catch (err) {
                console.error("Reject error:", err);
            }
        });
    });

    list.querySelectorAll('.btn-prepared').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.dataset.orderId;
            try {
                await updateDoc(doc(db, 'orders', id), { status: 'Waiting for rider' });
            } catch (err) {
                console.error("Order update error:", err);
            }
        });
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
