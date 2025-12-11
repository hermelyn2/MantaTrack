// Global state
let currentUser = null;
let isAuthenticated = false;

// Custom Notification System
function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    if (!container) return;

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;

    // Icon based on type
    const icons = {
        success: '<i class="fas fa-check-circle"></i>',
        error: '<i class="fas fa-exclamation-circle"></i>',
        warning: '<i class="fas fa-exclamation-triangle"></i>',
        info: '<i class="fas fa-info-circle"></i>'
    };

    notification.innerHTML = `
        <span class="notification-icon">${icons[type] || icons.info}</span>
        <span class="notification-message">${message}</span>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    container.appendChild(notification);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        notification.classList.add('slide-out');
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// Custom Validation Tooltip Functions
function showValidationTooltip(inputElement, message) {
    // Remove any existing tooltip for this input
    hideValidationTooltip(inputElement);

    // Add error styling to input
    inputElement.classList.add('has-error');

    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.className = 'validation-tooltip';
    tooltip.textContent = message;
    tooltip.setAttribute('data-tooltip-for', inputElement.id || inputElement.name);

    // Get the parent form-group
    const formGroup = inputElement.closest('.form-group') || inputElement.parentElement;

    // Make sure parent has relative positioning
    if (formGroup) {
        formGroup.style.position = 'relative';
        formGroup.appendChild(tooltip);
    } else {
        // Fallback: append to input's parent
        inputElement.parentElement.style.position = 'relative';
        inputElement.parentElement.appendChild(tooltip);
    }

    // Auto-hide on input
    const hideOnInput = () => {
        hideValidationTooltip(inputElement);
        inputElement.removeEventListener('input', hideOnInput);
        inputElement.removeEventListener('change', hideOnInput);
    };

    inputElement.addEventListener('input', hideOnInput);
    inputElement.addEventListener('change', hideOnInput);
}

function hideValidationTooltip(inputElement) {
    // Remove error styling
    inputElement.classList.remove('has-error');

    // Find and remove tooltip
    const formGroup = inputElement.closest('.form-group') || inputElement.parentElement;
    if (formGroup) {
        const tooltip = formGroup.querySelector('.validation-tooltip');
        if (tooltip) {
            tooltip.remove();
        }
    }
}

function clearAllTooltips() {
    // Remove all tooltips
    document.querySelectorAll('.validation-tooltip').forEach(tooltip => tooltip.remove());

    // Remove all error styling
    document.querySelectorAll('.has-error').forEach(input => input.classList.remove('has-error'));
}

// Validation helper functions
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validateRequired(value) {
    return value !== null && value !== undefined && value.trim() !== '';
}

// Page navigation
function showPage(pageId, updateHash = true) {
    // Clear any validation tooltips when changing pages
    clearAllTooltips();

    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // Show selected page
    document.getElementById(pageId).classList.add('active');

    // Update URL hash for page persistence on reload
    if (updateHash) {
        window.location.hash = pageId;
    }

    // Update navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });

    // Update body class for landing page (removes footer margin)
    if (pageId === 'landing') {
        document.body.classList.add('landing-active');
    } else {
        document.body.classList.remove('landing-active');
    }

    // Update active nav link
    if (pageId === 'landing') {
        // No nav link highlighted for landing page
    } else if (pageId === 'price-board') {
        document.querySelector('a[href="#price-board"]').classList.add('active');
    } else if (pageId === 'dashboard') {
        const dashboardLink = document.querySelector('a[href="#dashboard"]');
        if (dashboardLink) {
            dashboardLink.classList.add('active');
        }
        // Load dashboard data when viewing dashboard
        loadDashboard();
    }
}

// Authentication functions
function handleLogin(event) {
    event.preventDefault();

    // Clear previous tooltips
    clearAllTooltips();

    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    let hasError = false;

    // Validate email
    if (!validateRequired(email)) {
        showValidationTooltip(emailInput, 'Please fill out this field.');
        hasError = true;
    } else if (!validateEmail(email)) {
        showValidationTooltip(emailInput, 'Please enter a valid email address.');
        hasError = true;
    }

    // Validate password
    if (!validateRequired(password)) {
        showValidationTooltip(passwordInput, 'Please fill out this field.');
        hasError = true;
    }

    if (hasError) {
        return;
    }

    // Send login request to API
    fetch('api/login.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email: email,
            password: password
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Login successful
            currentUser = {
                id: data.commissioner.id,
                name: data.commissioner.name,
                email: data.commissioner.email
            };
            isAuthenticated = true;

            // Store user session
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            localStorage.setItem('isAuthenticated', 'true');

            // Update UI
            updateAuthUI();

            // Redirect to dashboard
            showPage('dashboard');

            // Clear form
            document.getElementById('login-email').value = '';
            document.getElementById('login-password').value = '';

            showNotification('Welcome back, ' + currentUser.name + '!', 'success');
        } else {
            showNotification(data.message || 'Invalid email or password.', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('An error occurred. Please try again.', 'error');
    });
}

function handleSignup(event) {
    event.preventDefault();

    // Clear previous tooltips and errors
    clearAllTooltips();

    const nameInput = document.getElementById('signup-name');
    const emailInput = document.getElementById('signup-email');
    const passwordInput = document.getElementById('signup-password');
    const confirmPasswordInput = document.getElementById('signup-confirm-password');

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    const errorEl = document.getElementById('confirm-password-error');

    // Clear previous inline errors
    errorEl.classList.remove('show');
    errorEl.textContent = '';
    confirmPasswordInput.classList.remove('error');

    let hasError = false;

    // Validate name
    if (!validateRequired(name)) {
        showValidationTooltip(nameInput, 'Please fill out this field.');
        hasError = true;
    }

    // Validate email
    if (!validateRequired(email)) {
        showValidationTooltip(emailInput, 'Please fill out this field.');
        hasError = true;
    } else if (!validateEmail(email)) {
        showValidationTooltip(emailInput, 'Please enter a valid email address.');
        hasError = true;
    }

    // Validate password
    if (!validateRequired(password)) {
        showValidationTooltip(passwordInput, 'Please fill out this field.');
        hasError = true;
    } else if (password.length < 6) {
        showValidationTooltip(passwordInput, 'Password must be at least 6 characters long.');
        hasError = true;
    }

    // Validate confirm password
    if (!validateRequired(confirmPassword)) {
        showValidationTooltip(confirmPasswordInput, 'Please fill out this field.');
        hasError = true;
    } else if (password !== confirmPassword) {
        showValidationTooltip(confirmPasswordInput, 'Passwords do not match.');
        hasError = true;
    }

    if (hasError) {
        return;
    }

    // Send signup request to API
    fetch('api/signup.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: name,
            email: email,
            password: password
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Account created successfully
            currentUser = {
                id: data.commissioner_id,
                name: data.name,
                email: data.email
            };
            isAuthenticated = true;

            // Store user session
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            localStorage.setItem('isAuthenticated', 'true');

            // Update UI
            updateAuthUI();

            // Redirect to dashboard
            showPage('dashboard');

            // Clear form
            document.getElementById('signup-name').value = '';
            document.getElementById('signup-email').value = '';
            document.getElementById('signup-password').value = '';
            document.getElementById('signup-confirm-password').value = '';

            showNotification('Account created successfully!', 'success');
        } else {
            // Handle error - check if account already exists
            if (data.message && data.message.includes('already registered')) {
                showNotification('Account already exists. Please log in.', 'warning');
                setTimeout(() => showPage('login'), 2000);
            } else {
                showNotification(data.message || 'Error creating account. Please try again.', 'error');
            }
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('An error occurred. Please try again.', 'error');
    });
}

function logout() {
    currentUser = null;
    isAuthenticated = false;

    // Clear user session from localStorage
    localStorage.removeItem('currentUser');
    localStorage.removeItem('isAuthenticated');

    // Update UI
    updateAuthUI();

    // Redirect to price board
    showPage('price-board');

    showNotification('Logged out successfully.', 'info');
}

function updateAuthUI() {
    const loginLink = document.getElementById('login-link');
    const signupLink = document.getElementById('signup-link');
    const userInfo = document.getElementById('user-info');
    const userName = document.getElementById('user-name');
    const dashboardUserName = document.getElementById('dashboard-user-name');
    
    if (isAuthenticated && currentUser) {
        // Hide login/signup links
        loginLink.style.display = 'none';
        signupLink.style.display = 'none';
        
        // Show user info
        userInfo.style.display = 'flex';
        userName.textContent = currentUser.name;
        dashboardUserName.textContent = currentUser.name;
        
        // Add dashboard link
        if (!document.querySelector('a[href="#dashboard"]')) {
            const dashboardLink = document.createElement('a');
            dashboardLink.href = '#dashboard';
            dashboardLink.className = 'nav-link';
            dashboardLink.innerHTML = '<i class="fas fa-chart-bar"></i> Dashboard';
            dashboardLink.onclick = () => showPage('dashboard');
            
            const navLinks = document.querySelector('.nav-links');
            navLinks.insertBefore(dashboardLink, userInfo);
        }
    } else {
        // Show login/signup links
        loginLink.style.display = 'flex';
        signupLink.style.display = 'flex';
        
        // Hide user info
        userInfo.style.display = 'none';
        
        // Remove dashboard link
        const dashboardLink = document.querySelector('a[href="#dashboard"]');
        if (dashboardLink) {
            dashboardLink.remove();
        }
    }
}

// Modal functions
function openModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
}

function closeModal(modalId) {
    // Clear tooltips when closing modal
    clearAllTooltips();
    document.getElementById(modalId).style.display = 'none';
}

function openAddModal() {
    if (!isAuthenticated) {
        showNotification('Please login to add price entries.', 'warning');
        showPage('login');
        return;
    }

    // Clear any previous tooltips
    clearAllTooltips();

    currentEditingId = null; // Reset editing ID
    originalEditingVegetable = null;
    originalEditingStatus = null;
    document.getElementById('modal-title').textContent = 'Add New Price Entry';
    entryVegetableDropdown.clear();
    entryVegetableDropdown.input.disabled = false; // Enable dropdown for add mode
    document.getElementById('entry-price').value = '';
    document.getElementById('entry-unit').value = 'kg';
    document.getElementById('entry-quantity').value = '';
    document.getElementById('entry-status').value = 'Good Quality';
    document.getElementById('entry-notes').value = '';
    document.getElementById('save-entry-btn').innerHTML = '<i class="fas fa-save"></i> Save';

    openModal('add-edit-modal');
}

function openEditModal(entryId, entry) {
    if (!isAuthenticated) {
        showNotification('Please login to edit price entries.', 'warning');
        showPage('login');
        return;
    }

    // Clear any previous tooltips
    clearAllTooltips();

    currentEditingId = entryId;
    originalEditingVegetable = entry.vegetableName;
    originalEditingStatus = entry.status || 'Good Quality';
    document.getElementById('modal-title').textContent = 'Edit Price Entry';
    entryVegetableDropdown.setValue(entry.vegetableName);
    entryVegetableDropdown.input.disabled = true; // Disable dropdown in edit mode
    document.getElementById('entry-price').value = entry.price;
    document.getElementById('entry-unit').value = entry.unit;
    document.getElementById('entry-quantity').value = entry.quantity || '';
    document.getElementById('entry-status').value = entry.status || 'Good Quality';
    document.getElementById('entry-notes').value = entry.notes || '';
    document.getElementById('save-entry-btn').innerHTML = '<i class="fas fa-edit"></i> Update';

    openModal('add-edit-modal');
}

function openBulkUpdateModal() {
    if (!isAuthenticated) {
        showNotification('Please login to update prices.', 'warning');
        showPage('login');
        return;
    }

    openModal('bulk-update-modal');
}

// Global variable to track current editing entry ID
let currentEditingId = null;
let originalEditingVegetable = null;
let originalEditingStatus = null;

// Global variable to track pending delete item ID
let pendingDeleteId = null;

async function handleSaveEntry(event) {
    if (event) event.preventDefault();

    if (!isAuthenticated || !currentUser) {
        showNotification('Please login to save entries.', 'warning');
        return;
    }

    // Clear previous tooltips
    clearAllTooltips();

    const vegetable = entryVegetableDropdown.getValue();
    const vegetableInput = entryVegetableDropdown.input;
    const priceInput = document.getElementById('entry-price');
    const unitInput = document.getElementById('entry-unit');
    const quantityInput = document.getElementById('entry-quantity');
    const statusInput = document.getElementById('entry-status');
    const notesInput = document.getElementById('entry-notes');

    const price = priceInput.value;
    const unit = unitInput.value;
    const quantity = quantityInput.value || 0;
    const status = statusInput.value;
    const notes = notesInput.value || '';

    let hasError = false;

    // Validate vegetable
    if (!vegetable || vegetable === '') {
        showValidationTooltip(vegetableInput, 'Please select a vegetable.');
        hasError = true;
    }

    // Validate price
    if (!validateRequired(price)) {
        showValidationTooltip(priceInput, 'Please fill out this field.');
        hasError = true;
    } else if (parseFloat(price) <= 0) {
        showValidationTooltip(priceInput, 'Price must be greater than 0.');
        hasError = true;
    }

    // Validate unit
    if (!unit || unit === '') {
        showValidationTooltip(unitInput, 'Please select a unit.');
        hasError = true;
    }

    // Validate status
    if (!status || status === '') {
        showValidationTooltip(statusInput, 'Please select a status.');
        hasError = true;
    }

    if (hasError) {
        return;
    }

    // Check for duplicate vegetable + status combination (for both add and edit)
    try {
        const response = await fetch(`api/read.php?commissioner_id=${currentUser.id}`);
        const data = await response.json();

        if (data.success && data.entries) {
            // Only check for duplicates if vegetable or status changed during edit
            let shouldCheckDuplicates = true;

            if (currentEditingId) {
                // We're editing - only validate if vegetable or status changed
                console.log('=== Duplicate Check Debug ===');
                console.log('Current vegetable:', vegetable);
                console.log('Original vegetable:', originalEditingVegetable);
                console.log('Current status:', status);
                console.log('Original status:', originalEditingStatus);
                console.log('Vegetable match:', vegetable === originalEditingVegetable);
                console.log('Status match:', status === originalEditingStatus);

                if (vegetable.trim().toLowerCase() === originalEditingVegetable?.trim().toLowerCase() &&
                    status.trim().toLowerCase() === originalEditingStatus?.trim().toLowerCase()) {
                    // Values didn't change, skip duplicate check entirely
                    console.log('SKIPPING duplicate check - values unchanged');
                    shouldCheckDuplicates = false;
                } else {
                    console.log('RUNNING duplicate check - values changed');
                }
            }

            if (shouldCheckDuplicates) {
                // Check if vegetable + status combination already exists
                const duplicate = data.entries.find(entry => {
                    // Skip the current entry when editing
                    if (currentEditingId && String(entry.id) === String(currentEditingId)) {
                        return false;
                    }

                    // Check for actual duplicates
                    return entry.vegetableName.toLowerCase().trim() === vegetable.toLowerCase().trim() &&
                           entry.status === status;
                });

                if (duplicate) {
                    showValidationTooltip(
                        vegetableInput,
                        `${vegetable} with ${status} already exists. Use a different status or edit the existing entry.`
                    );
                    return; // Stop the save
                }
            }
        }
    } catch (error) {
        console.error('Error checking for duplicates:', error);
        // Continue with save even if duplicate check fails
    }

    const endpoint = currentEditingId ? 'api/update.php' : 'api/create.php';
    const payload = {
        vegetable: vegetable,
        price: parseFloat(price),
        unit: unit,
        quantity: parseInt(quantity),
        status: status,
        notes: notes,
        commissioner_id: currentUser.id
    };

    if (currentEditingId) {
        payload.id = currentEditingId;
    }

    fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification(data.message, 'success');
            closeModal('add-edit-modal');
            loadDashboard(); // Reload dashboard data
            currentEditingId = null;
            originalEditingVegetable = null;
            originalEditingStatus = null;
        } else {
            showNotification(data.message || 'Error saving entry.', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('An error occurred. Please try again.', 'error');
    });
}

function handleBulkUpdate() {
    if (!isAuthenticated || !currentUser) {
        showNotification('Please login to update prices.', 'warning');
        return;
    }

    // Collect all updated prices and statuses from the bulk update modal
    const updates = [];
    const rows = document.querySelectorAll('#bulk-update-modal tbody tr');

    rows.forEach(row => {
        const id = row.dataset.itemId;
        const originalPrice = parseFloat(row.dataset.originalPrice);
        const originalStatus = row.dataset.originalStatus;
        const newPriceInput = row.querySelector('input[type="number"]');
        const newPrice = parseFloat(newPriceInput.value);
        const statusSelect = row.querySelector('select');
        const newStatus = statusSelect.value;

        // Check if either price or status has changed
        const priceChanged = newPrice !== originalPrice;
        const statusChanged = newStatus !== originalStatus;

        if (id && (priceChanged || statusChanged)) {
            updates.push({
                id: parseInt(id),
                price: newPrice,
                status: newStatus
            });
        }
    });

    if (updates.length === 0) {
        showNotification('No changes detected.', 'warning');
        return;
    }

    fetch('api/bulk_update.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            updates: updates
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification(data.message, 'success');
            closeModal('bulk-update-modal');
            loadDashboard(); // Reload dashboard data
        } else {
            // Show error message with details
            let errorMessage = data.message || 'Error updating prices.';

            // If there are specific errors, show them
            if (data.errors && data.errors.length > 0) {
                errorMessage += '\n\nDetails:\n' + data.errors.join('\n');

                // If some updates succeeded, mention that
                if (data.updatedCount && data.updatedCount > 0) {
                    showNotification(`${data.updatedCount} item(s) updated. Some updates failed: ${data.errors.join(', ')}`, 'warning');
                    closeModal('bulk-update-modal');
                    loadDashboard(); // Reload to show successful updates
                } else {
                    showNotification(data.errors.join(', '), 'error');
                }
            } else {
                showNotification(errorMessage, 'error');
            }
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('An error occurred. Please try again.', 'error');
    });
}

// Show confirmation modal for delete action
function showConfirmationModal(itemId, message = 'Are you sure you want to delete this item?') {
    pendingDeleteId = itemId;
    document.getElementById('confirmation-message').textContent = message;
    openModal('confirmation-modal');
}

// Confirm and execute delete action
function confirmDelete() {
    if (!pendingDeleteId) {
        closeModal('confirmation-modal');
        return;
    }

    const itemId = pendingDeleteId;
    pendingDeleteId = null;
    closeModal('confirmation-modal');

    // Execute the delete
    fetch('api/delete.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            id: itemId,
            commissioner_id: currentUser.id
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification(data.message, 'success');
            loadDashboard(); // Reload dashboard data
        } else {
            showNotification(data.message || 'Error deleting item.', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('An error occurred. Please try again.', 'error');
    });
}

// Handle delete button click - show confirmation modal
function handleDelete(itemId) {
    if (!isAuthenticated || !currentUser) {
        showNotification('Please login to delete entries.', 'warning');
        return;
    }

    // Show confirmation modal instead of browser confirm
    showConfirmationModal(itemId, 'Are you sure you want to delete this item?');
}

// Vegetable list - alphabetically sorted
const VEGETABLES = [
    'Alugbati',
    'Baguio beans',
    'Bell Pepper',
    'Bitter gourd (Ampalaya)',
    'Bok Choy',
    'Bottle gourd (Upo)',
    'Brocolli',
    'Cabbage',
    'Carrot',
    'Cassava',
    'Cauliflower',
    'Cayenne pepper (Labuyo)',
    'Chili Pepper (Siling Kulikot)',
    'Cucumber',
    'Eggplant',
    'Ginger',
    'Kangkong',
    'Lettuce',
    'Okra',
    'Onion',
    'Pechay',
    'Potato',
    'Raddish',
    'Sayote',
    'Sponge gourd (Patola)',
    'Spring Onion',
    'Squash',
    'String beans',
    'Sweet Potato',
    'Taro',
    'Tomato',
    'Yam (Ube)'
];

// Searchable Dropdown Component
class SearchableDropdown {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Container ${containerId} not found`);
            return;
        }

        this.options = {
            items: options.items || [],
            placeholder: options.placeholder || 'Select an option',
            allowCustom: options.allowCustom !== undefined ? options.allowCustom : false,
            onSelect: options.onSelect || (() => {}),
            initialValue: options.initialValue || ''
        };

        this.selectedValue = this.options.initialValue;
        this.isOpen = false;
        this.filteredItems = [...this.options.items];
        this.highlightedIndex = -1;

        this.init();
    }

    init() {
        this.render();
        this.attachEventListeners();
    }

    render() {
        this.container.innerHTML = `
            <div class="searchable-dropdown">
                <div class="searchable-dropdown-input-wrapper">
                    <input
                        type="text"
                        class="searchable-dropdown-input form-select"
                        placeholder="${this.options.placeholder}"
                        value="${this.selectedValue}"
                        autocomplete="off"
                    />
                    <i class="fas fa-chevron-down searchable-dropdown-icon"></i>
                </div>
                <div class="searchable-dropdown-menu" style="display: none;">
                    <ul class="searchable-dropdown-list"></ul>
                </div>
            </div>
        `;

        this.input = this.container.querySelector('.searchable-dropdown-input');
        this.menu = this.container.querySelector('.searchable-dropdown-menu');
        this.list = this.container.querySelector('.searchable-dropdown-list');
        this.icon = this.container.querySelector('.searchable-dropdown-icon');
    }

    attachEventListeners() {
        // Input focus - open dropdown
        this.input.addEventListener('focus', () => {
            this.openDropdown();
        });

        // Input typing - filter items
        this.input.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            this.filterItems(searchTerm);
            this.openDropdown();
        });

        // Input keydown - navigation
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.highlightNext();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.highlightPrevious();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (this.highlightedIndex >= 0 && this.highlightedIndex < this.filteredItems.length) {
                    this.selectItem(this.filteredItems[this.highlightedIndex]);
                } else if (this.options.allowCustom && this.input.value.trim()) {
                    this.selectItem(this.input.value.trim());
                }
            } else if (e.key === 'Escape') {
                this.closeDropdown();
            }
        });

        // Click outside to close
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target)) {
                this.closeDropdown();
            }
        });

        // Icon click - toggle dropdown
        this.icon.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.isOpen) {
                this.closeDropdown();
            } else {
                this.input.focus();
            }
        });
    }

    filterItems(searchTerm) {
        if (!searchTerm) {
            this.filteredItems = [...this.options.items];
        } else {
            this.filteredItems = this.options.items.filter(item =>
                item.toLowerCase().includes(searchTerm)
            );
        }
        this.highlightedIndex = -1;
        this.renderList();
    }

    renderList() {
        this.list.innerHTML = '';

        if (this.filteredItems.length === 0) {
            const noResults = document.createElement('li');
            noResults.className = 'searchable-dropdown-item no-results';
            noResults.textContent = this.options.allowCustom
                ? 'Press Enter to add custom vegetable'
                : 'No results found';
            this.list.appendChild(noResults);
            return;
        }

        this.filteredItems.forEach((item, index) => {
            const li = document.createElement('li');
            li.className = 'searchable-dropdown-item';
            li.textContent = item;

            if (index === this.highlightedIndex) {
                li.classList.add('highlighted');
            }

            li.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectItem(item);
            });

            this.list.appendChild(li);
        });
    }

    openDropdown() {
        this.isOpen = true;
        this.menu.style.display = 'block';
        this.icon.style.transform = 'rotate(180deg)';
        this.filterItems(this.input.value.toLowerCase());
    }

    closeDropdown() {
        this.isOpen = false;
        this.menu.style.display = 'none';
        this.icon.style.transform = 'rotate(0deg)';
        this.highlightedIndex = -1;
    }

    highlightNext() {
        if (this.filteredItems.length === 0) return;
        this.highlightedIndex = Math.min(this.highlightedIndex + 1, this.filteredItems.length - 1);
        this.renderList();
        this.scrollToHighlighted();
    }

    highlightPrevious() {
        if (this.filteredItems.length === 0) return;
        this.highlightedIndex = Math.max(this.highlightedIndex - 1, 0);
        this.renderList();
        this.scrollToHighlighted();
    }

    scrollToHighlighted() {
        const highlightedItem = this.list.querySelector('.highlighted');
        if (highlightedItem) {
            highlightedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }

    selectItem(value) {
        this.selectedValue = value;
        this.input.value = value;
        this.closeDropdown();
        this.options.onSelect(value);

        // Trigger change event for validation
        const event = new Event('change', { bubbles: true });
        this.input.dispatchEvent(event);
    }

    getValue() {
        return this.input.value.trim();
    }

    setValue(value) {
        this.selectedValue = value;
        this.input.value = value;
    }

    clear() {
        this.selectedValue = '';
        this.input.value = '';
    }
}

