import { db, auth } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    serverTimestamp, 
    query, 
    where, 
    onSnapshot, 
    getDocs,
    doc, 
    setDoc,
    updateDoc, 
    deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
    onAuthStateChanged,
    signInWithPopup,
    GoogleAuthProvider,
    OAuthProvider,
    signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const CART_KEY = 'ordermo_cart';
const ADDRESS_KEY = 'ordermo_delivery_address';
const LAST_ORDER_KEY = 'ordermo_last_order';

const money = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP'
});

const LOCATIONS_BY_REGION = {
    Zambales: [
        'Botolan', 'Cabangan', 'Candelaria', 'Castillejos', 'Iba', 'Masinloc',
        'Olongapo City', 'Palauig', 'San Antonio', 'San Felipe', 'San Marcelino',
        'San Narciso', 'Santa Cruz', 'Subic', 'Subic Bay Freeport'
    ],
    Bataan: [
        'Abucay', 'Bagac', 'Balanga City', 'Dinalupihan', 'Hermosa', 'Limay',
        'Mariveles', 'Morong', 'Orani', 'Orion', 'Pilar', 'Samal'
    ],
    Bulacan: [
        'Angat', 'Balagtas', 'Baliwag City', 'Bocaue', 'Bulakan', 'Bustos',
        'Calumpit', 'Doña Remedios Trinidad', 'Guiguinto', 'Hagonoy',
        'Malolos City', 'Marilao', 'Meycauayan City', 'Norzagaray', 'Obando',
        'Pandi', 'Paombong', 'Plaridel', 'Pulilan', 'San Ildefonso',
        'San Jose del Monte City', 'San Miguel', 'San Rafael', 'Santa Maria'
    ],
    Pampanga: [
        'Angeles City', 'Apalit', 'Arayat', 'Bacolor', 'Candaba', 'Floridablanca',
        'Guagua', 'Lubao', 'Mabalacat City', 'Macabebe', 'Magalang', 'Masantol',
        'Mexico', 'Minalin', 'Porac', 'San Fernando City', 'San Luis',
        'San Simon', 'Santa Ana', 'Santa Rita', 'Santo Tomas', 'Sasmuan'
    ]
};

