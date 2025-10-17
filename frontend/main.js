// Global variables
let currentUser = null;
let currentSection = 'dashboard';
let currentAlertFilter = 'all'; // Add this line to track current filter

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Dashboard loading...');
    initializeDashboard();
});

// Initialize dashboard
async function initializeDashboard() {
    try {
        console.log('🔐 Checking user authentication...');
        
        // Check if user is authenticated via session
        const response = await fetch('../backend/auth/session_check.php', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        console.log('📨 Session check response:', response);
        
        const data = await response.json();
        console.log('📊 Session data:', data);
        
        if (!data.success) {
            // User not authenticated, redirect to login
            console.log(' User not authenticated:', data.message);
            console.log('🔍 Session debug:', data.session_data);
            alert('Session expired or invalid. Redirecting to login...');
            window.location.href = 'index.html';
            return;
        }
        
        // User is authenticated
        currentUser = data.user;
        console.log('✅ User authenticated:', currentUser);
        
        // Set up the dashboard
        setupUserInterface();
        setupNavigation();
        setCurrentDate();
        setupFormEventListeners();
        
        // Load initial dashboard data
        loadDashboardData();
        
        console.log('🎉 Dashboard initialized successfully!');
        
    } catch (error) {
        console.error('💥 Dashboard initialization error:', error);
        alert('Failed to load dashboard. Redirecting to login...');
        window.location.href = 'index.html';
    }
}

// Setup user interface based on user role
function setupUserInterface() {
    console.log('🎨 Setting up user interface...');
    
    // Display username
    const usernameDisplay = document.getElementById('username-display');
    if (usernameDisplay && currentUser) {
        usernameDisplay.textContent = currentUser.full_name;
        console.log('👤 Username displayed:', currentUser.full_name);
    }
    
    // Hide manage users section for non-admin users
    if (currentUser && currentUser.role !== 'admin') {
        const manageUsersMenu = document.getElementById('manageUsers');
        if (manageUsersMenu) {
            manageUsersMenu.style.display = 'none';
            console.log('🔒 Manage Users menu hidden for non-admin user');
        }
    }
    
    console.log('✅ User interface setup complete');
}


// Setup navigation functionality
function setupNavigation() {
    console.log(' Setting up navigation...');
    
    // The onclick handlers in HTML will handle navigation
    // This function is now simplified since we're using onclick in HTML
    
    console.log('✅ Navigation setup complete');
}


// Setup form event listeners
function setupFormEventListeners() {
    console.log('Setting up form event listeners...');
    
    // Medicine form submission
    const medicineForm = document.getElementById('medicine-form');
    if (medicineForm) {
        medicineForm.addEventListener('submit', handleMedicineFormSubmit);
        console.log('Medicine form listener added');
    }
    
    // Edit medicine form submission
    const editMedicineForm = document.getElementById('edit-medicine-form-element');
    if (editMedicineForm) {
        editMedicineForm.addEventListener('submit', handleEditMedicineFormSubmit);
        console.log('Edit medicine form listener added');
    }
    
    // Reorder form submission
    const reorderForm = document.getElementById('reorder-form');
    if (reorderForm) {
        reorderForm.addEventListener('submit', handleReorderFormSubmit);
        console.log('Reorder form listener added');
    }
    
    // Modal backdrop click to close
    const reorderModal = document.getElementById('reorder-modal');
    if (reorderModal) {
        reorderModal.addEventListener('click', function(e) {
            if (e.target === reorderModal) {
                hideReorderModal();
            }
        });
        
    }
    const saleForm = document.getElementById('sale-form');
    if (saleForm) {
        saleForm.addEventListener('submit', handleSaleFormSubmit);
        console.log('✅ Sale form listener added');
    }
    // User form submission
    const userForm = document.getElementById('user-form');
    if (userForm) {
        userForm.addEventListener('submit', handleUserFormSubmit);
        console.log('User form listener added');
    }
    
    // Edit user form submission
    const editUserForm = document.getElementById('edit-user-form-element');
    if (editUserForm) {
        editUserForm.addEventListener('submit', handleEditUserFormSubmit);
        console.log('Edit user form listener added');
    }
    
    // Password change toggle
    const changePasswordCheckbox = document.getElementById('edit-change-password');
    const passwordField = document.getElementById('edit-password-field');
    if (changePasswordCheckbox && passwordField) {
        changePasswordCheckbox.addEventListener('change', function() {
            passwordField.style.display = this.checked ? 'block' : 'none';
        });
    }
    
    console.log('✅ All form event listeners setup complete');
    
}

// Set current date
function setCurrentDate() {
    const currentDateElement = document.getElementById('current-date');
    if (currentDateElement) {
        const now = new Date();
        const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            weekday: 'long'
        };
        currentDateElement.textContent = now.toLocaleDateString('en-US', options);
        console.log('📅 Current date set');
    }
}

// Show specific section and update navigation highlight
function showSection(sectionName) {
    console.log('📄 Switching to section:', sectionName);
    
    // Hide all content sections
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active class from all sidebar menu items
    const menuItems = document.querySelectorAll('.sidebar-menu li');
    menuItems.forEach(item => {
        item.classList.remove('active');
    });
    
    // Show the requested section
    const targetSection = document.getElementById(sectionName + '-section');
    if (targetSection) {
        targetSection.classList.add('active');
        currentSection = sectionName;
        
        // Find and activate the corresponding sidebar menu item
        activateSidebarMenuItem(sectionName);
         // Reset alerts filter to 'all' when first visiting alerts section
        // Remove this if you want to persist the filter instead
        if (sectionName === 'alerts' && currentAlertFilter === 'all') {
            updateFilterButtons('all');
        }
        // Load data for the specific section
        loadSectionData(sectionName);
        console.log('✅ Section switched to:', sectionName);
    } else {
        console.error(' Section not found:', sectionName + '-section');
    }
}

// Activate the correct sidebar menu item based on section
function activateSidebarMenuItem(sectionName) {
    const menuItems = document.querySelectorAll('.sidebar-menu li');
    
    // Map section names to menu item text
    const sectionToMenuMap = {
        'dashboard': 'Home',
        'inventory': 'Inventory', 
        'alerts': 'Stock Alerts',
        'categories': 'Medicine Category',
        'medicines': 'Medicine List',
        'sales': 'Sales',
        'users': 'Manage Users',
        'profile': 'Profile',
    };
    
    const targetMenuText = sectionToMenuMap[sectionName];
    
    menuItems.forEach(item => {
        if (item.textContent.trim() === targetMenuText) {
            item.classList.add('active');
            console.log('🎯 Activated menu item:', targetMenuText);
        }
    });
}

