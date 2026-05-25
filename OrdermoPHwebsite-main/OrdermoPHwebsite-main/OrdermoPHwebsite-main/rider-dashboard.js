import { db, auth } from './firebase-config.js';
import { 
    collection,
    query,
    where,
    getDocs,
    onSnapshot,
    doc,
    setDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged, signInWithEmailAndPassword, sendPasswordResetEmail, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const money = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP'
});

const initDashboard = async () => {
    const riderProfile = JSON.parse(localStorage.getItem('ordermo_rider_profile') || 'null');
    const loginSection = document.getElementById('riderLoginSection');
    const dashboardMain = document.getElementById('riderDashboardMain');
    const loginForm = document.getElementById('riderLoginForm');

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

    let resolvedProfile = riderProfile;

    const updateDisplayName = (profile) => {
        const el = document.getElementById('riderDisplayName');
        if (el) el.textContent = profile?.full_name || profile?.email?.split('@')[0] || 'Rider';
    };

    const updateProfileInfo = (profile) => {
        const fallbackEmail = auth.currentUser?.email || '';
        const p = profile || {};
        const v = (val) => val && val.trim() ? val : '—';
        const areaEl = document.getElementById('riderAreaInfo');
        const riderCity = p.city || '';
        const riderProv = p.area || '';
        if (areaEl) areaEl.textContent = `Delivering in ${riderCity ? riderCity + ', ' : ''}${riderProv || 'your area'}`;
        const infoEl = document.getElementById('riderProfileInfo');
        if (infoEl) {
            infoEl.innerHTML = `
                <p><strong>Name:</strong> ${p.full_name || fallbackEmail.split('@')[0] || '—'}</p>
                <p><strong>Email:</strong> ${p.email || fallbackEmail || '—'}</p>
                <p><strong>Phone:</strong> +63 ${v(p.phone)}</p>
                <p><strong>Area:</strong> ${p.city ? p.city + ', ' : ''}${v(p.area)}</p>
                <p><strong>Vehicle:</strong> ${v(p.vehicle_type)}</p>
                <p><strong>License:</strong> ${v(p.license_number)}</p>
            `;
        }
        const badge = document.getElementById('riderApprovalBadge');
        if (badge && p.status) {
            if (p.status === 'approved') {
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

    const applyProfile = (profile) => {
        resolvedProfile = profile;
        showDashboard();
        updateDisplayName(profile);
        updateProfileInfo(profile);
    };

    const fetchAndShow = async () => {
        if (!auth.currentUser) { showLogin(); return; }
        const uid = auth.currentUser.uid;
        const email = auth.currentUser.email;
        try {
            const queryCollections = ['riders', 'rider_applications'];
            for (const col of queryCollections) {
                let snap = await getDocs(query(collection(db, col), where('userId', '==', uid)));
                if (snap.empty && email) {
                    snap = await getDocs(query(collection(db, col), where('email', '==', email)));
                }
                if (!snap.empty) {
                    const data = snap.docs[0].data();
                    localStorage.setItem('ordermo_rider_profile', JSON.stringify(data));
                    applyProfile(data);
                    return;
                }
            }
            // Auto-create a minimal rider document
            const newDoc = {
                userId: uid,
                email: email,
                full_name: email.split('@')[0],
                phone: '',
                area: '',
                city: '',
                vehicle_type: '',
                license_number: '',
                status: 'approved',
                approvedAt: new Date().toISOString()
            };
            const riderId = 'rider_' + uid.substring(0, 8);
            await setDoc(doc(db, 'rider_applications', riderId), newDoc);
            await setDoc(doc(db, 'riders', riderId), newDoc);
            localStorage.setItem('ordermo_rider_profile', JSON.stringify(newDoc));
            applyProfile(newDoc);
            return;
        } catch (err) {
            console.error('[Rider Dashboard] Error fetching/creating profile:', err);
        }
        showDashboard();
        updateDisplayName(null);
        updateProfileInfo(null);
    };

    if (riderProfile) {
        applyProfile(riderProfile);
    } else if (auth.currentUser) {
        await fetchAndShow();
    } else {
        showLogin();
    }

    // Handle delayed auth resolution
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const cached = JSON.parse(localStorage.getItem('ordermo_rider_profile') || 'null');
            if (cached) {
                applyProfile(cached);
            } else {
                await fetchAndShow();
            }
        }
    });

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
    const forgotPwBtn = document.getElementById('riderForgotPw');
    const resetMsg = document.getElementById('riderResetMsg');
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

    const logoutBtn = document.getElementById('logoutBtn');

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
        const estTime = order.estimatedMinutes ? `⏱ ~${order.estimatedMinutes} mins` : '';
        return `
            <div class="order-card">
                <div class="order-card-header">
                    <h4 class="customer-name">${order.customerName || 'Customer'}</h4>
                    <span class="order-status-pill status-waiting-for-rider">PENDING</span>
                </div>
                ${estTime ? `<div class="order-est-time">${estTime}</div>` : ''}
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
                alert('🛵 Delivery accepted! Head to the merchant to pick up the order. Stay safe!');
                document.querySelector('[data-tab="my-deliveries"]')?.click();
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
        const estTime = order.estimatedMinutes ? `⏱ ~${order.estimatedMinutes} mins` : '';
        return `
            <div class="order-card">
                <div class="order-card-header">
                    <h4 class="customer-name">${order.customerName || 'Customer'}</h4>
                    <span class="order-status-pill ${statusClass(order.status)}">${order.status || 'Accepted'}</span>
                </div>
                ${estTime ? `<div class="order-est-time">${estTime}</div>` : ''}
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
                alert('✅ Order delivered successfully! Check Available Orders for new deliveries.');
                document.getElementById('availableTabBtn')?.click();
            } catch (err) {
                console.error("Delivered error:", err);
                alert("Failed to update order.");
            }
        });
    });
}

