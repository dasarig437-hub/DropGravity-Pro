const API_BASE = 'http://localhost:5000';

// ---- Token helpers ----
export function getToken() {
    return localStorage.getItem('dg_token');
}

export function getUser() {
    const raw = localStorage.getItem('dg_user');
    return raw ? JSON.parse(raw) : null;
}

function saveAuth(data) {
    localStorage.setItem('dg_token', data.token);
    localStorage.setItem('dg_user', JSON.stringify(data.user));
}

export function clearAuth() {
    localStorage.removeItem('dg_token');
    localStorage.removeItem('dg_user');
}

// ---- Authenticated fetch wrapper ----
async function authFetch(path, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
    };

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

    if (res.status === 401) {
        clearAuth();
        window.dispatchEvent(new Event('dg:logout'));
    }

    return res;
}

// ---- Auth endpoints ----
export async function login(email, password) {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    saveAuth(data);
    return data;
}

export async function register(email, password) {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    saveAuth(data);
    return data;
}

export function logout() {
    clearAuth();
    window.dispatchEvent(new Event('dg:logout'));
}

// ---- Product endpoints ----
export async function fetchMyProducts() {
    const res = await authFetch('/api/products/my');
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to fetch products');
    }
    return res.json();
}

export async function gradeProductAPI(productData) {
    const res = await authFetch('/api/grade', {
        method: 'POST',
        body: JSON.stringify(productData),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to grade product');
    }
    return res.json();
}

export async function analyzeProducts(keyword) {
    const res = await authFetch('/api/products/analyze', {
        method: 'POST',
        body: JSON.stringify({ keyword }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to analyze products');
    }
    return res.json();
}

export async function fetchTrendingProducts() {
    const res = await fetch(`${API_BASE}/api/products/trending`);
    if (!res.ok) {
        throw new Error('Failed to fetch trending products');
    }
    return res.json();
}