const MENU_BY_AREA = {
    default: [
        { merchant: 'Kafe Mo', item: 'Iced Spanish Latte', category: 'Coffee', price: 120, time: '15-25 mins', rating: '4.7' },
        { merchant: 'Blossom Milktea', item: 'Wintermelon Milk Tea', category: 'Milk Tea', price: 115, time: '15-25 mins', rating: '4.6' },
        { merchant: 'Yumbao', item: 'Pork Bao Buns', category: 'Asian Snacks', price: 145, time: '20-30 mins', rating: '4.8' },
        { merchant: 'Bar 1900 Grill & Restaurant', item: 'Crispy Pata', category: 'Filipino', price: 575, time: '35-50 mins', rating: '4.8' },
        { merchant: 'Wild Herbs', item: 'Pad Thai', category: 'Thai', price: 260, time: '30-45 mins', rating: '4.7' },
        { merchant: 'Xtremely Xpresso', item: 'Baby Back Ribs', category: 'American', price: 230, time: '35-50 mins', rating: '4.9' }
    ],
    olongapo: [
        { merchant: 'Xtremely Xpresso', item: 'Baby Back Ribs', category: 'Entree', price: 230, time: '35-50 mins', rating: '4.9' },
        { merchant: 'Xtremely Xpresso', item: 'Chicken & Mushroom Steak', category: 'Entree', price: 260, time: '35-50 mins', rating: '4.8' },
        { merchant: 'Zugba Grill', item: 'Fiesta Bilao', category: 'Grilled Seafood', price: 699, time: '40-55 mins', rating: '4.7' },
        { merchant: 'Bar 1900 Grill & Restaurant', item: 'Crispy Pata', category: 'Filipino', price: 575, time: '35-50 mins', rating: '4.8' },
        { merchant: 'Wild Herbs', item: 'Pad Thai', category: 'Thai', price: 260, time: '30-45 mins', rating: '4.7' },
        { merchant: 'Kafe Mo', item: 'Iced Spanish Latte', category: 'Coffee', price: 120, time: '15-25 mins', rating: '4.6' }
    ],
    castillejos: [
        { merchant: 'Zugba Grill', item: 'Boodle Fight', category: 'Grilled Seafood', price: 899, time: '40-55 mins', rating: '4.7' },
        { merchant: 'Zugba Grill', item: 'Mix Seafood', category: 'Seafood', price: 650, time: '35-50 mins', rating: '4.6' },
        { merchant: 'The Citrus Farm', item: 'Fresh Citrus Smoothie', category: 'Juice Bar', price: 135, time: '15-25 mins', rating: '4.7' },
        { merchant: 'Yumbao', item: 'Chicken Bao Buns', category: 'Asian Snacks', price: 145, time: '20-30 mins', rating: '4.8' },
        { merchant: 'Tomatoes and Peppers', item: 'Classic Cheeseburger', category: 'Diner', price: 220, time: '25-40 mins', rating: '4.5' },
        { merchant: 'Blossom Milktea', item: 'Okinawa Milk Tea', category: 'Milk Tea', price: 125, time: '15-25 mins', rating: '4.6' }
    ],
    iba: [
        { merchant: 'Mang Inasal - Iba Town Zambales', item: 'Paa Large PM1', category: 'Chicken Inasal', price: 174, time: '25-40 mins', rating: '4.7' },
        { merchant: 'Jollibee - Iba Zambales', item: '1pc Chickenjoy with Rice', category: 'Fast Food', price: 109, time: '20-35 mins', rating: '4.8' },
        { merchant: 'Zambales Food Hub - Iba', item: 'Pork Sisig with Rice', category: 'Filipino', price: 159, time: '25-40 mins', rating: '4.6' },
        { merchant: 'Iba Capital Coffee', item: 'Caramel Macchiato', category: 'Coffee', price: 145, time: '15-25 mins', rating: '4.7' },
        { merchant: 'Central Zambales Bakeshop', item: 'Ensaymada Box', category: 'Bakery', price: 180, time: '15-25 mins', rating: '4.8' },
        { merchant: 'Tubby\'s Foodhub - Iba', item: 'Burger Steak Rice Bowl', category: 'Fast Food', price: 149, time: '25-40 mins', rating: '4.8' }
    ],
    abucay: [
        { merchant: 'The Beanery', item: 'Carbonara', category: 'Cafe Pasta', price: 260, time: '30-45 mins', rating: '4.7' },
        { merchant: 'The Beanery', item: 'Blueberry Cheesecake Slice', category: 'Dessert', price: 170, time: '20-30 mins', rating: '4.8' },
        { merchant: 'Xtremely Xpresso - Bataan', item: 'Country Fried Chicken', category: 'Entree', price: 280, time: '35-50 mins', rating: '4.8' },
        { merchant: 'Bar 1900 Grill & Restaurant', item: 'Sizzling Sisig', category: 'Filipino', price: 195, time: '30-45 mins', rating: '4.7' },
        { merchant: 'Yumbao', item: 'Pork Bao Buns', category: 'Asian Snacks', price: 145, time: '20-30 mins', rating: '4.8' },
        { merchant: 'Blossom Milktea', item: 'Wintermelon Milk Tea', category: 'Milk Tea', price: 115, time: '15-25 mins', rating: '4.6' }
    ],
    bagac: [
        { merchant: 'Beachside Grill', item: 'Grilled Liempo with Rice', category: 'Filipino Grill', price: 189, time: '30-45 mins', rating: '4.6' },
        { merchant: 'Beachside Grill', item: 'Inihaw na Pusit', category: 'Seafood', price: 320, time: '35-50 mins', rating: '4.7' },
        { merchant: 'Central Bataan Bakeshop', item: 'Cheese Bread Box', category: 'Bakery', price: 160, time: '15-25 mins', rating: '4.6' },
        { merchant: 'Kafe Mo', item: 'Iced Mocha', category: 'Coffee', price: 135, time: '15-25 mins', rating: '4.6' },
        { merchant: 'The Citrus Farm', item: 'Mango Citrus Shake', category: 'Juice Bar', price: 145, time: '15-25 mins', rating: '4.7' },
        { merchant: 'Bar 1900 Grill & Restaurant', item: 'Lumpiang Shanghai', category: 'Filipino', price: 135, time: '25-40 mins', rating: '4.7' }
    ],
    balangacity: [
        { merchant: 'Xtremely Xpresso - Bataan', item: 'Baby Back Ribs', category: 'Entree', price: 230, time: '35-50 mins', rating: '4.9' },
        { merchant: 'Xtremely Xpresso - Bataan', item: 'Fish Fillet w/ Lemon Garlic Cream', category: 'Entree', price: 240, time: '35-50 mins', rating: '4.8' },
        { merchant: 'The Beanery', item: 'Chicken Alfredo', category: 'Cafe Pasta', price: 275, time: '30-45 mins', rating: '4.7' },
        { merchant: 'Blossom Milktea', item: 'Okinawa Milk Tea', category: 'Milk Tea', price: 125, time: '15-25 mins', rating: '4.6' },
        { merchant: 'Yumbao', item: 'Beef Bao Buns', category: 'Asian Snacks', price: 165, time: '20-30 mins', rating: '4.8' },
        { merchant: 'Bar 1900 Grill & Restaurant', item: 'Crispy Pata', category: 'Filipino', price: 575, time: '35-50 mins', rating: '4.8' }
    ],
    angat: [
        { merchant: 'Bulacan Grill House', item: 'Pork BBQ with Rice', category: 'Filipino Grill', price: 145, time: '25-40 mins', rating: '4.6' },
        { merchant: 'Bulacan Grill House', item: 'Sizzling Sisig', category: 'Filipino', price: 195, time: '30-45 mins', rating: '4.7' },
        { merchant: 'Blossom Milktea', item: 'Wintermelon Milk Tea', category: 'Milk Tea', price: 115, time: '15-25 mins', rating: '4.6' },
        { merchant: 'Yumbao', item: 'Pork Bao Buns', category: 'Asian Snacks', price: 145, time: '20-30 mins', rating: '4.8' },
        { merchant: 'Kafe Mo', item: 'Iced Spanish Latte', category: 'Coffee', price: 120, time: '15-25 mins', rating: '4.6' },
        { merchant: 'Tomatoes and Peppers', item: 'Classic Cheeseburger', category: 'Diner', price: 220, time: '25-40 mins', rating: '4.5' }
    ],
    balagtas: [
        { merchant: 'Bulacan Food Hub', item: 'Chicken Wings Rice Meal', category: 'Wings', price: 179, time: '25-40 mins', rating: '4.7' },
        { merchant: 'Bulacan Food Hub', item: 'Pork Tonkatsu Rice Bowl', category: 'Rice Bowl', price: 189, time: '25-40 mins', rating: '4.6' },
        { merchant: 'Blossom Milktea', item: 'Brown Sugar Milk Tea', category: 'Milk Tea', price: 135, time: '15-25 mins', rating: '4.6' },
        { merchant: 'Kafe Mo', item: 'Caramel Latte', category: 'Coffee', price: 130, time: '15-25 mins', rating: '4.6' },
        { merchant: 'Yumbao', item: 'Chicken Bao Buns', category: 'Asian Snacks', price: 145, time: '20-30 mins', rating: '4.8' },
        { merchant: 'The Citrus Farm', item: 'Fresh Citrus Smoothie', category: 'Juice Bar', price: 135, time: '15-25 mins', rating: '4.7' }
    ],
    candaba: [
        { merchant: 'Dainty Restaurant', item: 'Buttered Chicken Half', category: 'Chinese-Filipino', price: 245, time: '35-50 mins', rating: '4.8' },
        { merchant: 'Dainty Restaurant', item: 'Chicken Fried Rice Single', category: 'Rice', price: 85, time: '25-40 mins', rating: '4.8' },
        { merchant: 'Pampanga Grill', item: 'Pork Sisig with Rice', category: 'Kapampangan', price: 195, time: '30-45 mins', rating: '4.7' },
        { merchant: 'Blossom Milktea', item: 'Okinawa Milk Tea', category: 'Milk Tea', price: 125, time: '15-25 mins', rating: '4.6' },
        { merchant: 'Kafe Mo', item: 'Iced Spanish Latte', category: 'Coffee', price: 120, time: '15-25 mins', rating: '4.6' },
        { merchant: 'Yumbao', item: 'Beef Bao Buns', category: 'Asian Snacks', price: 165, time: '20-30 mins', rating: '4.8' }
    ],
    floridablanca: [
        { merchant: 'Pampanga Grill', item: 'Chicken Inasal with Rice', category: 'Kapampangan Grill', price: 185, time: '30-45 mins', rating: '4.7' },
        { merchant: 'Pampanga Grill', item: 'Sizzling Sisig', category: 'Kapampangan', price: 195, time: '30-45 mins', rating: '4.7' },
        { merchant: 'Dainty Restaurant', item: 'Special Pancit Canton Small', category: 'Noodles', price: 250, time: '35-50 mins', rating: '4.8' },
        { merchant: 'The Citrus Farm', item: 'Mango Citrus Shake', category: 'Juice Bar', price: 145, time: '15-25 mins', rating: '4.7' },
        { merchant: 'Blossom Milktea', item: 'Wintermelon Milk Tea', category: 'Milk Tea', price: 115, time: '15-25 mins', rating: '4.6' },
        { merchant: 'Kafe Mo', item: 'Iced Mocha', category: 'Coffee', price: 135, time: '15-25 mins', rating: '4.6' }
    ],
    guagua: [
        { merchant: 'Dainty Restaurant', item: 'Chicken and Pork Adobo Small', category: 'Chinese-Filipino', price: 295, time: '35-50 mins', rating: '4.8' },
        { merchant: 'Dainty Restaurant', item: 'Shrimp or Chicken Lumpia Small', category: 'Appetizer', price: 275, time: '30-45 mins', rating: '4.8' },
        { merchant: 'Pampanga Grill', item: 'Tocino Rice Meal', category: 'Kapampangan', price: 165, time: '25-40 mins', rating: '4.7' },
        { merchant: 'Yumbao', item: 'Pork Bao Buns', category: 'Asian Snacks', price: 145, time: '20-30 mins', rating: '4.8' },
        { merchant: 'Blossom Milktea', item: 'Brown Sugar Milk Tea', category: 'Milk Tea', price: 135, time: '15-25 mins', rating: '4.6' },
        { merchant: 'Kafe Mo', item: 'Caramel Latte', category: 'Coffee', price: 130, time: '15-25 mins', rating: '4.6' }
    ],
    lubao: [
        { merchant: 'Dainty Restaurant', item: 'Beef Stew Small', category: 'Chinese-Filipino', price: 400, time: '35-50 mins', rating: '4.8' },
        { merchant: 'Dainty Restaurant', item: 'Special Pancit Canton Small', category: 'Noodles', price: 250, time: '35-50 mins', rating: '4.8' },
        { merchant: 'Pampanga Grill', item: 'Pork BBQ with Rice', category: 'Kapampangan Grill', price: 145, time: '25-40 mins', rating: '4.7' },
        { merchant: 'The Citrus Farm', item: 'Fresh Citrus Smoothie', category: 'Juice Bar', price: 135, time: '15-25 mins', rating: '4.7' },
        { merchant: 'Yumbao', item: 'Chicken Bao Buns', category: 'Asian Snacks', price: 145, time: '20-30 mins', rating: '4.8' },
        { merchant: 'Blossom Milktea', item: 'Okinawa Milk Tea', category: 'Milk Tea', price: 125, time: '15-25 mins', rating: '4.6' }
    ]
};