// Load data for specific sections
async function loadSectionData(sectionName) {
    console.log('📊 Loading data for section:', sectionName);
    
    switch (sectionName) {
        case 'dashboard':
            await loadDashboardData();
            break;
        case 'inventory':
            await loadInventoryData();
            break;
        case 'alerts':
            await loadAlertsData();
            break;
        case 'medicines':
            await loadMedicinesData();
            break;
        case 'sales':
            await loadSalesData();
            break;
        case 'users':
            if (currentUser && currentUser.role === 'admin') {
                await loadUsersData();
            }
            break;
        case 'profile':
            await loadProfileData();
            break;
        default:
            console.log('⚠️ No data loader for section:', sectionName);
    }
}
// Load dashboard data
// Load dashboard data
async function loadDashboardData() {
    try {
        console.log('🏠 Loading dashboard data...');
        
        // Fetch real dashboard data from API
        const response = await fetch('../backend/api/dashboard.php', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        const result = await response.json();
        console.log('📊 Dashboard API response:', result);
        
        if (!result.success) {
            throw new Error(result.message);
        }
        
        const data = result.data;
        
        // Update dashboard cards with real data
        updateDashboardCards({
            totalMedicines: data.statistics.total_medicines,
            lowStockCount: data.statistics.low_stock_count,
            stockAlertsCount: data.statistics.stock_alerts_count,
            todaySales: formatCurrency(data.statistics.today_sales),
            todayTransactions: data.statistics.today_transactions || 0, // Add this line
            inventoryValue: formatCurrency(data.statistics.inventory_value)
        });
        
        // Update recent activity table
        updateRecentActivityTable(data.recent_activity);
        
        console.log('✅ Dashboard data loaded successfully');
        
    } catch (error) {
        console.error(' Error loading dashboard data:', error);
        showErrorMessage('Failed to load dashboard data: ' + error.message);
        
        // Show fallback data
        updateDashboardCards({
            totalMedicines: 'Error',
            lowStockCount: 'Error',
            stockAlertsCount: 'Error',
            todaySales: '₱Error',
            todayTransactions: 'Error' // Add this line
        });
    }
}
// Update dashboard cards
// Update dashboard cards - VERIFIED VERSION
function updateDashboardCards(data) {
    console.log('🔄 Updating dashboard cards with:', data);
    
    const elements = {
        'total-medicines': data.totalMedicines,
        'low-stock-count': data.lowStockCount,
        'stock-alerts-count': data.stockAlertsCount,
        'today-sales': data.todaySales,
        'today-transactions': data.todayTransactions || 0
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
            console.log(`✅ Updated ${id}:`, value);
        } else {
            console.error(`❌ Element not found: ${id}`);
        }
    });
    
    console.log('✅ Dashboard cards updated successfully');
}
// Update recent activity table
function updateRecentActivityTable(activities) {
    const tableBody = document.getElementById('recent-activity');
    if (!tableBody) return;
    
    if (!activities || activities.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #64748b;">No recent activity</td></tr>';
        return;
    }
    
    tableBody.innerHTML = activities.map(activity => `
        <tr>
            <td>
                <strong>${escapeHtml(activity.name)}</strong>
                ${activity.category_name ? `<br><small style="color: #64748b;">${escapeHtml(activity.category_name)}</small>` : ''}
            </td>
            <td>
                <span style="font-weight: bold;">${activity.stock_quantity}</span>
                <small style="color: #64748b;"> / ${activity.reorder_level} min</small>
            </td>
            <td>
                <span class="status-badge status-${activity.status.toLowerCase().replace(' ', '-')}">${activity.status}</span>
            </td>
            <td>${formatDateTime(activity.updated_at)}</td>
        </tr>
    `).join('');
}

// Load inventory data
async function loadInventoryData() {
    try {
        console.log('📦 Loading inventory data...');
        
        const response = await fetch('../backend/api/inventory.php', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        const result = await response.json();
        console.log('📊 Inventory API response:', result);
        
        if (!result.success) {
            throw new Error(result.message);
        }
        
        const data = result.data;
        
        // Update inventory summary cards
        updateInventorySummary(data.summary);
        
        // Update inventory table
        updateInventoryTable(data.medicines);
        
        console.log('✅ Inventory data loaded successfully');
        
    } catch (error) {
        console.error(' Error loading inventory data:', error);
        showErrorMessage('Failed to load inventory data: ' + error.message);
    }
}

// Update inventory summary cards
function updateInventorySummary(summary) {
    const elements = {
        'inventory-total-medicines': summary.total_medicines || 0,
        'inventory-low-stock': summary.low_stock_count || 0,
        'inventory-total-value': formatCurrency(summary.total_value || 0),
        'inventory-categories-count': summary.categories_count || 0
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });
}

