// Auth.js - Handles user authentication

document.addEventListener('DOMContentLoaded', function() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const authPages = ['login.html', 'signup.html'];
    const protectedPages = ['reports.html', 'students.html', 'profile.html', 'settings.html'];
    
    // Redirect to login if trying to access protected pages without authentication
    if (!currentUser && protectedPages.includes(currentPage)) {
        window.location.href = 'login.html';
        return;
    }
    
    // If user is logged in and on auth pages, redirect to home
    if (currentUser && authPages.includes(currentPage)) {
        window.location.href = 'index.html';
        return;
    }
    
    // Set current date in dashboard
    const currentDateElement = document.getElementById('currentDate');
    if (currentDateElement) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        currentDateElement.textContent = new Date().toLocaleDateString('en-US', options);
    }
});

// Handle login form submission
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const rememberMe = document.getElementById('rememberMe').checked;
        
        // In a real app, you would validate credentials with a server
        // For demo purposes, we'll just log the user in
        const user = {
            id: 'user123',
            email: email,
            name: email.split('@')[0],
            role: 'admin'
        };
        
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        // If remember me is checked, store user data in localStorage
        if (rememberMe) {
            localStorage.setItem('rememberedUser', email);
        }
        
        // Redirect to dashboard
        window.location.href = 'index.html';
    });
}

// Handle signup form submission
const signupForm = document.getElementById('signupForm');
if (signupForm) {
    signupForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const fullName = document.getElementById('fullName').value;
        const email = document.getElementById('signupEmail').value;
        const employeeId = document.getElementById('employeeId').value;
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        // Validate passwords match
        if (password !== confirmPassword) {
            alert('Passwords do not match!');
            return;
        }
        
        // In a real app, you would send this data to a server
        // For demo purposes, we'll just log the user in
        const user = {
            id: employeeId,
            email: email,
            name: fullName,
            role: 'user'
        };
        
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        // Redirect to dashboard
        window.location.href = 'index.html';
    });
}

// Handle logout
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', function(e) {
        e.preventDefault();
        localStorage.removeItem('currentUser');
        window.location.href = 'login.html';
    });
}

// Mobile menu toggle
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', function() {
        const navLinks = document.querySelector('.nav-links');
        navLinks.classList.toggle('active');
    });
}