const GLOBAL_MENU_EXTRAS = [
    { merchant: 'Xtremely Xpresso', item: 'Bibimbrown Vegetables in Brown Rice', category: 'Entree', price: 250, time: '35-50 mins', rating: '4.8' },
    { merchant: 'Xtremely Xpresso', item: 'Chicken Meat', category: 'Entree', price: 250, time: '35-50 mins', rating: '4.8' },
    { merchant: 'Xtremely Xpresso', item: 'Country Fried Chicken', category: 'Entree', price: 280, time: '35-50 mins', rating: '4.8' },
    { merchant: 'Xtremely Xpresso', item: 'Fish Fillet w/ Lemon Garlic Cream', category: 'Entree', price: 240, time: '35-50 mins', rating: '4.8' },
    { merchant: 'Xtremely Xpresso', item: 'Fish w/ Basil Cream Cheese', category: 'Entree', price: 240, time: '35-50 mins', rating: '4.8' },
    { merchant: 'Xtremely Xpresso', item: 'Garlic Steak', category: 'Steak', price: 540, time: '40-55 mins', rating: '4.9' },
    { merchant: 'Xtremely Xpresso', item: 'Korean Beef Ribs', category: 'Entree', price: 300, time: '40-55 mins', rating: '4.8' },
    { merchant: 'Xtremely Xpresso', item: 'Lengua Ox Tongue', category: 'Entree', price: 260, time: '40-55 mins', rating: '4.7' },
    { merchant: 'Xtremely Xpresso', item: 'Pepper Steak', category: 'Steak', price: 540, time: '40-55 mins', rating: '4.9' },
    { merchant: 'Xtremely Xpresso', item: 'Stuffed Pork Chops', category: 'Entree', price: 240, time: '35-50 mins', rating: '4.8' },
    { merchant: 'Dainty Restaurant', item: 'Beef Brisket in Claypot Medium', category: 'Chinese-Filipino', price: 535, time: '40-55 mins', rating: '4.8' },
    { merchant: 'Dainty Restaurant', item: 'Beef Brisket in Claypot Large', category: 'Chinese-Filipino', price: 710, time: '40-55 mins', rating: '4.8' },
    { merchant: 'Dainty Restaurant', item: 'Beef Stew Medium', category: 'Chinese-Filipino', price: 600, time: '40-55 mins', rating: '4.8' },
    { merchant: 'Dainty Restaurant', item: 'Beef Stew Large', category: 'Chinese-Filipino', price: 800, time: '40-55 mins', rating: '4.8' },
    { merchant: 'Dainty Restaurant', item: 'Beef Teriyaki Small', category: 'Chinese-Filipino', price: 340, time: '35-50 mins', rating: '4.7' },
    { merchant: 'Dainty Restaurant', item: 'Beef Teriyaki Medium', category: 'Chinese-Filipino', price: 510, time: '35-50 mins', rating: '4.7' },
    { merchant: 'Dainty Restaurant', item: 'Beef Teriyaki Large', category: 'Chinese-Filipino', price: 680, time: '40-55 mins', rating: '4.7' },
    { merchant: 'Dainty Restaurant', item: 'Buttered Chicken Whole', category: 'Chicken', price: 480, time: '35-50 mins', rating: '4.8' },
    { merchant: 'Dainty Restaurant', item: 'Chicken Curry Small', category: 'Chicken', price: 345, time: '35-50 mins', rating: '4.7' },
    { merchant: 'Dainty Restaurant', item: 'Chicken Curry Medium', category: 'Chicken', price: 520, time: '40-55 mins', rating: '4.7' },
    { merchant: 'Dainty Restaurant', item: 'Chicken Curry Large', category: 'Chicken', price: 690, time: '40-55 mins', rating: '4.7' },
    { merchant: 'Dainty Restaurant', item: 'Chicken and Pork Adobo Medium', category: 'Filipino', price: 445, time: '35-50 mins', rating: '4.7' },
    { merchant: 'Dainty Restaurant', item: 'Chicken and Pork Adobo Large', category: 'Filipino', price: 590, time: '40-55 mins', rating: '4.7' },
    { merchant: 'Dainty Restaurant', item: 'Crispy Pata Small', category: 'Filipino', price: 500, time: '40-55 mins', rating: '4.8' },
    { merchant: 'Dainty Restaurant', item: 'Special Pancit Canton Medium', category: 'Noodles', price: 375, time: '35-50 mins', rating: '4.8' },
    { merchant: 'Dainty Restaurant', item: 'Special Pancit Canton Large', category: 'Noodles', price: 500, time: '40-55 mins', rating: '4.8' },
    { merchant: 'Dainty Restaurant', item: 'Chicken Fried Rice Small', category: 'Rice', price: 250, time: '25-40 mins', rating: '4.7' },
    { merchant: 'Dainty Restaurant', item: 'Chicken Fried Rice Medium', category: 'Rice', price: 350, time: '30-45 mins', rating: '4.7' },
    { merchant: 'Dainty Restaurant', item: 'Chicken Fried Rice Large', category: 'Rice', price: 450, time: '35-50 mins', rating: '4.7' },
    { merchant: 'Dainty Restaurant', item: 'Fried Rice Dainty Style Single', category: 'Rice', price: 95, time: '25-40 mins', rating: '4.7' },
    { merchant: 'Dainty Restaurant', item: 'Fried Rice Yang Chow Style Small', category: 'Rice', price: 275, time: '30-45 mins', rating: '4.7' },
    { merchant: 'Dainty Restaurant', item: 'Shrimp or Chicken Lumpia Medium', category: 'Appetizer', price: 415, time: '30-45 mins', rating: '4.7' },
    { merchant: 'Gerry\'s Grill - Subic', item: 'Sizzling Sisig', category: 'Filipino', price: 195, time: '30-45 mins', rating: '4.7' },
    { merchant: 'Gerry\'s Grill - Subic', item: 'Lechon Kawali', category: 'Pork', price: 245, time: '30-45 mins', rating: '4.7' },
    { merchant: 'Gerry\'s Grill - Subic', item: 'Adobo Pork Ribs', category: 'Pork', price: 265, time: '35-50 mins', rating: '4.7' },
    { merchant: 'Gerry\'s Grill - Subic', item: 'Garlic Adobo Beef Ribs', category: 'Beef', price: 275, time: '35-50 mins', rating: '4.7' },
    { merchant: 'Gerry\'s Grill - Subic', item: 'Sizzling Beef Spareribs', category: 'Beef', price: 305, time: '35-50 mins', rating: '4.7' },
    { merchant: 'Gerry\'s Grill - Subic', item: 'Chili Cheese Sticks', category: 'Appetizer', price: 115, time: '20-30 mins', rating: '4.6' },
    { merchant: 'Gerry\'s Grill - Subic', item: 'Dinakdakan', category: 'Filipino', price: 175, time: '30-45 mins', rating: '4.6' },
    { merchant: 'Gerry\'s Grill - Subic', item: 'Coco Fish Finger', category: 'Seafood', price: 145, time: '25-40 mins', rating: '4.6' },
    { merchant: 'Gerry\'s Grill - Subic', item: 'Mango Sago', category: 'Dessert', price: 70, time: '15-25 mins', rating: '4.6' }
];

function normalizeAreaName(area) {
    return area.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function getMenuForArea(area) {
    const key = normalizeAreaName(area);
    const areaMenu = MENU_BY_AREA[key] || MENU_BY_AREA.default;
    const existing = new Set(areaMenu.map(entry => `${entry.merchant}|${entry.item}`));
    const extras = GLOBAL_MENU_EXTRAS.filter(entry => !existing.has(`${entry.merchant}|${entry.item}`));
    return [...areaMenu, ...extras];
}

function getCurrentAreaFromUrl() {
    const hashQuery = window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '';
    const params = new URLSearchParams(hashQuery || window.location.search);
    return params.get('area') || '';
}

function getAreaLink(area) {
    return `#menu?area=${encodeURIComponent(area)}`;
}

function getCart() {
    try {
        return JSON.parse(localStorage.getItem(CART_KEY)) || [];
    } catch {
        return [];
    }
}

function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartUi();
}