// Update inventory table
// Update inventory table
function updateInventoryTable(medicines) {
    const tableBody = document.getElementById('inventory-list');
    if (!tableBody) return;
    
    if (!medicines || medicines.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #64748b;">No medicines found</td></tr>';
        return;
    }
    
    tableBody.innerHTML = medicines.map(medicine => `
        <tr>
            <td>
                <strong>${escapeHtml(medicine.name)}</strong>
                ${medicine.generic_name ? `<br><small style="color: #64748b;">${escapeHtml(medicine.generic_name)}</small>` : ''}
            </td>
            <td>${escapeHtml(medicine.brand || 'N/A')}</td>
            <td>
                <span class="category-badge" style="background-color: ${medicine.category_color || '#6b7280'};">
                    ${escapeHtml(medicine.category_name || 'Uncategorized')}
                </span>
            </td>
            <td>
                <span style="font-weight: bold; color: ${medicine.stock_quantity <= medicine.reorder_level ? '#dc2626' : '#16a34a'};">
                    ${medicine.stock_quantity}
                </span>
                <small style="color: #64748b;"> / ${medicine.reorder_level} min</small>
            </td>
            <td>${formatCurrency(medicine.unit_price)}</td>
            <td>${escapeHtml(medicine.batch_number || 'N/A')}</td> <!-- ADD BATCH NUMBER COLUMN -->
            <td>
                <span class="status-badge status-${medicine.status}">${getStatusText(medicine.status)}</span>
            </td>
            <td>
                <button class="btn btn-small" onclick="editMedicine(${medicine.id})" style="margin-right: 5px;">Edit</button>
                <button class="btn btn-small btn-danger" onclick="deleteMedicine(${medicine.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

// Get readable status text
function getStatusText(status) {
    const statusMap = {
        'in-stock': 'In Stock',
        'low-stock': 'Low Stock',
        'expiring': 'Expiring Soon',
        'expired': 'Expired'
    };
    return statusMap[status] || status;
}

// Add medicine form functions
function showAddMedicineForm() {
    const form = document.getElementById('add-medicine-form');
    if (form) {
        form.classList.remove('hidden');
        document.getElementById('medicine-name').focus();
    }
}

function hideAddMedicineForm() {
    const form = document.getElementById('add-medicine-form');
    if (form) {
        form.classList.add('hidden');
        document.getElementById('medicine-form').reset();
    }
}

// Handle medicine form submission
async function handleMedicineFormSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    const medicineData = {
        name: formData.get('name'),
        generic_name: formData.get('generic_name'),
        brand: formData.get('brand'),
        category: formData.get('category'),
        dosage: formData.get('dosage'),
        unit_price: parseFloat(formData.get('unit_price')),
        stock_quantity: parseInt(formData.get('stock_quantity')),
        reorder_level: parseInt(formData.get('reorder_level')) || 10,
        batch_number: formData.get('batch_number'),  // Changed from edit-batch-number
        expiry_date: formData.get('expiry_date'),    // Changed from edit-expiry-date
        supplier: formData.get('supplier')
    };
    
    try {
        console.log('💊 Adding medicine:', medicineData);
        
        const response = await fetch('../backend/api/inventory.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(medicineData)
        });
        
        const result = await response.json();
        console.log('📊 Add medicine response:', result);
        
        if (result.success) {
            showSuccessMessage('Medicine added successfully!');
            hideAddMedicineForm();
            // Reload inventory data
            await loadInventoryData();
            // Also refresh dashboard if we're on it
            if (currentSection === 'dashboard') {
                await loadDashboardData();
            }
        } else {
            throw new Error(result.message);
        }
        
    } catch (error) {
        console.error(' Error adding medicine:', error);
        showErrorMessage('Failed to add medicine: ' + error.message);
    }
}

// Edit medicine (NOW FULLY FUNCTIONAL!)
// Edit medicine - FIXED VERSION
// Edit medicine - UPDATED WITH ERROR HANDLING
async function editMedicine(id) {
    try {
        console.log('📝 Loading medicine for edit:', id);
        
        // First, get the medicine data
        const response = await fetch('../backend/api/inventory.php', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        const result = await response.json();
        console.log('📊 Inventory data received:', result);
        
        if (!result.success) {
            throw new Error(result.message);
        }
        
        // Find the medicine with the matching ID
        const medicine = result.data.medicines.find(m => m.id == id);
        if (!medicine) {
            throw new Error('Medicine not found');
        }
        
        console.log('💊 Medicine found:', medicine);
        
        // Helper function to safely set value
        function setElementValue(elementId, value) {
            const element = document.getElementById(elementId);
            if (element) {
                element.value = value || '';
                console.log(`✅ Set ${elementId}:`, value);
            } else {
                console.error(`❌ Element not found: ${elementId}`);
            }
        }
        
        // Populate the edit form with medicine data
        setElementValue('edit-medicine-id', medicine.id);
        setElementValue('edit-medicine-name', medicine.name);
        setElementValue('edit-generic-name', medicine.generic_name);
        setElementValue('edit-brand', medicine.brand);
        setElementValue('edit-category', medicine.category_name);
        setElementValue('edit-dosage', medicine.dosage);
        setElementValue('edit-price', medicine.unit_price);
        setElementValue('edit-stock', medicine.stock_quantity);
        setElementValue('edit-reorder-level', medicine.reorder_level);
        setElementValue('edit-batch-number', medicine.batch_number);
        setElementValue('edit-expiry-date', medicine.expiry_date);
        setElementValue('edit-supplier', medicine.supplier);
        
        // Hide add form and show edit form
        hideAddMedicineForm();
        showEditMedicineForm();
        
        console.log('✅ Edit form populated and displayed');
        console.log('🔍 Batch number set to:', medicine.batch_number);
        
    } catch (error) {
        console.error('❌ Error loading medicine for edit:', error);
        showErrorMessage('Failed to load medicine for editing: ' + error.message);
    }
}

// Show edit medicine form
function showEditMedicineForm() {
    const form = document.getElementById('edit-medicine-form');
    if (form) {
        form.classList.remove('hidden');
        document.getElementById('edit-medicine-name').focus();
    }
}

// Hide edit medicine form
function hideEditMedicineForm() {
    const form = document.getElementById('edit-medicine-form');
    if (form) {
        form.classList.add('hidden');
        document.getElementById('edit-medicine-form-element').reset();
    }
}

// Handle edit medicine form submission
async function handleEditMedicineFormSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    const medicineData = {
        id: parseInt(formData.get('id')),
        name: formData.get('name'),
        generic_name: formData.get('generic_name'),
        brand: formData.get('brand'),
        category: formData.get('category'),
        dosage: formData.get('dosage'),
        unit_price: parseFloat(formData.get('unit_price')),
        stock_quantity: parseInt(formData.get('stock_quantity')),
        reorder_level: parseInt(formData.get('reorder_level')) || 10,
        batch_number: formData.get('batch_number'),
        expiry_date: formData.get('expiry_date'),
        supplier: formData.get('supplier')
    };
    
    try {
        console.log('📝 Updating medicine:', medicineData);
        
        const response = await fetch('../backend/api/inventory.php', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(medicineData)
        });
        
        const result = await response.json();
        console.log('📊 Update medicine response:', result);
        
        if (result.success) {
            showSuccessMessage('Medicine updated successfully!');
            hideEditMedicineForm();
            // Reload inventory data
            await loadInventoryData();
            // Also refresh dashboard if we're on it
            if (currentSection === 'dashboard') {
                await loadDashboardData();
            }
        } else {
            throw new Error(result.message);
        }
        
    } catch (error) {
        console.error(' Error updating medicine:', error);
        showErrorMessage('Failed to update medicine: ' + error.message);
    }
}


// Delete medicine (with alerts context support)
async function deleteMedicine(id, fromAlerts = false) {
    if (!confirm('Are you sure you want to permanently delete this medicine? This will also delete all sales records for this medicine. This action cannot be undone.')) {
        return;
    }
    
    try {
        console.log('🗑️ Deleting medicine:', id);
        
        const response = await fetch('../backend/api/inventory.php', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id: id })
        });
        
        const result = await response.json();
        console.log('📊 Delete medicine response:', result);
        
        if (result.success) {
            showSuccessMessage(result.message || 'Medicine deleted successfully!');
            
            // If deleting from alerts page, refresh alerts data immediately
            if (fromAlerts || currentSection === 'alerts') {
                await loadAlertsData(); // Refresh the alerts table
            } else {
                // Otherwise reload inventory data
                await loadInventoryData();
            }
            
            // Also refresh dashboard if we're on it
            if (currentSection === 'dashboard') {
                await loadDashboardData();
            }
        } else {
            throw new Error(result.message);
        }
        
    } catch (error) {
        console.error('❌ Error deleting medicine:', error);
        showErrorMessage('Failed to delete medicine: ' + error.message);
    }
}

// Placeholder functions for other sections
// Load alerts data
async function loadAlertsData() {
    try {
        console.log('🚨 Loading alerts data...');
        
        // Use the current filter instead of always loading 'all'
        const response = await fetch(`../backend/api/alerts.php?filter=${currentAlertFilter}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        const result = await response.json();
        console.log('📊 Alerts API response:', result);
        
        if (!result.success) {
            throw new Error(result.message);
        }
        
        const data = result.data;
        
        // Update alerts summary cards
        updateAlertsSummary(data.summary);
        
        // Update alerts table
        updateAlertsTable(data.alerts);
        
        // Update filter buttons to show current state
        updateFilterButtons(currentAlertFilter);
        
        console.log('✅ Alerts data loaded successfully with filter:', currentAlertFilter);
        
    } catch (error) {
        console.error(' Error loading alerts data:', error);
        showErrorMessage('Failed to load alerts data: ' + error.message);
    }
}

