// Enhanced login functionality
function handleLogin() {
    console.log('🔐 Login button clicked!');
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        showLoginError('Please enter both username and password');
        return;
    }

    const loginBtn = document.querySelector('.login-btn');
    const originalText = loginBtn.textContent;
    loginBtn.textContent = 'Logging in...';
    loginBtn.disabled = true;

    const loginData = {
        username: username,
        password: password
    };

    // Add loading animation
    loginBtn.style.opacity = '0.8';
    
    fetch('../backend/auth/login_fixed.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // Login successful - show success state
            loginBtn.textContent = 'Rediricting...';
            loginBtn.style.background = '#10b981';
            
            setTimeout(() => {
                localStorage.setItem('user_data', JSON.stringify(data.user));
                window.location.href = 'dashboard.html';
            }, 150);
            
        } else {
            // Login failed
            showLoginError(data.message);
            resetLoginButton(loginBtn, originalText);
        }
    })
    .catch(error => {
        console.error('💥 Fetch error:', error);
        showLoginError('Could not connect to server. Please check if XAMPP is running.');
        resetLoginButton(loginBtn, originalText);
    });
}

function showLoginError(message) {
    // You can enhance this to show a proper error message in the UI
    alert(message);
}

function resetLoginButton(button, originalText) {
    button.textContent = originalText;
    button.disabled = false;
    button.style.opacity = '1';
    button.style.background = '';
}

// Add input field enhancements
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔑 Login page loaded!');
    
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    
    // Enter key support
    usernameInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') handleLogin();
    });
    
    passwordInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') handleLogin();
    });
    
    // Input focus effects
    const inputs = [usernameInput, passwordInput];
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.classList.add('focused');
        });
        
        input.addEventListener('blur', function() {
            if (!this.value) {
                this.parentElement.classList.remove('focused');
            }
        });
    });
});