function getAddress() {
    try {
        return JSON.parse(localStorage.getItem(ADDRESS_KEY)) || {};
    } catch {
        return {};
    }
}

function saveAddress(address) {
    localStorage.setItem(ADDRESS_KEY, JSON.stringify(address));
}

function ensureCartDrawer() {
    if (document.getElementById('cartDrawer')) return;

    const overlay = document.createElement('div');
    overlay.className = 'cart-overlay';
    overlay.id = 'cartOverlay';

    const drawer = document.createElement('div');
    drawer.className = 'cart-drawer';
    drawer.id = 'cartDrawer';
    drawer.innerHTML = `
        <div class="cart-header">
            <h3>Your Cart</h3>
            <span class="close-cart" id="cartCloseBtn">&times;</span>
        </div>
        <div class="cart-items" id="cartItemsContainer"></div>
        <div class="cart-footer">
            <div class="cart-total">
                <span>Total:</span>
                <span id="cartTotalAmount">PHP 0.00</span>
            </div>
            <a href="#checkout" class="btn-checkout">Go to Checkout</a>
        </div>
    `;

    document.body.append(overlay, drawer);
}

function openCart() {
    ensureCartDrawer();
    if (!canOpenCart()) return;
    document.getElementById('cartDrawer')?.classList.add('active');
    document.getElementById('cartOverlay')?.classList.add('active');
}

function closeCart() {
    document.getElementById('cartDrawer')?.classList.remove('active');
    document.getElementById('cartOverlay')?.classList.remove('active');
}

function getCartTotal(cart = getCart()) {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function getRoute() {
    const raw = window.location.hash.replace(/^#/, '') || 'home';
    return raw.split('?')[0] || 'home';
}

function canOpenCart() {
    return getRoute() === 'menu' && getCart().length > 0;
}

function updateCartUi() {
    const cart = getCart();
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const countEl = document.getElementById('cart-count');
    const totalEl = document.getElementById('cartTotalAmount');
    const container = document.getElementById('cartItemsContainer');
    const cartTriggers = document.querySelectorAll('.cart-icon, #cartOpenBtn');
    const enabled = canOpenCart();

    if (countEl) {
        countEl.textContent = count;
        countEl.style.display = count > 0 ? 'inline-flex' : 'none';
    }

    cartTriggers.forEach(trigger => {
        trigger.classList.toggle('cart-disabled', !enabled);
        trigger.setAttribute('aria-disabled', String(!enabled));
        trigger.setAttribute('tabindex', enabled ? '0' : '-1');
        trigger.title = enabled ? 'Open cart' : 'Choose food in the menu to enable the cart';
    });

    if (totalEl) totalEl.textContent = money.format(getCartTotal(cart));

    if (!container) return;

    if (cart.length === 0) {
        container.innerHTML = '<p class="empty-cart">Your cart is empty.</p>';
        return;
    }

    container.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-info">
                <h4>${item.name}</h4>
                <p>${item.merchant} - ${money.format(item.price)} x ${item.quantity}</p>
            </div>
            <button class="remove-item" data-remove-id="${item.id}" aria-label="Remove ${item.name}">&times;</button>
        </div>
    `).join('');
}

function addToCart(item) {
    const cart = getCart();
    const existing = cart.find(cartItem => cartItem.id === item.id);

    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ ...item, quantity: 1 });
    }

    saveCart(cart);
    openCart();
}

function addMerchantButtons() {
    document.querySelectorAll('.m-card').forEach((card, index) => {
        let button = card.querySelector('.btn-add-cart');
        if (!button) {
            button = document.createElement('button');
            button.className = 'btn-add-cart';
            button.type = 'button';
            button.textContent = 'Add to Cart';
            card.querySelector('.m-info')?.appendChild(button);
        }

        button.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();

            const merchant = card.querySelector('.m-name')?.textContent.trim() || 'OrdermoPH Merchant';
            const itemName = card.dataset.item || card.querySelector('.m-item')?.textContent.trim();
            const tags = card.querySelector('.m-tags')?.textContent.trim() || 'Available food';
            const area = document.querySelector('.hero-text h1')?.textContent.trim() || 'Selected Area';
            const basePrice = Number(card.dataset.price) || [149, 189, 229, 259][index % 4];

            addToCart({
                id: `${area}-${merchant}-${itemName || tags}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                name: itemName || `${tags} Meal`,
                merchant,
                area,
                price: basePrice
            });
        });
    });
}