async function loadCategoriesData() {
    console.log('📋 Loading categories data... (will be implemented next)');
}

async function loadMedicinesData() {
    console.log('💊 Loading medicines data... (will be implemented next)');
}

async function loadSalesData() {
    console.log('💰 Loading sales data... (will be implemented next)');
}

async function loadUsersData() {
    console.log('👥 Loading users data... (will be implemented next)');
}

// Logout function
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        console.log('🚪 Logging out...');
        
        fetch('../backend/auth/logout.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        })
        .then(response => response.json())
        .then(data => {
            console.log('✅ Logout response:', data);
            // Clear local storage
            localStorage.removeItem('user_data');
            
            // Redirect to login page
            window.location.href = 'index.html';
        })
        .catch(error => {
            console.error(' Logout error:', error);
            // Force redirect even if logout request fails
            localStorage.removeItem('user_data');
            window.location.href = 'index.html';
        });
    }
}

// Utility functions
function showErrorMessage(message) {
    alert('Error: ' + message);
    console.error('', message);
}

function showSuccessMessage(message) {
    alert('Success: ' + message);
    console.log('✅', message);
}

function formatCurrency(amount) {
    return '₱' + parseFloat(amount || 0).toFixed(2);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// Test function to check if dashboard is working
function testDashboard() {
    console.log('🧪 Testing dashboard...');
    console.log('Current user:', currentUser);
    console.log('Current section:', currentSection);
    alert('Dashboard is working! Check console for details.');
}

// Update alerts summary cards
function updateAlertsSummary(summary) {
    const elements = {
        'critical-alerts-count': summary.critical_alerts || 0,
        'low-stock-alerts-count': summary.low_stock_alerts || 0,
        'expiring-alerts-count': summary.expiring_alerts || 0,
        'total-alerts-count': summary.total_alerts || 0
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });
}



// Get alert row background color
function getAlertRowColor(alertType) {
    switch (alertType) {
        case 'expired': return '#fef2f2';
        case 'expiring': return '#fef3c7';
        case 'low-stock': return '#fef3c7';
        default: return 'transparent';
    }
}

// Get expiry date color based on days remaining
function getExpiryColor(daysToExpiry) {
    if (daysToExpiry < 0) return '#dc2626'; // Expired - red
    if (daysToExpiry <= 30) return '#ea580c'; // Critical - orange-red
    if (daysToExpiry <= 90) return '#d97706'; // Warning - orange
    return '#64748b'; // Normal - gray
}

// Get readable alert type text
function getAlertTypeText(alertType) {
    switch (alertType) {
        case 'expired': return 'Expired';
        case 'expiring': return 'Expiring Soon';
        case 'low-stock': return 'Low Stock';
        default: return alertType;
    }
}

