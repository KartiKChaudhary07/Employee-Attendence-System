// Admin authentication module
const adminCredentials = {
    username: '2215000878',
    password: '1234'
};

// Check if user is authenticated
function isAdminAuthenticated() {
    return localStorage.getItem('adminAuthenticated') === 'true';
}

// Authenticate admin
function authenticateAdmin(username, password) {
    if (username === adminCredentials.username && password === adminCredentials.password) {
        localStorage.setItem('adminAuthenticated', 'true');
        return true;
    }
    return false;
}

// Logout admin
function logoutAdmin() {
    localStorage.removeItem('adminAuthenticated');
}

// Protect admin routes
function protectAdminRoute() {
    if (!isAdminAuthenticated() && !window.location.href.includes('admin-login.html')) {
        window.location.href = 'admin-login.html';
    }
}

// Initialize admin auth on page load
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('admin-') && 
        !window.location.pathname.includes('admin-login.html')) {
        protectAdminRoute();
    }
});