function renderLocationCatalog() {
    const catalog = document.getElementById('locationCatalog');
    if (!catalog) return;

    const totalLocations = Object.values(LOCATIONS_BY_REGION).reduce((sum, locations) => sum + locations.length, 0);

    catalog.innerHTML = `
        <section class="cities">
            <h2>OrdermoPH Locations</h2>
            <p class="subtitle">${totalLocations} Central Luzon cities and towns with unlimited food choices per place in this demo catalog.</p>
        </section>
        ${Object.entries(LOCATIONS_BY_REGION).map(([region, locations]) => `
            <section class="location-region">
                <h1 class="region-name">${region}</h1>
                <div class="city-grid location-grid">
                    ${locations.map((location, localIdx) => {
                        const locationImages = {
                            'Botolan': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop',
                            'Cabangan': 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1200&auto=format&fit=crop',
                            'Candelaria': 'https://images.unsplash.com/photo-1552083375-1447ce886485?q=80&w=1200&auto=format&fit=crop',
                            'Castillejos': 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=1200&auto=format&fit=crop',
                            'Iba': 'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?q=80&w=1200&auto=format&fit=crop',
                            'Masinloc': 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1200&auto=format&fit=crop',
                            'Olongapo City': 'https://images.unsplash.com/photo-1505144808419-1957a94ca61e?q=80&w=1200&auto=format&fit=crop',
                            'Palauig': 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?q=80&w=1200&auto=format&fit=crop',
                            'San Antonio': 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1200&auto=format&fit=crop',
                            'San Felipe': 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=1200&auto=format&fit=crop',
                            'San Marcelino': 'https://images.unsplash.com/photo-1540206395-68808572332f?q=80&w=1200&auto=format&fit=crop',
                            'San Narciso': 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=1200&auto=format&fit=crop',
                            'Santa Cruz': 'https://images.unsplash.com/photo-1416331108676-a22ccb276e35?q=80&w=1200&auto=format&fit=crop',
                            'Subic': 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?q=80&w=1200&auto=format&fit=crop',
                            'Subic Bay Freeport': 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?q=80&w=1200&auto=format&fit=crop',
                            'Abucay': 'https://images.unsplash.com/photo-1598890777032-bde835ba27c2?q=80&w=1200&auto=format&fit=crop',
                            'Bagac': 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=1200&auto=format&fit=crop',
                            'Balanga City': 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=1200&auto=format&fit=crop',
                            'Dinalupihan': 'https://images.unsplash.com/photo-1519003300449-424ad0405076?q=80&w=1200&auto=format&fit=crop',
                            'Hermosa': 'https://images.unsplash.com/photo-1501854140801-50d01698950b?q=80&w=1200&auto=format&fit=crop',
                            'Limay': 'https://images.unsplash.com/photo-1433086966358-54859d0ed716?q=80&w=1200&auto=format&fit=crop',
                            'Mariveles': 'https://images.unsplash.com/photo-1505228395891-9a51e7e86bf6?q=80&w=1200&auto=format&fit=crop',
                            'Morong': 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?q=80&w=1200&auto=format&fit=crop',
                            'Orani': 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?q=80&w=1200&auto=format&fit=crop',
                            'Orion': 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=1200&auto=format&fit=crop',
                            'Pilar': 'https://upload.wikimedia.org/wikipedia/commons/4/4f/Mt._Samat_Cross_National_Shrine_of_Bataan.jpg',
                            'Samal': 'https://images.unsplash.com/photo-1519046904884-53103b34b206?q=80&w=1200&auto=format&fit=crop',
                            'Angat': 'https://images.unsplash.com/photo-1693048205317-4c625ad3462e?q=80&w=1200&auto=format&fit=crop',
                            'Balagtas': 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1200&auto=format&fit=crop',
                            'Baliwag City': 'https://images.unsplash.com/photo-1558206648-2af255207f73?q=80&w=1200&auto=format&fit=crop',
                            'Bocaue': 'https://images.unsplash.com/photo-1697522856387-f549be5e5e72?q=80&w=1200&auto=format&fit=crop',
                            'Bulakan': 'https://images.unsplash.com/photo-1773393878306-2c2ba5e73b46?q=80&w=1200&auto=format&fit=crop',
                            'Bustos': 'https://images.unsplash.com/photo-1716863451357-f193111b8f8e?q=80&w=1200&auto=format&fit=crop',
                            'Calumpit': 'https://images.unsplash.com/photo-1746616581704-afaa2880aae3?q=80&w=1200&auto=format&fit=crop',
                            'Doña Remedios Trinidad': 'https://images.unsplash.com/photo-1757536602142-7a51e51ce445?q=80&w=1200&auto=format&fit=crop',
                            'Guiguinto': 'https://images.unsplash.com/photo-1749995925220-bf91b2be4a59?q=80&w=1200&auto=format&fit=crop',
                            'Hagonoy': 'https://images.unsplash.com/photo-1778090887585-b27fae5b6f03?q=80&w=1200&auto=format&fit=crop',
                            'Malolos City': 'https://upload.wikimedia.org/wikipedia/commons/0/09/Barasoain_Church_(Paseo_del_Congreso,_Malolos,_Bulacan;_02-10-2024).jpg',
                            'Marilao': 'https://images.unsplash.com/photo-1756572798471-53eddbae1107?q=80&w=1200&auto=format&fit=crop',
                            'Meycauayan City': 'https://images.unsplash.com/photo-1555590858-be28a58c2688?q=80&w=1200&auto=format&fit=crop',
                            'Norzagaray': 'https://upload.wikimedia.org/wikipedia/commons/6/69/01454jfHilltop_San_Mateo_Sitio_Bitbit_Lorenzo_River_Bridge_Norzagaray_Bulacan_villagesfvf_06.JPG',
                            'Obando': 'https://images.unsplash.com/photo-1743665444893-95c353d2dd53?q=80&w=1200&auto=format&fit=crop',
                            'Pandi': 'https://images.unsplash.com/photo-1757258631909-9395eb4fdfa0?q=80&w=1200&auto=format&fit=crop',
                            'Paombong': 'https://images.unsplash.com/photo-1743309196261-1b4f7028b297?q=80&w=1200&auto=format&fit=crop',
                            'Plaridel': 'https://images.unsplash.com/photo-1657471788232-24bab0f409ce?q=80&w=1200&auto=format&fit=crop',
                            'Pulilan': 'https://upload.wikimedia.org/wikipedia/commons/e/e9/02226jfLongos_Angat_River_Resort_Bridge_Plaridel_Pulilan_Highway_Bulacanfvf_16.JPG',
                            'San Ildefonso': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=1200&auto=format&fit=crop',
                            'San Jose del Monte City': 'https://images.unsplash.com/photo-1739156652273-07b0a6ab4875?q=80&w=1200&auto=format&fit=crop',
                            'San Miguel': 'https://upload.wikimedia.org/wikipedia/commons/b/b5/Biak-na-Bato_National_Parkjf6166_09.JPG',
                            'San Rafael': 'https://images.unsplash.com/photo-1721535627752-87bcd7fd1dc6?q=80&w=1200&auto=format&fit=crop',
                            'Santa Maria': 'https://images.unsplash.com/photo-1757258631937-5dfdd0dae3a8?q=80&w=1200&auto=format&fit=crop',
                            'Angeles City': 'https://images.unsplash.com/photo-1739320365494-ff3e8f18f1f5?q=80&w=1200&auto=format&fit=crop',
                            'Apalit': 'https://images.unsplash.com/photo-1771533679989-b16317fe3cfe?q=80&w=1200&auto=format&fit=crop',
                            'Arayat': 'https://images.unsplash.com/photo-1753482773881-700bc97d4643?q=80&w=1200&auto=format&fit=crop',
                            'Bacolor': 'https://images.unsplash.com/photo-1613686224427-29b757c04e0d?q=80&w=1200&auto=format&fit=crop',
                            'Candaba': 'https://images.unsplash.com/photo-1633670057397-b12fc5289e96?q=80&w=1200&auto=format&fit=crop',
                            'Floridablanca': 'https://images.unsplash.com/photo-1746260948447-c06796c0a901?q=80&w=1200&auto=format&fit=crop',
                            'Guagua': 'https://images.unsplash.com/photo-1559664043-c734ede8f599?q=80&w=1200&auto=format&fit=crop',
                            'Lubao': 'https://images.unsplash.com/photo-1756731503024-a22ea6f8aba0?q=80&w=1200&auto=format&fit=crop',
                            'Mabalacat City': 'https://images.unsplash.com/photo-1758782552293-bbc834452bf3?q=80&w=1200&auto=format&fit=crop',
                            'Macabebe': 'https://images.unsplash.com/photo-1756570202593-417b10c95d24?q=80&w=1200&auto=format&fit=crop',
                            'Magalang': 'https://images.unsplash.com/photo-1758782551890-0f47a570859c?q=80&w=1200&auto=format&fit=crop',
                            'Masantol': 'https://images.unsplash.com/photo-1763581616094-c1b4097972d4?q=80&w=1200&auto=format&fit=crop',
                            'Mexico': 'https://images.unsplash.com/photo-1593994603115-deaa40043bae?q=80&w=1200&auto=format&fit=crop',
                            'Minalin': 'https://images.unsplash.com/photo-1575728462679-84fc4fa374f9?q=80&w=1200&auto=format&fit=crop',
                            'Porac': 'https://images.unsplash.com/photo-1711060204030-09b3ac1f1869?q=80&w=1200&auto=format&fit=crop',
                            'San Fernando City': 'https://images.unsplash.com/photo-1535564998123-a8bf4d7ca04f?q=80&w=1200&auto=format&fit=crop',
                            'San Luis': 'https://images.unsplash.com/photo-1598935821198-3f4a54b116fb?q=80&w=1200&auto=format&fit=crop',
                            'San Simon': 'https://images.unsplash.com/photo-1717426092186-ef84ef758003?q=80&w=1200&auto=format&fit=crop',
                            'Santa Ana': 'https://images.unsplash.com/photo-1725773647026-d1ac24ec8a29?q=80&w=1200&auto=format&fit=crop',
                            'Santa Rita': 'https://images.unsplash.com/photo-1532669056749-3feb6ac9bae7?q=80&w=1200&auto=format&fit=crop',
                            'Santo Tomas': 'https://images.unsplash.com/photo-1756570202577-3b9b03006f88?q=80&w=1200&auto=format&fit=crop',
                            'Sasmuan': 'https://images.unsplash.com/photo-1757258631958-52fee021dc0c?q=80&w=1200&auto=format&fit=crop'
                        };
                        const img = locationImages[location];
                        const bgStyle = img ? ` style="background: linear-gradient(transparent, rgba(0,0,0,0.7)), url('${img}') center / cover;"` : '';
                        return `
                        <a href="${getAreaLink(location)}" class="city-link">
                            <div class="city-card city-${localIdx % 6}"${bgStyle}>
                                <span>${location}</span>
                                <small>View foods & prices</small>
                            </div>
                        </a>
                    `}).join('')}
                </div>
            </section>
        `).join('')}
    `;
}