// Filter alerts by type
async function filterAlerts(filterType) {
    try {
        console.log('🔍 Filtering alerts by:', filterType);
        
        // Update the current filter
        currentAlertFilter = filterType;
        
        // Update button states
        updateFilterButtons(filterType);
        
        // Fetch filtered data
        const response = await fetch(`../backend/api/alerts.php?filter=${filterType}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        const result = await response.json();
        console.log('📊 Filtered alerts response:', result);
        
        if (!result.success) {
            throw new Error(result.message);
        }
        
        // Update table with filtered data
        updateAlertsTable(result.data.alerts);
        
        console.log(`✅ Alerts filtered by ${filterType}`);
        
    } catch (error) {
        console.error(' Error filtering alerts:', error);
        showErrorMessage('Failed to filter alerts: ' + error.message);
    }
}


// Update filter button states
function updateFilterButtons(activeFilter) {
    // Remove active state from all buttons
    const filterButtons = [
        'all-alerts-btn',
        'critical-alerts-btn', 
        'lowstock-alerts-btn',
        'expiring-alerts-btn'
    ];
    
    filterButtons.forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.className = 'btn btn-secondary';
        }
    });
    
    // Add active state to selected button
    const activeButtonId = `${activeFilter}-alerts-btn`;
    const activeBtn = document.getElementById(activeButtonId);
    if (activeBtn) {
        activeBtn.className = 'btn';
        console.log('🎯 Activated filter button:', activeFilter);
    }
}

// Update alerts table with conditional buttons based on alert type
function updateAlertsTable(alerts) {
    const tableBody = document.getElementById('alerts-list');
    if (!tableBody) return;
    
    if (!alerts || alerts.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #64748b;">No alerts found</td></tr>';
        return;
    }
    
    tableBody.innerHTML = alerts.map(alert => {
        // Determine which buttons to show based on alert type
        let actionButtons = '';
        
        if (alert.alert_type === 'expired') {
            // Only show Delete button for expired medicines - pass true for fromAlerts
            actionButtons = `
                <button class="btn btn-small btn-danger" onclick="deleteMedicine(${alert.id}, true)" title="Delete expired medicine">
                    Delete
                </button>
            `;
        } else {
            // Show Edit and Reorder for non-expired medicines
            actionButtons = `
                <button class="btn btn-small" onclick="editMedicineFromAlert(${alert.id})" style="margin-right: 5px;" title="Edit Medicine">
                    Edit
                </button>
                <button class="btn btn-small btn-warning" onclick="showReorderModal(${alert.id})" title="Quick Reorder">
                    Reorder
                </button>
            `;
        }
        
        return `
            <tr class="alert-row-${alert.alert_type}">
                <td>
                    <strong>${escapeHtml(alert.name)}</strong>
                    ${alert.generic_name ? `<br><small style="color: #64748b;">${escapeHtml(alert.generic_name)}</small>` : ''}
                </td>
                <td>${escapeHtml(alert.brand || 'N/A')}</td>
                <td style="text-align: center;">
                    <span style="font-weight: bold; font-size: 16px; color: ${alert.stock_quantity <= alert.reorder_level ? '#dc2626' : '#059669'};">
                        ${alert.stock_quantity}
                    </span>
                </td>
                <td style="text-align: center;">
                    <span style="font-weight: 500;">
                        ${alert.reorder_level}
                    </span>
                </td>
                <td>
                    ${alert.expiry_date ? `
                        <span style="color: ${getExpiryColor(alert.days_to_expiry)}; ${alert.alert_type === 'expired' ? 'font-weight: bold;' : ''}">
                            ${formatDate(alert.expiry_date)}
                            ${alert.days_to_expiry !== null ? `<br><small>${alert.days_to_expiry >= 0 ? alert.days_to_expiry + ' days' : '<strong>EXPIRED</strong>'}</small>` : ''}
                        </span>
                    ` : 'N/A'}
                </td>
                <td>
                    <span class="status-badge alert-${alert.alert_type}">${getAlertTypeText(alert.alert_type)}</span>
                </td>
                <td>
                    <span class="priority-badge priority-${alert.priority.toLowerCase()}">${alert.priority}</span>
                </td>
                <td style="text-align: center; white-space: nowrap;">
                    ${actionButtons}
                </td>
            </tr>
        `;
    }).join('');
}

// Edit medicine from alerts (navigates to inventory with edit form)
async function editMedicineFromAlert(id) {
    try {
        console.log('Editing medicine from alerts:', id);
        
        // Switch to inventory section
        showSection('inventory');
        
        // Small delay to ensure section is loaded
        setTimeout(async () => {
            await editMedicine(id);
        }, 100);
        
    } catch (error) {
        console.error('Error editing medicine from alerts:', error);
        showErrorMessage('Failed to edit medicine: ' + error.message);
    }
}

// Show reorder modal
async function showReorderModal(id) {
    try {
        console.log('Loading medicine for reorder:', id);
        
        // Get the medicine data
        const response = await fetch('../backend/api/inventory.php', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message);
        }
        
        // Find the medicine
        const medicine = result.data.medicines.find(m => m.id == id);
        if (!medicine) {
            throw new Error('Medicine not found');
        }
        
        // Calculate suggested quantity (2x reorder level minus current stock)
        const suggestedQty = Math.max((medicine.reorder_level * 2) - medicine.stock_quantity, medicine.reorder_level);
        
        // Populate modal
        document.getElementById('reorder-medicine-id').value = medicine.id;
        document.getElementById('reorder-medicine-name').textContent = medicine.name;
        document.getElementById('reorder-current-stock').textContent = medicine.stock_quantity;
        document.getElementById('reorder-reorder-level').textContent = medicine.reorder_level;
        document.getElementById('reorder-suggested-qty').textContent = suggestedQty;
        document.getElementById('reorder-quantity').value = suggestedQty;
        document.getElementById('reorder-supplier').value = medicine.supplier || '';
        document.getElementById('reorder-notes').value = '';
        
        // Show modal
        const modal = document.getElementById('reorder-modal');
        if (modal) {
            modal.classList.remove('hidden');
        }
        
        console.log('Reorder modal displayed');
        
    } catch (error) {
        console.error('Error loading medicine for reorder:', error);
        showErrorMessage('Failed to load medicine for reorder: ' + error.message);
    }
}

// Hide reorder modal
function hideReorderModal() {
    const modal = document.getElementById('reorder-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
    document.getElementById('reorder-form').reset();
}



function hideReorderModal() {
    const modal = document.getElementById('reorder-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
    document.getElementById('reorder-form').reset();
}
//REORDER SUBMIT ON STOCK ALERTS
async function handleReorderFormSubmit(event) {
    event.preventDefault();
    
    const medicineId = parseInt(document.getElementById('reorder-medicine-id').value);
    const addQuantity = parseInt(document.getElementById('reorder-quantity').value);
    const currentStock = parseInt(document.getElementById('reorder-current-stock').textContent);
    const supplier = document.getElementById('reorder-supplier').value;
    
    if (!medicineId || !addQuantity || addQuantity <= 0) {
        showErrorMessage('Please enter a valid quantity');
        return;
    }
    
    const newStock = currentStock + addQuantity;
    
    try {
        console.log('Fetching medicine data for update...');
        
        // First, get the full medicine data
        const getResponse = await fetch('../backend/api/inventory.php', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        const getResult = await getResponse.json();
        
        if (!getResult.success) {
            throw new Error(getResult.message);
        }
        
        // Find the medicine
        const medicine = getResult.data.medicines.find(m => m.id == medicineId);
        if (!medicine) {
            throw new Error('Medicine not found');
        }
        
        console.log('Updating medicine stock...');
        
        // Now update with all required fields
        const updateData = {
            id: medicineId,
            name: medicine.name,
            generic_name: medicine.generic_name,
            brand: medicine.brand,
            category: medicine.category_name,
            dosage: medicine.dosage,
            unit_price: parseFloat(medicine.unit_price),
            stock_quantity: newStock,
            reorder_level: medicine.reorder_level,
            expiry_date: medicine.expiry_date,
            supplier: supplier || medicine.supplier
        };
        
        const response = await fetch('../backend/api/inventory.php', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccessMessage(`Stock updated! Added ${addQuantity} units. New stock: ${newStock}`);
            hideReorderModal();
            await loadAlertsData();
            await loadDashboardData();
        } else {
            throw new Error(result.message);
        }
        
    } catch (error) {
        console.error('Error:', error);
        showErrorMessage('Failed to update stock: ' + error.message);
    }
}


async function editMedicineFromAlert(id) {
    try {
        showSection('inventory');
        setTimeout(async () => {
            await editMedicine(id);
        }, 100);
    } catch (error) {
        console.error('Error:', error);
        showErrorMessage('Failed to edit medicine: ' + error.message);
    }
}

// Load sales data
async function loadSalesData() {
    try {
        console.log('💰 Loading sales data...');
        
        const response = await fetch('../backend/api/sales.php', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        const result = await response.json();
        console.log('📊 Sales API response:', result);
        
        if (!result.success) {
            throw new Error(result.message);
        }
        
        const data = result.data;
        
        // Update sales statistics cards
        updateSalesStatistics(data.statistics);
        
        // Update sales table
        updateSalesTable(data.sales);
        
        // Load medicines for sale form
        await loadMedicinesForSale();
        
        console.log('✅ Sales data loaded successfully');
        
    } catch (error) {
        console.error('❌ Error loading sales data:', error);
        showErrorMessage('Failed to load sales data: ' + error.message);
    }
}

// Update sales statistics cards with proper counts
// Update sales statistics cards - FIXED VERSION
// Update sales statistics cards - FINAL VERSION
function updateSalesStatistics(stats) {
    console.log('🔄 Updating sales statistics with:', stats);
    
    // Update using the card structure in your HTML
    const cardElements = document.querySelectorAll('#sales-section .dashboard-cards .card .number');
    
    if (cardElements.length >= 4) {
        // Today's Revenue
        cardElements[0].textContent = formatCurrency(stats.today.revenue || 0);
        // This Week's Revenue
        cardElements[1].textContent = formatCurrency(stats.week.revenue || 0);
        // This Month's Revenue
        cardElements[2].textContent = formatCurrency(stats.month.revenue || 0);
        // Today's Transactions
        cardElements[3].textContent = stats.today.transactions || 0;
        
        console.log('✅ Sales statistics updated:', {
            todayRevenue: formatCurrency(stats.today.revenue),
            todayTransactions: stats.today.transactions,
            weekRevenue: formatCurrency(stats.week.revenue),
            monthRevenue: formatCurrency(stats.month.revenue)
        });
    } else {
        console.error('❌ Could not find all sales statistic cards');
    }
}

// UPDATE SALES TABLE - ADD THIS FUNCTION
function updateSalesTable(sales) {
    const tableBody = document.getElementById('sales-list');
    if (!tableBody) return;
    
    if (!sales || sales.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #64748b;">No sales recorded</td></tr>';
        return;
    }
    
    // Use sequential numbering based on array position (reverse order for newest first)
    tableBody.innerHTML = sales.map((sale, index) => `
        <tr>
            <td><strong>#${sales.length - index}</strong></td>
            <td>${escapeHtml(sale.customer_name || 'Walk-in Customer')}</td>
            <td>${sale.items_count} item(s)</td>
            <td style="font-weight: bold; color: #10b981;">${formatCurrency(sale.total_amount)}</td>
            <td>${formatDate(sale.sale_date)}<br><small style="color: #64748b;">${sale.cashier_name}</small></td>
            <td>
                <button class="btn btn-small" onclick="viewSaleDetails(${sale.id})" style="margin-right: 5px;">View</button>
                <button class="btn btn-small btn-danger" onclick="deleteSale(${sale.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

// Show new sale form
function showNewSaleForm() {
    // ... rest of your existing code
}


// Show new sale form
function showNewSaleForm() {
    const form = document.getElementById('new-sale-form');
    if (form) {
        form.classList.remove('hidden');
        // Set today's date as default
        document.getElementById('sale-date').valueAsDate = new Date();
    }
}

// Hide new sale form
function hideNewSaleForm() {
    const form = document.getElementById('new-sale-form');
    if (form) {
        form.classList.add('hidden');
        document.getElementById('sale-form').reset();
        // Reset to single item with proper event handlers
        const saleItems = document.getElementById('sale-items');
        saleItems.innerHTML = `
            <h4>Sale Items</h4>
            <div class="sale-item">
                <div class="form-row">
                    <div class="form-group">
                        <label>Medicine</label>
                        <select class="medicine-select" required onchange="updateItemPrice(this)">
                            <option value="">Select medicine</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Quantity</label>
                        <input type="number" class="quantity-input" min="1" required onchange="updateItemTotal(this)">
                    </div>
                    <div class="form-group">
                        <label>Unit Price</label>
                        <input type="number" class="price-input" step="0.01" readonly>
                    </div>
                    <div class="form-group">
                        <label>Total</label>
                        <input type="number" class="total-input" step="0.01" readonly>
                    </div>
                </div>
            </div>
        `;
        // Reset total amount
        document.getElementById('sale-total-amount').textContent = '₱0.00';
        loadMedicinesForSale();
    }
}
// Load medicines for sale dropdowns
async function loadMedicinesForSale() {
    try {
        const response = await fetch('../backend/api/inventory.php');
        const result = await response.json();
        
        if (result.success) {
            const medicines = result.data.medicines.filter(m => m.stock_quantity > 0);
            const selects = document.querySelectorAll('.medicine-select');
            
            selects.forEach(select => {
                const currentValue = select.value;
                select.innerHTML = '<option value="">Select medicine</option>' +
                    medicines.map(m => `
                        <option value="${m.id}" data-price="${m.unit_price}" data-stock="${m.stock_quantity}">
                            ${m.name} - Stock: ${m.stock_quantity} - ₱${m.unit_price}
                        </option>
                    `).join('');
                if (currentValue) select.value = currentValue;
            });
        }
    } catch (error) {
        console.error('Error loading medicines:', error);
    }
}

// Update item price when medicine is selected
function updateItemPrice(selectElement) {
    const selectedOption = selectElement.options[selectElement.selectedIndex];
    const priceInput = selectElement.closest('.sale-item').querySelector('.price-input');
    const price = selectedOption.dataset.price || 0;
    priceInput.value = price;
    updateItemTotal(selectElement);
}

// Update item total when quantity changes
function updateItemTotal(element) {
    const saleItem = element.closest('.sale-item');
    const quantity = parseFloat(saleItem.querySelector('.quantity-input').value) || 0;
    const price = parseFloat(saleItem.querySelector('.price-input').value) || 0;
    const totalInput = saleItem.querySelector('.total-input');
    totalInput.value = (quantity * price).toFixed(2);
    updateSaleTotal();
}

// Update overall sale total
function updateSaleTotal() {
    const totalInputs = document.querySelectorAll('.total-input');
    let grandTotal = 0;
    totalInputs.forEach(input => {
        grandTotal += parseFloat(input.value) || 0;
    });
    document.getElementById('sale-total-amount').textContent = formatCurrency(grandTotal);
}

// Add sale item row
function addSaleItem() {
    const saleItems = document.getElementById('sale-items');
    const newItem = document.createElement('div');
    newItem.className = 'sale-item';
    newItem.innerHTML = `
        <div class="form-row">
            <div class="form-group">
                <label>Medicine</label>
                <select class="medicine-select" required onchange="updateItemPrice(this)">
                    <option value="">Select medicine</option>
                </select>
            </div>
            <div class="form-group">
                <label>Quantity</label>
                <input type="number" class="quantity-input" min="1" required onchange="updateItemTotal(this)">
            </div>
            <div class="form-group">
                <label>Unit Price</label>
                <input type="number" class="price-input" step="0.01" readonly>
            </div>
            <div class="form-group">
                <label>Total</label>
                <input type="number" class="total-input" step="0.01" readonly>
            </div>
        </div>
    `;
    saleItems.appendChild(newItem);
    loadMedicinesForSale();
}

// Remove last sale item
function removeSaleItem() {
    const saleItems = document.querySelectorAll('.sale-item');
    if (saleItems.length > 1) {
        saleItems[saleItems.length - 1].remove();
        updateSaleTotal();
    } else {
        alert('Cannot remove the last item');
    }
}

// Handle sale form submission
async function handleSaleFormSubmit(event) {
    event.preventDefault();
    
    const customerName = document.getElementById('customer-name').value;
    const saleDate = document.getElementById('sale-date').value;
    
    // Collect sale items
    const saleItems = [];
    const itemElements = document.querySelectorAll('.sale-item');
    
    for (let item of itemElements) {
        const medicineSelect = item.querySelector('.medicine-select');
        const quantity = parseInt(item.querySelector('.quantity-input').value);
        const unitPrice = parseFloat(item.querySelector('.price-input').value);
        
        if (!medicineSelect.value || !quantity || !unitPrice) {
            showErrorMessage('Please fill all item fields');
            return;
        }
        
        // Check stock
        const selectedOption = medicineSelect.options[medicineSelect.selectedIndex];
        const availableStock = parseInt(selectedOption.dataset.stock);
        
        if (quantity > availableStock) {
            showErrorMessage(`Insufficient stock for ${selectedOption.text.split(' - ')[0]}. Available: ${availableStock}`);
            return;
        }
        
        saleItems.push({
            medicine_id: parseInt(medicineSelect.value),
            quantity: quantity,
            unit_price: unitPrice
        });
    }
    
    if (saleItems.length === 0) {
        showErrorMessage('Please add at least one item');
        return;
    }
    
    try {
        const response = await fetch('../backend/api/sales.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                customer_name: customerName,
                sale_date: saleDate,
                items: saleItems
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccessMessage('Sale completed successfully!');
            hideNewSaleForm();
            await loadSalesData();
            await loadDashboardData();
        } else {
            throw new Error(result.message);
        }
        
    } catch (error) {
        console.error('Error creating sale:', error);
        showErrorMessage('Failed to create sale: ' + error.message);
    }
}

// View sale details (placeholder)
function viewSaleDetails(id) {
    console.log('View sale details:', id);
    alert('View sale details functionality will show receipt');
}

// Delete sale
// Enhanced delete sale function
async function deleteSale(id) {
    if (!confirm('Are you sure you want to delete this sale? The stock will be restored and this sale will be permanently removed.')) {
        return;
    }
    
    try {
        const response = await fetch('../backend/api/sales.php', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id: id })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccessMessage('Sale deleted successfully! Stock has been restored.');
            // Reload all relevant data
            await loadSalesData();
            await loadDashboardData();
            await loadInventoryData(); // Refresh inventory to show restored stock
        } else {
            throw new Error(result.message);
        }
        
    } catch (error) {
        console.error('Error deleting sale:', error);
        showErrorMessage('Failed to delete sale: ' + error.message);
    }
}

// Add profile data loading function
async function loadProfileData() {
    try {
        console.log('👤 Loading profile data...');
        
        // Update profile information with current user data
        if (currentUser) {
            document.getElementById('profile-fullname').textContent = currentUser.full_name || 'N/A';
            document.getElementById('profile-username').textContent = currentUser.username || 'N/A';
            document.getElementById('profile-email').textContent = currentUser.email || 'N/A';
            document.getElementById('profile-role').textContent = currentUser.role ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1) : 'N/A';
            document.getElementById('profile-lastlogin').textContent = currentUser.last_login ? formatDateTime(currentUser.last_login) : 'N/A';
            document.getElementById('profile-created').textContent = currentUser.created_at ? formatDate(currentUser.created_at) : 'N/A';
        }
        
        console.log('✅ Profile data loaded successfully');
        
    } catch (error) {
        console.error('❌ Error loading profile data:', error);
        showErrorMessage('Failed to load profile data: ' + error.message);
    }
}