function loadDashboard() {
    if (!isAuthenticated || !currentUser) {
        return;
    }

    fetch(`api/read.php?commissioner_id=${currentUser.id}`)
        .then(response => response.json())
        .then(data => {
            console.log('Dashboard data loaded:', data);
            if (data.success) {
                // Update statistics
                const stats = data.statistics;
                document.querySelector('.stat-card:nth-child(1) .stat-number').textContent = stats.totalVegetables;
                document.querySelector('.stat-card:nth-child(2) .stat-number').textContent = `₱${stats.averagePrice.toFixed(2)}`;
                document.querySelector('.stat-card:nth-child(3) .stat-number').textContent = stats.staleCount;
                document.querySelector('.stat-card:nth-child(4) .stat-number').textContent = stats.lastUpdate;

                // Update dashboard entries header info
                try {
                    const entriesInfoEl = document.getElementById('dashboard-entries-info');
                    if (entriesInfoEl) {
                        // Find the most recent update timestamp from entries
                        let mostRecentUpdate = 'No updates yet';
                        if (data.entries && data.entries.length > 0) {
                            // Get the first entry's timestamp (entries are sorted by last_updated DESC)
                            mostRecentUpdate = data.entries[0].updatedAt || 'Unknown';
                        }

                        const count = stats.totalVegetables || 0;
                        const entriesText = count === 1 ? 'entry' : 'entries';
                        entriesInfoEl.textContent = `${count} ${entriesText} • Last updated: ${mostRecentUpdate}`;
                    } else {
                        console.error('dashboard-entries-info element not found');
                    }
                } catch (error) {
                    console.error('Error updating dashboard header:', error);
                }

                // Update dashboard table
                const tbody = document.querySelector('#dashboard tbody');
                tbody.innerHTML = '';

                data.entries.forEach(entry => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td class="font-medium">${entry.vegetableName}</td>
                        <td class="font-semibold text-green-600">₱${entry.price.toFixed(2)}</td>
                        <td class="text-gray-600">${entry.unit}</td>
                        <td class="text-gray-600">${entry.quantity}</td>
                        <td class="text-gray-600">${entry.updatedAt}</td>
                        <td><span class="badge badge-${entry.status === 'Good Quality' ? 'success' : 'warning'}">${entry.status}</span></td>
                        <td class="text-gray-600">${entry.notes || '-'}</td>
                        <td>
                            <button onclick='openEditModal(${entry.id}, ${JSON.stringify(entry)})' class="btn btn-outline btn-sm">
                                <i class="fas fa-edit"></i>
                                Edit
                            </button>
                            <button onclick="handleDelete(${entry.id})" class="btn btn-outline btn-sm" style="margin-left: 4px;">
                                <i class="fas fa-trash"></i>
                                Delete
                            </button>
                        </td>
                    `;
                    tbody.appendChild(row);
                });

                // Update bulk update modal
                updateBulkUpdateModal(data.entries);
            } else {
                console.error('Error loading dashboard:', data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

function updateBulkUpdateModal(entries) {
    const tbody = document.querySelector('#bulk-update-modal tbody');
    tbody.innerHTML = '';

    entries.forEach(entry => {
        const row = document.createElement('tr');
        row.dataset.itemId = entry.id;
        row.dataset.originalPrice = entry.price;
        row.dataset.originalStatus = entry.status;

        row.innerHTML = `
            <td class="font-medium">${entry.vegetableName}</td>
            <td style="color: #1a5c38; font-weight: 600;">₱${entry.price.toFixed(2)}</td>
            <td>
                <div class="relative">
                    <span class="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" style="font-size: 0.875rem;">₱</span>
                    <input type="number" step="0.01" min="0" class="form-input pl-8" value="${entry.price.toFixed(2)}">
                </div>
            </td>
            <td style="color: #1a5c38; font-weight: 500;">${entry.unit}</td>
            <td>
                <select class="form-select" style="font-size: 0.875rem; padding: 0.375rem 0.75rem;">
                    <option value="Good Quality" ${entry.status === 'Good Quality' ? 'selected' : ''}>Good Quality</option>
                    <option value="Low Quality" ${entry.status === 'Low Quality' ? 'selected' : ''}>Low Quality</option>
                </select>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Global array to store all price entries
let allPriceEntries = [];
// Global variable to store current search term
let currentSearchTerm = '';
// Global variable to store commissioner's total entry count
let commissionerTotalCount = 0;

// Load price board data from API
function loadPriceBoard() {
    fetch('api/read_all.php')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                allPriceEntries = data.entries;

                // If user is logged in, fetch their total entry count
                if (isAuthenticated && currentUser) {
                    fetch(`api/read.php?commissioner_id=${currentUser.id}`)
                        .then(response => response.json())
                        .then(commissionerData => {
                            if (commissionerData.success && commissionerData.statistics) {
                                commissionerTotalCount = commissionerData.statistics.totalVegetables || 0;
                            } else {
                                commissionerTotalCount = allPriceEntries.length;
                            }
                            updatePriceTable(allPriceEntries);
                        })
                        .catch(() => {
                            commissionerTotalCount = allPriceEntries.length;
                            updatePriceTable(allPriceEntries);
                        });
                } else {
                    // If not logged in, show all entries count
                    commissionerTotalCount = allPriceEntries.length;
                    updatePriceTable(allPriceEntries);
                }

                populateCommissionerFilter(allPriceEntries);
            } else {
                console.error('Error loading price board:', data.message);
            }
        })
        .catch(error => {
            console.error('Error fetching price board data:', error);
        });
}

// Populate commissioner filter dropdown
function populateCommissionerFilter(entries) {
    const commissionerFilter = document.getElementById('commissioner-filter');
    if (!commissionerFilter) return;

    // Get unique commissioners
    const commissioners = [...new Set(entries.map(e => e.commissionerName))].sort();

    // Clear existing options (except "All Commissioners")
    commissionerFilter.innerHTML = '<option value="">All Commissioners</option>';

    // Add commissioner options
    commissioners.forEach(commissioner => {
        const option = document.createElement('option');
        option.value = commissioner;
        option.textContent = commissioner;
        commissionerFilter.appendChild(option);
    });
}

// Search and filter functions
function clearFilters() {
    document.getElementById('search-input').value = '';
    currentSearchTerm = '';
    document.getElementById('vegetable-filter').value = '';
    document.getElementById('commissioner-filter').value = '';
    document.getElementById('sort-filter').value = '';

    // Reset table to show all entries
    updatePriceTable(allPriceEntries);
}

function updatePriceTable(entries) {
    const tbody = document.getElementById('price-table-body');
    const resultsCount = document.getElementById('results-count');
    const totalCount = document.getElementById('total-count');

    // Update filtered results count
    resultsCount.textContent = entries.length;

    // Update total count (commissioner's total if logged in, all entries if not)
    if (totalCount) {
        totalCount.textContent = commissionerTotalCount;
    }
    
    // Clear existing rows
    tbody.innerHTML = '';
    
    // Add new rows
    entries.forEach(entry => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td class="font-medium">${entry.vegetableName}</td>
            <td class="font-semibold text-green-600">₱${entry.price.toFixed(2)}</td>
            <td class="text-gray-600">${entry.unit}</td>
            <td>${entry.commissionerName}</td>
            <td class="text-gray-600">${entry.updatedAt}</td>
            <td><span class="badge badge-${entry.status === 'Good Quality' ? 'success' : 'warning'}">${entry.status}</span></td>
            <td class="text-gray-600">${entry.notes || '-'}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// Global variables for searchable dropdowns
let entryVegetableDropdown;

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Restore user session from localStorage
    const savedUser = localStorage.getItem('currentUser');
    const savedAuthState = localStorage.getItem('isAuthenticated');

    if (savedUser && savedAuthState === 'true') {
        try {
            currentUser = JSON.parse(savedUser);
            isAuthenticated = true;
        } catch (error) {
            console.error('Error restoring session:', error);
            localStorage.removeItem('currentUser');
            localStorage.removeItem('isAuthenticated');
        }
    }

    // Initialize the app
    updateAuthUI();

    // Initialize searchable dropdown for entry modal
    const vegetableFilter = document.getElementById('vegetable-filter');

    entryVegetableDropdown = new SearchableDropdown('entry-vegetable-container', {
        items: VEGETABLES,
        placeholder: 'Select a vegetable',
        allowCustom: true,
        onSelect: (value) => {
            console.log('Vegetable selected:', value);
        }
    });

    // Load price board data
    loadPriceBoard();

    // Check URL hash for page navigation on reload
    const hash = window.location.hash.substring(1); // Remove '#'
    if (hash && document.getElementById(hash)) {
        showPage(hash, false); // Don't update hash again
    } else {
        // Default to landing page (already active in HTML)
    }

    // Handle browser back/forward buttons
    window.addEventListener('hashchange', function() {
        const newHash = window.location.hash.substring(1);
        if (newHash && document.getElementById(newHash)) {
            showPage(newHash, false); // Don't update hash again
        }
    });

    // Set up search functionality
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', function() {
        currentSearchTerm = this.value.toLowerCase();
        applyFilters();
    });

    // Set up filter functionality
    const commissionerFilter = document.getElementById('commissioner-filter');
    const sortFilter = document.getElementById('sort-filter');

    function applyFilters() {
        let filteredEntries = [...allPriceEntries];

        // Apply search filter
        if (currentSearchTerm) {
            filteredEntries = filteredEntries.filter(entry =>
                entry.vegetableName.toLowerCase().includes(currentSearchTerm) ||
                entry.commissionerName.toLowerCase().includes(currentSearchTerm)
            );
        }

        // Apply vegetable filter
        const vegetableValue = vegetableFilter.value;
        if (vegetableValue && vegetableValue !== '') {
            filteredEntries = filteredEntries.filter(entry =>
                entry.vegetableName.trim().toLowerCase() === vegetableValue.trim().toLowerCase()
            );
        }

        // Apply commissioner filter
        if (commissionerFilter.value) {
            filteredEntries = filteredEntries.filter(entry =>
                entry.commissionerName === commissionerFilter.value
            );
        }

        // Apply quality status filter and sorting
        if (sortFilter.value) {
            const [sortBy, sortOrder] = sortFilter.value.split('-');

            // Apply quality status filter
            if (sortBy === 'status') {
                if (sortOrder === 'good') {
                    // Show only Good Quality items
                    filteredEntries = filteredEntries.filter(entry =>
                        entry.status === 'Good Quality'
                    );
                } else if (sortOrder === 'low') {
                    // Show only Low Quality items
                    console.log('Filtering Low Quality. All entries:', filteredEntries.map(e => ({veg: e.vegetableName, status: e.status})));
                    filteredEntries = filteredEntries.filter(entry => {
                        console.log(`Checking ${entry.vegetableName}: "${entry.status}" === "Low Quality"?`, entry.status === 'Low Quality');
                        return entry.status === 'Low Quality';
                    });
                }
            } else {
                // Apply sorting for price and date
                filteredEntries.sort((a, b) => {
                    let aValue, bValue;

                    if (sortBy === 'price') {
                        aValue = a.price;
                        bValue = b.price;
                    } else if (sortBy === 'date') {
                        // Simple date comparison (in real app, use proper date parsing)
                        aValue = new Date(a.updatedAt).getTime();
                        bValue = new Date(b.updatedAt).getTime();
                    }

                    if (sortOrder === 'desc') {
                        return bValue - aValue;
                    }
                    return aValue - bValue;
                });
            }
        }

        updatePriceTable(filteredEntries);
    }

    vegetableFilter.addEventListener('change', applyFilters);
    commissionerFilter.addEventListener('change', applyFilters);
    sortFilter.addEventListener('change', applyFilters);
    
    // Close modals when clicking outside
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', function(e) {
            if (e.target === this) {
                this.style.display = 'none';
            }
        });
    });
    
    // Prevent modal close when clicking inside modal
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    });
    
    // Navigation links
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const pageId = this.getAttribute('href').substring(1);
            showPage(pageId);
        });
    });
});

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Escape key to close modals
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            if (overlay.style.display === 'flex') {
                overlay.style.display = 'none';
            }
        });
    }
});