async function renderAreaMenu() {
    const grid = document.querySelector('.merchant-grid');
    const areaHeading = document.querySelector('.hero-text h1');
    if (!grid || !areaHeading) return;

    const areaFromUrl = getCurrentAreaFromUrl();
    const area = areaFromUrl || areaHeading.textContent.trim();
    areaHeading.textContent = area;
    document.title = `OrdermoPH - Delivering to ${area}`;
    
    // 1. Get Hardcoded Menu
    const hardcodedMenu = getMenuForArea(area);
    
    // 2. Get Merchant Uploaded Items from Firestore
    let merchantItems = [];
    try {
        const q = query(collection(db, 'merchant_items'), where('available', '==', true));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // In a real app, we'd filter by merchant area too. 
            // For this demo, we'll show them as 'Special' items.
            merchantItems.push({
                merchant: data.merchantName,
                item: data.name,
                category: data.category,
                price: data.price,
                time: '20-30 mins',
                rating: 'New',
                isUploaded: true
            });
        });
    } catch (err) {
        console.error("Error fetching merchant items:", err);
    }

    const combinedMenu = [...merchantItems, ...hardcodedMenu];

    let intro = document.querySelector('.menu-intro');
    if (!intro) {
        intro = document.createElement('div');
        intro.className = 'menu-intro';
        grid.parentElement.insertBefore(intro, grid);
    }

    intro.innerHTML = `
        <h2>${combinedMenu.length} food choices available in ${area}</h2>
        <p>This menu includes merchant-uploaded specials and regional favorites.</p>
    `;

    const baseImgPath = 'https://images.unsplash.com/photo-';
    const imgParams = '?q=80&w=1200&auto=format&fit=crop';
    const itemImages = {
        coffee: '1693570860207-93de69ecca3f',
        latte: '1777463940280-6de275a1a3e3',
        icedCoffee: '1768319303662-2fac8ef86043',
        icedCoffee2: '1759912255418-1a4de923b655',
        coffeeMachine: '1745594618788-1e09ad12a275',
        milkTea: '1741244133076-afcdda4befae',
        milkTea2: '1741243038487-1d835e67bcbf',
        milkTea3: '1697206764204-64c1ae4c7f79',
        boba: '1747016804753-866c3ed6b3b7',
        burger: '1754047167137-67ea6bc803b7',
        chickenBurger: '1778449690398-25637cfdb822',
        pizza: '1778449068450-cf13d3d133c4',
        sushi: '1778327564889-6a6691abee78',
        chicken: '1775039983802-b3eb3f68cd2c',
        friedChicken: '1767427401867-ab1ca12a417d',
        filipinoFood: '1537495988501-f9cd94a78f3e',
        lechon: '1704865192176-d15656117a76',
        pork: '1625477811233-044633d10dd1',
        adobo: '1570275239925-4af0aa93a0dc',
        filipinoBowl: '1635452066377-6df9b3529b33',
        boodle: '1688084403060-3594a4b8ff8d',
        steak: '1774806189017-f4c1f2760ad2',
        dessert: '1757521431392-27d1fcb36c56',
        pasta: '1767065603893-51ab14faefaa',
        seafood: '1774635804786-5ebb8f88dcdf',
        cheeseSticks: '1753078947030-fbe02edf291d',
        smoothie: '1756132541105-3e16e8ea0697',
        padThai: '1744330356991-1e634f77b930',
        thaiDishes: '1763647818427-326fa8e6699f',
        herbs: '1771715740755-33959b7e6315',
        bibimbap: '1744444204256-9678abf3209d',
        pancit: '1727403607233-648affc1af36',
        lumpia: '1747045142479-8c29f86307cd',
        friedRice: '1768634003113-42903d7ffe1b',
        ribs: '1766050588893-b095ceaef1fb',
        koreanBBQ: '1772498181580-068f0744ad17',
        brisket: '1774923097632-c98e17b7e842',
        beefStew: '1740993382497-65dba6c7a689',
        beefTeriyaki: '1769681375998-1b231dcbe363',
        lengua: '1767974822929-ba6e6b909365',
        crispyPata: '1755742319537-449f661a3190',
        fishFillet: '1767429013002-69b35cb45395'
    };
    function getItemImg(name, merchant) {
        const n = name.toLowerCase();
        const m = (merchant || '').toLowerCase();
        if (m.includes('wild herbs')) return baseImgPath + itemImages.herbs + imgParams;
        if (n.includes('spanish latte') || n.includes('caramel latte') || n.includes('iced mocha') || n.includes('caramel macchiato') || (n.includes('coffee') && !n.includes('fried'))) return baseImgPath + itemImages.latte + imgParams;
        if (n.includes('milk tea')) return baseImgPath + itemImages.milkTea + imgParams;
        if (n.includes('smoothie') || n.includes('shake')) return baseImgPath + itemImages.smoothie + imgParams;
        if (n.includes('burger')) return baseImgPath + itemImages.burger + imgParams;
        if (n.includes('pizza')) return baseImgPath + itemImages.pizza + imgParams;
        if (n.includes('sushi') || n.includes('salmon') || n.includes('tuna')) return baseImgPath + itemImages.sushi + imgParams;
        if (n.includes('pad thai') || n.includes('thai')) return baseImgPath + itemImages.padThai + imgParams;
        if (n.includes('bibimbrown') || n.includes('bibimbap')) return baseImgPath + itemImages.bibimbap + imgParams;
        if (n.includes('bao')) return baseImgPath + itemImages.pork + imgParams;
        if (n.includes('adobo') && !n.includes('garlic')) return baseImgPath + itemImages.adobo + imgParams;
        if (n.includes('lumpia') || n.includes('spring roll')) return baseImgPath + itemImages.lumpia + imgParams;
        if (n.includes('pancit') || n.includes('canton')) return baseImgPath + itemImages.pancit + imgParams;
        if (n.includes('fried rice') || n.includes('yang chow')) return baseImgPath + itemImages.friedRice + imgParams;
        if ((n.includes('rice meal') || n.includes('rice bowl')) && !n.includes('chicken')) return baseImgPath + itemImages.friedRice + imgParams;
        if (n.includes('country fried') || n.includes('fried chicken') || n.includes('chickenjoy')) return baseImgPath + itemImages.friedChicken + imgParams;
        if ((n.includes('chicken') && !n.includes('burger')) || n.includes('buttered chicken') || n.includes('chicken curry') || n.includes('chicken meat')) return baseImgPath + itemImages.chicken + imgParams;
        if (n.includes('baby back') || n.includes('spareribs')) return baseImgPath + itemImages.ribs + imgParams;
        if (n.includes('korean beef') || n.includes('korean rib')) return baseImgPath + itemImages.koreanBBQ + imgParams;
        if (n.includes('beef brisket')) return baseImgPath + itemImages.brisket + imgParams;
        if (n.includes('beef stew')) return baseImgPath + itemImages.beefStew + imgParams;
        if (n.includes('beef teriyaki')) return baseImgPath + itemImages.beefTeriyaki + imgParams;
        if (n.includes('lengua') || n.includes('ox tongue')) return baseImgPath + itemImages.lengua + imgParams;
        if (n.includes('crispy pata')) return baseImgPath + itemImages.crispyPata + imgParams;
        if (n.includes('lechon kawali') || n.includes('kawali')) return baseImgPath + itemImages.lechon + imgParams;
        if (n.includes('fish fillet') || n.includes('lemon garlic') || n.includes('basil cream')) return baseImgPath + itemImages.fishFillet + imgParams;
        if (n.includes('pork') || n.includes('sisig') || n.includes('pata') || n.includes('tocino') || n.includes('dinakdakan') || n.includes('bbq') || n.includes('liempo') || n.includes('chops')) return baseImgPath + itemImages.pork + imgParams;
        if (n.includes('pasta') || n.includes('carbonara') || n.includes('alfredo')) return baseImgPath + itemImages.pasta + imgParams;
        if (n.includes('boodle') || n.includes('fiesta')) return baseImgPath + itemImages.boodle + imgParams;
        if (n.includes('seafood') || n.includes('pusit')) return baseImgPath + itemImages.seafood + imgParams;
        if (n.includes('fish') || n.includes('coco fish')) return baseImgPath + itemImages.seafood + imgParams;
        if (n.includes('steak') || n.includes('beef ribs') || n.includes('beef')) return baseImgPath + itemImages.steak + imgParams;
        if (n.includes('adobo')) return baseImgPath + itemImages.adobo + imgParams;
        if (n.includes('garlic')) return baseImgPath + itemImages.steak + imgParams;
        if (n.includes('cheesecake') || n.includes('ensaymada') || n.includes('dessert') || n.includes('mango sago') || n.includes('blueberry')) return baseImgPath + itemImages.dessert + imgParams;
        if (n.includes('chili') || n.includes('cheese sticks') || n.includes('finger')) return baseImgPath + itemImages.cheeseSticks + imgParams;
        if (n.includes('wings')) return baseImgPath + itemImages.friedChicken + imgParams;
        if (n.includes('sizzling') || n.includes('silog') || n.includes('inasal')) return baseImgPath + itemImages.filipinoBowl + imgParams;
        if (n.includes('crispy') || n.includes('buffalo')) return baseImgPath + itemImages.pork + imgParams;
        if (n.includes('lechon')) return baseImgPath + itemImages.lechon + imgParams;
        if (n.includes('rice') && !n.includes('white') && !n.includes('brown')) return baseImgPath + itemImages.friedRice + imgParams;
        if (n.includes('ribs')) return baseImgPath + itemImages.ribs + imgParams;
        return null;
    }
    grid.innerHTML = combinedMenu.map((entry, index) => {
        const placeholderClass = entry.isUploaded ? 'menu-uploaded' : `menu-${index % 6}`;
        const itemImg = getItemImg(entry.item, entry.merchant);
        const bgStyle = itemImg ? ` style="background: linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.5)), url('${itemImg}') center / cover;"` : '';
        return `
            <div class="m-card" data-item="${entry.item}" data-price="${entry.price}">
                <div class="m-image menu-placeholder ${placeholderClass}"${bgStyle}>
                    <span class="free-delivery">${entry.isUploaded ? 'MERCHANT UPLOAD' : 'AVAILABLE'}</span>
                </div>
                <div class="m-info">
                    <div class="m-header">
                        <span class="verified-icon">✓</span>
                        <h4 class="m-name">${entry.merchant}</h4>
                        <span class="m-time">${entry.time}</span>
                    </div>
                    <h5 class="m-item">${entry.item}</h5>
                    <div class="m-details">
                        <span class="m-price">${money.format(entry.price)}</span>
                        <span class="m-tags">${entry.category}</span>
                    </div>
                    <div class="m-footer">
                        <span class="m-rating">★ ${entry.rating}</span>
                    </div>
                    <button class="btn-add-cart" type="button">Add to Cart</button>
                </div>
            </div>
        `;
    }).join('');
    
    addMerchantButtons();
}