// --- GPS TRACKING ---
let trackingWatchId = null;
let trackingOrderId = null;
let riderMap = null;
let riderMarker = null;
let destMarker = null;
let trackingInterval = null;

function stopRiderTracking() {
    if (trackingWatchId !== null) { navigator.geolocation.clearWatch(trackingWatchId); trackingWatchId = null; }
    if (trackingInterval) { clearInterval(trackingInterval); trackingInterval = null; }
    trackingOrderId = null;
    const section = document.getElementById('riderTrackingSection');
    if (section) section.style.display = 'none';
}

async function startRiderTracking(orderId, deliveryAddress, merchantPickup, merchantArea) {
    stopRiderTracking();
    trackingOrderId = orderId;
    const section = document.getElementById('riderTrackingSection');
    const mapEl = document.getElementById('riderTrackingMap');
    const addrEl = document.getElementById('riderTrackingAddress');
    const navBtn = document.getElementById('openNavBtn');
    if (!section || !mapEl) return;

    const addrStr = `${deliveryAddress.houseNo || ''} ${deliveryAddress.street || ''}, ${deliveryAddress.barangay || ''}, ${deliveryAddress.city || ''}`;
    if (addrEl) addrEl.innerHTML = `<strong>Delivering to:</strong> ${addrStr}<br><strong>Pickup from:</strong> ${merchantPickup || 'Merchant'} (${merchantArea || ''})`;
    if (navBtn) navBtn.href = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addrStr)}`;
    section.style.display = 'block';

    // Initialize map
    if (riderMap) riderMap.remove();
    riderMap = L.map(mapEl).setView([14.5, 121], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(riderMap);

    // Geocode merchant pickup location
    let pickupLat = null, pickupLng = null;
    if (merchantArea) {
        try {
            const geo = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(merchantArea + ' ' + merchantPickup)}&limit=1`);
            const geoData = await geo.json();
            if (geoData.length > 0) {
                pickupLat = parseFloat(geoData[0].lat);
                pickupLng = parseFloat(geoData[0].lon);
                L.marker([pickupLat, pickupLng], {
                    icon: L.divIcon({ html: '🏪', iconSize: [24, 24], className: '' })
                }).addTo(riderMap).bindPopup('Pickup: ' + (merchantPickup || 'Merchant'));
            }
        } catch (e) { console.warn('Pickup geocode failed'); }
    }

    // Geocode delivery address
    let destLat = 14.5, destLng = 121;
    try {
        const geo = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addrStr)}&limit=1`);
        const geoData = await geo.json();
        if (geoData.length > 0) {
            destLat = parseFloat(geoData[0].lat);
            destLng = parseFloat(geoData[0].lon);
        }
    } catch (e) { console.warn('Geocode failed, using default'); }

    destMarker = L.marker([destLat, destLng], {
        icon: L.divIcon({ html: '📍', iconSize: [24, 24], className: '' })
    }).addTo(riderMap).bindPopup('Delivery Address');

    // Fit bounds to show all markers
    const allLats = [destLat];
    const allLngs = [destLng];
    if (pickupLat !== null) { allLats.push(pickupLat); allLngs.push(pickupLng); }
    riderMap.fitBounds([
        [Math.min(...allLats) - 0.02, Math.min(...allLngs) - 0.02],
        [Math.max(...allLats) + 0.02, Math.max(...allLngs) + 0.02]
    ]);

    // Start watching rider position
    if (navigator.geolocation) {
        trackingWatchId = navigator.geolocation.watchPosition(async (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            if (riderMarker) riderMarker.setLatLng([lat, lng]);
            else {
                riderMarker = L.marker([lat, lng], {
                    icon: L.divIcon({ html: '🛵', iconSize: [24, 24], className: '' })
                }).addTo(riderMap).bindPopup('You');
            }
            riderMap.setView([lat, lng], 14);
            // Update Firestore with rider location
            if (trackingOrderId) {
                try {
                    await updateDoc(doc(db, 'orders', trackingOrderId), {
                        riderLat: lat,
                        riderLng: lng,
                        riderLastUpdated: new Date().toISOString()
                    });
                } catch (e) { /* silent */ }
            }
        }, (err) => console.warn('GPS error:', err), {
            enableHighAccuracy: true,
            maximumAge: 5000,
            timeout: 10000
        });
    }
}

// Override renderMyDeliveries to add tracking
const _origRenderMyDeliveries = renderMyDeliveries;
renderMyDeliveries = function(snapshot) {
    _origRenderMyDeliveries(snapshot);
    const riderProfile = JSON.parse(localStorage.getItem('ordermo_rider_profile') || '{}');
    const riderName = riderProfile.full_name || 'Rider';
    const active = [];
    snapshot.forEach((docSnap) => {
        const order = docSnap.data();
        if (order.riderName === riderName && order.status === 'Out for delivery') {
            active.push({ id: docSnap.id, ...order });
        }
    });
    if (active.length > 0) {
        const order = active[0];
        startRiderTracking(order.id, order.deliveryAddress || {}, order.merchantPickup, order.merchantPickupArea);
    } else if (trackingOrderId) {
        stopRiderTracking();
    }
};

initDashboard();