// Placeholder functions for profile actions
function editProfile() {
    alert('Edit profile functionality will be implemented soon!');
}

function changePassword() {
    alert('Change password functionality will be implemented soon!');
}

// Debug function to check form values
function debugFormValues() {
    const batchInput = document.getElementById('edit-batch-number');
    console.log('🔍 Debug - Batch input value:', batchInput.value);
    console.log('🔍 Debug - Batch input element:', batchInput);
}

// MEDICINE LIST DASHBOARD


//MANAGE USER PAGE
// User Management Functions
async function loadUsersData() {
    try {
        console.log('👥 Loading users data...');
        
        const response = await fetch('../backend/api/users.php', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        const result = await response.json();
        console.log('📊 Users API response:', result);
        
        if (!result.success) {
            throw new Error(result.message);
        }
        
        // Update users table
        updateUsersTable(result.data);
        
        console.log('✅ Users data loaded successfully');
        
    } catch (error) {
        console.error('❌ Error loading users data:', error);
        showErrorMessage('Failed to load users data: ' + error.message);
    }
}

function updateUsersTable(users) {
    const tableBody = document.getElementById('users-list');
    if (!tableBody) return;
    
    if (!users || users.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #64748b;">No users found</td></tr>';
        return;
    }
    
    tableBody.innerHTML = users.map(user => `
        <tr>
            <td>
                <strong>${escapeHtml(user.full_name)}</strong>
            </td>
            <td>${escapeHtml(user.username)}</td>
            <td>${escapeHtml(user.email)}</td>
            <td>
                <span class="status-badge ${user.role === 'admin' ? 'status-admin' : 'status-pharmacist'}">
                    ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </span>
            </td>
            <td>
                ${user.last_login ? formatDateTime(user.last_login) : 'Never'}
            </td>
            <td>
                <button class="btn btn-small" onclick="editUser(${user.id})" style="margin-right: 5px;">Edit</button>
                <button class="btn btn-small btn-danger" onclick="deleteUser(${user.id})" 
                    ${user.id === currentUser.id ? 'disabled title="Cannot delete your own account"' : ''}>
                    Delete
                </button>
            </td>
        </tr>
    `).join('');
}

function showAddUserForm() {
    const form = document.getElementById('add-user-form');
    if (form) {
        form.classList.remove('hidden');
        document.getElementById('user-fullname').focus();
    }
}

function hideAddUserForm() {
    const form = document.getElementById('add-user-form');
    if (form) {
        form.classList.add('hidden');
        document.getElementById('user-form').reset();
    }
}

// Handle user form submission
async function handleUserFormSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    
    const userData = {
        full_name: document.getElementById('user-fullname').value,
        username: document.getElementById('user-username').value,
        email: document.getElementById('user-email').value,
        password: document.getElementById('user-password').value,
        role: document.getElementById('user-role').value
    };
    
    try {
        console.log('👤 Adding user:', { ...userData, password: '***' });
        
        const response = await fetch('../backend/api/users.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
        });
        
        const result = await response.json();
        console.log('📊 Add user response:', result);
        
        if (result.success) {
            showSuccessMessage('User added successfully!');
            hideAddUserForm();
            await loadUsersData();
        } else {
            throw new Error(result.message);
        }
        
    } catch (error) {
        console.error('❌ Error adding user:', error);
        showErrorMessage('Failed to add user: ' + error.message);
    }
}