function initCart() {
    ensureCartDrawer();

    document.querySelectorAll('.cart-icon, #cartOpenBtn').forEach(trigger => {
        if (!trigger.id) trigger.id = 'cartOpenBtn';
        if (!trigger.querySelector('#cart-count')) {
            const badge = document.createElement('span');
            badge.id = 'cart-count';
            badge.textContent = '0';
            trigger.appendChild(badge);
        }

        trigger.addEventListener('click', (event) => {
            event.preventDefault();
            if (!canOpenCart()) return;
            openCart();
        });
    });

    document.addEventListener('click', (event) => {
        const removeButton = event.target.closest('[data-remove-id]');
        if (removeButton) {
            const id = removeButton.dataset.removeId;
            saveCart(getCart().filter(item => item.id !== id));
            return;
        }

        if (event.target.closest('#cartCloseBtn') || event.target.id === 'cartOverlay') {
            closeCart();
        }
    });

    renderAreaMenu();
    addMerchantButtons();
    updateCartUi();
}

function initDropdown() {
    const accountBtn = document.getElementById('accountBtn');
    const dropdownMenu = document.getElementById('dropdownMenu');

    if (!accountBtn || !dropdownMenu) return;

    accountBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        dropdownMenu.classList.toggle('active');
    });

    window.addEventListener('click', function(e) {
        if (dropdownMenu.classList.contains('active') && !dropdownMenu.contains(e.target) && e.target !== accountBtn) {
            dropdownMenu.classList.remove('active');
        }
    });
}

function updateAuthUI(user) {
    const accountBtn = document.getElementById('accountBtn');
    const dropdownMenu = document.getElementById('dropdownMenu');
    const dashboardShortcut = document.getElementById('alreadyMerchantLink');
    const riderLink = document.getElementById('alreadyRiderLink');
    const merchantProfile = JSON.parse(localStorage.getItem('ordermo_merchant_profile') || 'null');
    const riderProfile = JSON.parse(localStorage.getItem('ordermo_rider_profile') || 'null');

    if (!accountBtn || !dropdownMenu) return;

    if (user || merchantProfile || riderProfile) {
        const name = user ? (user.displayName || user.phoneNumber || "User") : (merchantProfile?.business_name || riderProfile?.full_name || 'User');
        const firstName = name.split(' ')[0];
        accountBtn.innerHTML = `${firstName} ▾`;

        if (dashboardShortcut) dashboardShortcut.style.display = merchantProfile ? 'block' : 'none';
        if (riderLink) riderLink.style.display = riderProfile ? 'block' : 'none';

        dropdownMenu.innerHTML = `
            <div class="dropdown-item" style="font-weight: bold; color: #2e7d32;">Hi, ${firstName}!</div>
            <hr class="dropdown-divider">
            ${merchantProfile ? '<a href="merchant-dashboard.html" class="dropdown-item">Merchant Dashboard</a>' : ''}
            ${riderProfile ? '<a href="rider-dashboard.html" class="dropdown-item">Rider Dashboard</a>' : ''}
            <a href="#checkout" class="dropdown-item">Checkout</a>
            ${!merchantProfile ? '<a href="#merchant" class="dropdown-item">Apply as Merchant</a>' : ''}
            ${!riderProfile ? '<a href="#rider" class="dropdown-item">Apply as Rider</a>' : ''}
            <hr class="dropdown-divider">
            <a href="#" id="logoutBtn" class="dropdown-item" style="color: #d32f2f;">Sign Out</a>
        `;

        document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('ordermo_merchant_profile');
            localStorage.removeItem('ordermo_rider_profile');
            if (user) {
                signOut(auth).then(() => {
                    window.location.hash = '#home';
                });
            } else {
                updateAuthUI(null);
                window.location.hash = '#home';
            }
        });
    } else {
        accountBtn.innerHTML = `Account ▾`;
        if (dashboardShortcut) dashboardShortcut.style.display = 'block';
        if (riderLink) riderLink.style.display = 'none';

        dropdownMenu.innerHTML = `
            <a href="#login" class="dropdown-item main-action">Log in / Sign up</a>
            <hr class="dropdown-divider">
            <a href="#merchant" class="dropdown-item">Apply as Merchant</a>
            <a href="#rider" class="dropdown-item">Apply as Rider</a>
        `;
    }
}

onAuthStateChanged(auth, (user) => {
    updateAuthUI(user);
    if (user) {
        const userData = {
            uid: user.uid,
            email: user.email || null,
            displayName: user.displayName || null,
            phoneNumber: user.phoneNumber || null,
            photoURL: user.photoURL || null,
            lastLogin: serverTimestamp()
        };
        setDoc(doc(db, 'users', user.uid), userData, { merge: true }).catch(err => {
            console.warn('Failed to save user profile:', err);
        });
    }
});

