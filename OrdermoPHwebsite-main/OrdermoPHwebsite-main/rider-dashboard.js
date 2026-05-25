import { db, auth } from './firebase-config.js';
import { 
    collection,
    query,
    where,
    onSnapshot,
    doc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const money = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP'
});

const initDashboard = () => {
    const riderProfile = JSON.parse(localStorage.getItem('ordermo_rider_profile') || 'null');

    if (!riderProfile && !auth.currentUser) {
        window.location.replace('index.html#login');
        return;
    }

    const riderDisplayName = document.getElementById('riderDisplayName');
    const riderAreaInfo = document.getElementById('riderAreaInfo');
    const riderProfileInfo = document.getElementById('riderProfileInfo');
    const logoutBtn = document.getElementById('logoutBtn');

    const name = riderProfile?.full_name || 'Rider';
    const area = riderProfile?.area || 'your area';

    if (riderDisplayName) riderDisplayName.textContent = name;
    if (riderAreaInfo) riderAreaInfo.textContent = `Delivering in ${area}`;

    if (riderProfileInfo) {
        riderProfileInfo.innerHTML = `
            <p><strong>Name:</strong> ${riderProfile?.full_name || 'N/A'}</p>
            <p><strong>Email:</strong> ${riderProfile?.email || 'N/A'}</p>
            <p><strong>Phone:</strong> +63 ${riderProfile?.phone || 'N/A'}</p>
            <p><strong>Area:</strong> ${riderProfile?.area || 'N/A'}</p>
            <p><strong>Vehicle:</strong> ${riderProfile?.vehicle_type || 'N/A'}</p>
            <p><strong>License:</strong> ${riderProfile?.license_number || 'N/A'}</p>
        `;
    }

    logoutBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('ordermo_rider_profile');
        if (auth.currentUser) {
            signOut(auth).then(() => {
                window.location.replace('index.html#home');
            });
        } else {
            window.location.replace('index.html#home');
        }
    });

    // Tab Switching
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            const target = tab.dataset.tab === 'available' ? 'availableTab' : 'myDeliveriesTab';
            document.getElementById(target)?.classList.add('active');
        });
    });

    // Listen for orders
    const qOrders = query(collection(db, 'orders'));
    onSnapshot(qOrders, (snapshot) => {
        renderAvailableOrders(snapshot);
        renderMyDeliveries(snapshot);
    });
};

function renderAvailableOrders(snapshot) {
    const list = document.getElementById('availableOrdersList');
    if (!list) return;

    const available = [];
    snapshot.forEach((docSnap) => {
        const order = docSnap.data();
        if (order.status === 'Waiting for rider') {
            available.push({ id: docSnap.id, ...order });
        }
    });

    if (available.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <h3>No available orders</h3>
                <p>New orders will appear here as they come in.</p>
            </div>
        `;
        return;
    }

    list.innerHTML = available.map(order => {
        const addr = order.deliveryAddress || {};
        return `
            <div class="order-card">
                <div class="order-card-header">
                    <h4 class="customer-name">${order.customerName || 'Customer'}</h4>
                    <span class="order-status-pill status-waiting-for-rider">PENDING</span>
                </div>
                <div class="order-address">
                    📍 ${addr.houseNo || ''} ${addr.street || ''}, ${addr.barangay || ''}, ${addr.city || ''}
                </div>
                <div class="order-items-list">
                    ${(order.items || []).map(item => `
                        <div class="order-item-row">
                            <span>${item.quantity}x ${item.name}</span>
                            <span>${money.format(item.price * item.quantity)}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="order-footer">
                    <span class="order-total">Total: ${money.format(order.total || 0)}</span>
                    <button class="btn-accept" data-order-id="${order.id}">Accept Delivery</button>
                </div>
            </div>
        `;
    }).join('');

    list.querySelectorAll('.btn-accept').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.dataset.orderId;
            try {
                await updateDoc(doc(db, 'orders', id), {
                    status: 'Out for delivery',
                    riderName: JSON.parse(localStorage.getItem('ordermo_rider_profile') || '{}')?.full_name || 'Rider'
                });
            } catch (err) {
                console.error("Accept error:", err);
                alert("Failed to accept order.");
            }
        });
    });
}

function renderMyDeliveries(snapshot) {
    const list = document.getElementById('myDeliveriesList');
    if (!list) return;

    const riderProfile = JSON.parse(localStorage.getItem('ordermo_rider_profile') || '{}');
    const riderName = riderProfile.full_name || 'Rider';

    const deliveries = [];
    snapshot.forEach((docSnap) => {
        const order = docSnap.data();
        if (order.riderName === riderName && order.status !== 'Waiting for rider') {
            deliveries.push({ id: docSnap.id, ...order });
        }
    });

    if (deliveries.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <h3>No deliveries yet</h3>
                <p>Accepted orders will appear here.</p>
            </div>
        `;
        return;
    }

    const statusClass = (status) => `status-${(status || '').toLowerCase().replace(/\s+/g, '-')}`;

    list.innerHTML = deliveries.map(order => {
        const addr = order.deliveryAddress || {};
        return `
            <div class="order-card">
                <div class="order-card-header">
                    <h4 class="customer-name">${order.customerName || 'Customer'}</h4>
                    <span class="order-status-pill ${statusClass(order.status)}">${order.status || 'Accepted'}</span>
                </div>
                <div class="order-address">
                    📍 ${addr.houseNo || ''} ${addr.street || ''}, ${addr.barangay || ''}, ${addr.city || ''}
                </div>
                <div class="order-items-list">
                    ${(order.items || []).map(item => `
                        <div class="order-item-row">
                            <span>${item.quantity}x ${item.name}</span>
                            <span>${money.format(item.price * item.quantity)}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="order-footer">
                    <span class="order-total">Total: ${money.format(order.total || 0)}</span>
                    ${order.status === 'Out for delivery' ? 
                        `<button class="btn-delivered" data-order-id="${order.id}">Mark Delivered</button>` : ''}
                </div>
            </div>
        `;
    }).join('');

    list.querySelectorAll('.btn-delivered').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.dataset.orderId;
            try {
                await updateDoc(doc(db, 'orders', id), {
                    status: 'Delivered'
                });
            } catch (err) {
                console.error("Delivered error:", err);
                alert("Failed to update order.");
            }
        });
    });
}

initDashboard();