// Edit user
async function editUser(id) {
    try {
        console.log('📝 Loading user for edit:', id);
        
        // First, get all users data to find the specific user
        const response = await fetch('../backend/api/users.php', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message);
        }
        
        // Find the user with the matching ID
        const user = result.data.find(u => u.id == id);
        if (!user) {
            throw new Error('User not found');
        }
        
        console.log('👤 User found:', user);
        
        // Populate the edit form with user data
        document.getElementById('edit-user-id').value = user.id;
        document.getElementById('edit-user-fullname').value = user.full_name;
        document.getElementById('edit-user-username').value = user.username;
        document.getElementById('edit-user-email').value = user.email;
        document.getElementById('edit-user-role').value = user.role;
        
        // Hide add form and show edit form
        hideAddUserForm();
        showEditUserForm();
        
        console.log('✅ Edit form populated and displayed');
        
    } catch (error) {
        console.error('❌ Error loading user for edit:', error);
        showErrorMessage('Failed to load user for editing: ' + error.message);
    }
}

function showEditUserForm() {
    const form = document.getElementById('edit-user-form');
    if (form) {
        form.classList.remove('hidden');
        document.getElementById('edit-user-fullname').focus();
    }
}

function hideEditUserForm() {
    const form = document.getElementById('edit-user-form');
    if (form) {
        form.classList.add('hidden');
        document.getElementById('edit-user-form-element').reset();
        // Reset password field visibility
        document.getElementById('edit-password-field').style.display = 'none';
        document.getElementById('edit-change-password').checked = false;
    }
}