const initLoginPage = () => {
    const authStatus = document.getElementById('authStatus');
    const googleBtn = document.getElementById('googleSignInBtn');
    const appleBtn = document.getElementById('appleSignInBtn');

    const setAuthStatus = (message, isError = false) => {
        if (!authStatus) return;
        authStatus.textContent = message;
        authStatus.classList.toggle('error', isError);
    };

    const signInWithProvider = async (provider, button, label) => {
        try {
            if (button) {
                button.disabled = true;
                button.style.opacity = '0.75';
            }

            setAuthStatus(`Opening ${label} sign-in...`);
            await signInWithPopup(auth, provider);
            setAuthStatus('Login successful. Redirecting...');
            window.location.hash = '#home';
        } catch (err) {
            console.error(`${label} sign-in error:`, err);
            const messageByCode = {
                'auth/popup-closed-by-user': `${label} sign-in was closed before it finished.`,
                'auth/popup-blocked': `The browser blocked the ${label} sign-in popup. Allow popups for this site and try again.`,
                'auth/unauthorized-domain': `This site URL is not authorized in Firebase Authentication. Add localhost or your domain in Firebase settings.`,
                'auth/operation-not-allowed': `${label} login is not enabled yet in Firebase Authentication.`
            };
            setAuthStatus(messageByCode[err.code] || `${label} sign-in failed. Check Firebase Authentication settings.`, true);
        } finally {
            if (button) {
                button.disabled = false;
                button.style.opacity = '';
            }
        }
    };

    googleBtn?.addEventListener('click', () => {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        signInWithProvider(provider, googleBtn, 'Google');
    });

    appleBtn?.addEventListener('click', () => {
        const provider = new OAuthProvider('apple.com');
        provider.addScope('email');
        provider.addScope('name');
        signInWithProvider(provider, appleBtn, 'Apple');
    });
};

const initApplicationForms = () => {
    const handleForm = (formId, collectionName, successMsg, onSuccess) => {
        const form = document.getElementById(formId);
        if (!form) return;

        const collectData = () => {
            const inputs = form.querySelectorAll('input, select');
            const data = {
                timestamp: serverTimestamp(),
                userId: auth.currentUser ? auth.currentUser.uid : 'anonymous'
            };
            inputs.forEach((input, index) => {
                if (input.type !== 'submit' && input.type !== 'button' && input.type !== 'file') {
                    const label = input.name || input.placeholder || `field_${index}`;
                    data[label.replace(/\s+/g, '_').toLowerCase()] = input.value;
                }
            });
            return data;
        };

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = collectData();
            try {
                await addDoc(collection(db, collectionName), data);
                if (onSuccess) {
                    onSuccess(data);
                } else if (formId === 'merchantForm') {
                    localStorage.setItem('ordermo_merchant_profile', JSON.stringify(data));
                    window.location.hash = '#home';
                    updateAuthUI(auth.currentUser);
                } else {
                    alert(successMsg);
                }
                form.reset();
            } catch (err) {
                console.error("Firestore error:", err);
                alert("Submission failed.");
            }
        });
    };

    handleForm('merchantForm', 'merchant_applications', 'Merchant application submitted!');
    handleForm('riderForm', 'rider_applications', 'Rider application submitted!', (data) => {
        localStorage.setItem('ordermo_rider_profile', JSON.stringify(data));
        window.location.href = 'rider-dashboard.html';
    });
};

function initCheckoutPage() {
    const checkoutForm = document.getElementById('checkoutForm');
    if (!checkoutForm) return;

    const address = getAddress();
    Object.entries(address).forEach(([key, value]) => {
        const field = checkoutForm.elements[key];
        if (field) field.value = value;
    });

    const renderCheckout = () => {
        const cart = getCart();
        const list = document.getElementById('checkoutItems');
        const submitButton = checkoutForm.querySelector('button[type="submit"]');
        const subtotal = getCartTotal(cart);
        const deliveryFee = cart.length ? 49 : 0;
        const total = subtotal + deliveryFee;

        document.getElementById('checkoutSubtotal').textContent = money.format(subtotal);
        document.getElementById('checkoutDelivery').textContent = money.format(deliveryFee);
        document.getElementById('checkoutTotal').textContent = money.format(total);

        if (cart.length === 0) {
            list.innerHTML = '<p class="empty-cart">Your cart is empty. Choose an area and add food first.</p>';
            submitButton.disabled = true;
            return;
        }

        submitButton.disabled = false;
        list.innerHTML = cart.map(item => `
            <div class="checkout-item">
                <div>
                    <strong>${item.name}</strong>
                    <span>${item.merchant} - ${item.area}</span>
                </div>
                <b>${money.format(item.price * item.quantity)}</b>
            </div>
        `).join('');
    };

    window.renderCheckoutSummary = renderCheckout;
    renderCheckout();

    checkoutForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (!auth.currentUser) {
            alert("Please log in with Google or Apple before confirming your order.");
            window.location.hash = '#login';
            return;
        }

        const cart = getCart();
        if (!cart.length) return;

        const formData = new FormData(checkoutForm);
        const deliveryAddress = Object.fromEntries(formData.entries());
        saveAddress(deliveryAddress);

        const order = {
            userId: auth.currentUser.uid,
            customerName: auth.currentUser.displayName || auth.currentUser.phoneNumber || 'OrdermoPH Customer',
            items: cart,
            deliveryAddress,
            paymentMethod: deliveryAddress.paymentMethod,
            subtotal: getCartTotal(cart),
            deliveryFee: 49,
            total: getCartTotal(cart) + 49,
            status: 'Pending merchant',
            createdAt: new Date().toISOString()
        };

        try {
            const docRef = await addDoc(collection(db, 'orders'), {
                ...order,
                timestamp: serverTimestamp()
            });
            order.orderId = docRef.id;
        } catch (err) {
            console.error("Order saved locally because Firestore failed:", err);
            order.orderId = `LOCAL-${Date.now()}`;
        }

        localStorage.setItem(LAST_ORDER_KEY, JSON.stringify(order));
        saveCart([]);
        window.location.hash = '#confirmation';
    });
}

function initConfirmationPage() {
    const confirmation = document.getElementById('orderConfirmation');
    if (!confirmation) return;

    window.renderOrderConfirmation = initConfirmationPage;
    const order = JSON.parse(localStorage.getItem(LAST_ORDER_KEY) || 'null');
    if (!order) {
        confirmation.innerHTML = `
            <h1>No active order</h1>
            <p>Choose your area and add food to start a delivery order.</p>
            <a class="btn-submit link-button" href="#home">Browse Areas</a>
        `;
        return;
    }

    confirmation.innerHTML = `
        <p class="status-pill">${order.status}</p>
        <h1>Order confirmed</h1>
        <p class="confirmation-copy">Your order has been sent to the merchant for review. We'll notify you once it's accepted.</p>
        <div class="summary-card">
            <h3>Delivery Location</h3>
            <p>${order.deliveryAddress.houseNo}, ${order.deliveryAddress.street}</p>
            <p>${order.deliveryAddress.barangay}, ${order.deliveryAddress.city}</p>
            <p>${order.deliveryAddress.landmark || ''}</p>
        </div>
        <div class="summary-card">
            <h3>Payment</h3>
            <p>${order.paymentMethod}</p>
            <strong>${money.format(order.total)}</strong>
        </div>
        <a class="btn-submit link-button" href="#home">Order Again</a>
    `;
}

function showView() {
    const route = getRoute();
    const viewMap = {
        home: 'homeView',
        menu: 'menuView',
        login: 'loginView',
        checkout: 'checkoutView',
        confirmation: 'confirmationView',
        merchant: 'merchantView',
        rider: 'riderView',
        dashboard: 'merchantDashboardView'
    };
    const viewId = viewMap[route] || 'homeView';

    document.querySelectorAll('.app-view').forEach(view => {
        view.classList.toggle('active', view.id === viewId);
    });

    if (route === 'menu') {
        renderAreaMenu();
        addMerchantButtons();
    } else {
        closeCart();
    }

    if (route === 'checkout') {
        window.renderCheckoutSummary?.();
    }

    if (route === 'confirmation') {
        window.renderOrderConfirmation?.();
    }

    window.scrollTo({ top: 0, behavior: 'auto' });
    updateCartUi();
}

function initSinglePageNavigation() {
    if (!window.location.hash) {
        window.location.hash = '#home';
    }
    showView();
    window.addEventListener('hashchange', showView);
}

initDropdown();
initCart();
renderLocationCatalog();
initLoginPage();
initApplicationForms();
initCheckoutPage();
initConfirmationPage();
initSinglePageNavigation();