// Handle edit user form submission
async function handleEditUserFormSubmit(event) {
    event.preventDefault();
    
    const userData = {
        id: parseInt(document.getElementById('edit-user-id').value),
        full_name: document.getElementById('edit-user-fullname').value,
        username: document.getElementById('edit-user-username').value,
        email: document.getElementById('edit-user-email').value,
        role: document.getElementById('edit-user-role').value,
        change_password: document.getElementById('edit-change-password').checked,
        new_password: document.getElementById('edit-user-password').value
    };
    
    try {
        console.log('📝 Updating user:', { ...userData, new_password: userData.change_password ? '***' : 'unchanged' });
        
        const response = await fetch('../backend/api/users.php', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
        });
        
        const result = await response.json();
        console.log('📊 Update user response:', result);
        
        if (result.success) {
            showSuccessMessage('User updated successfully!');
            hideEditUserForm();
            await loadUsersData();
        } else {
            throw new Error(result.message);
        }
        
    } catch (error) {
        console.error('❌ Error updating user:', error);
        showErrorMessage('Failed to update user: ' + error.message);
    }
}

// Delete user
async function deleteUser(id) {
    if (id === currentUser.id) {
        showErrorMessage('You cannot delete your own account.');
        return;
    }
    
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        return;
    }
    
    try {
        console.log('🗑️ Deleting user:', id);
        
        const response = await fetch('../backend/api/users.php', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id: id })
        });
        
        const result = await response.json();
        console.log('📊 Delete user response:', result);
        
        if (result.success) {
            showSuccessMessage('User deleted successfully!');
            await loadUsersData();
        } else {
            throw new Error(result.message);
        }
        
    } catch (error) {
        console.error('❌ Error deleting user:', error);
        showErrorMessage('Failed to delete user: ' + error.message);
    }
}
// Toggle password visibility
function togglePassword(passwordFieldId, toggleButtonId) {
    const passwordField = document.getElementById(passwordFieldId);
    const toggleButton = passwordField.nextElementSibling;
    
    if (passwordField.type === 'password') {
        passwordField.type = 'text';
        toggleButton.innerHTML = '︶';
    } else {
        passwordField.type = 'password';
        toggleButton.innerHTML = '👁';
    }
}