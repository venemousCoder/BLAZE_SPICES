// User Actions Modal Handling
function showUserActions(userId) {
    const modal = document.getElementById('userActionsModal');
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>User Actions</h3>
                <button onclick="closeModal('userActionsModal')" class="close-btn" aria-label="Close">
                    <img src="/public/assets/close.svg" alt="">
                </button>
            </div>
            <div class="modal-body">
                <button onclick="handleUserAction('${userId}', 'view')">View Profile</button>
                <button onclick="handleUserAction('${userId}', 'suspend')">Suspend Account</button>
                <button onclick="handleUserAction('${userId}', 'delete')" class="danger">Delete Account</button>
            </div>
        </div>
    `;
    modal.style.display = 'flex';
}

// Report Handling
async function handleReport(reportId, action) {
    try {
        const response = await fetch(`/admin/reports/${reportId}/${action}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Failed to handle report');

        // Remove report from UI
        const reportElement = document.querySelector(`[data-report-id="${reportId}"]`);
        if (reportElement) {
            reportElement.remove();
            updateReportCount();
        }
    } catch (err) {
        console.error('Error handling report:', err);
        showNotification('Error handling report', 'error');
    }
}

// Maintenance Mode Modal
function showMaintenanceModal() {
    const modal = document.getElementById('maintenanceModal');
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Enable Maintenance Mode</h3>
                <button onclick="closeModal('maintenanceModal')" class="close-btn" aria-label="Close">
                    <img src="/public/assets/close.svg" alt="">
                </button>
            </div>
            <div class="modal-body">
                <p>This will temporarily disable access to the site for all non-admin users.</p>
                <form id="maintenanceForm" onsubmit="handleMaintenance(event)">
                    <div class="form-group">
                        <label for="duration">Duration (hours)</label>
                        <input type="number" id="duration" min="1" max="24" required>
                    </div>
                    <div class="form-group">
                        <label for="message">Maintenance Message</label>
                        <textarea id="message" required></textarea>
                    </div>
                    <button type="submit" class="warning">Enable Maintenance Mode</button>
                </form>
            </div>
        </div>
    `;
    modal.style.display = 'flex';
}

// User Action Handler
async function handleUserAction(userId, action) {
    try {
        const response = await fetch(`/admin/users/${userId}/${action}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Failed to perform user action');

        if (action === 'delete' || action === 'suspend') {
            const userElement = document.querySelector(`[data-user-id="${userId}"]`);
            if (userElement) userElement.remove();
        } else if (action === 'view') {
            window.location.href = `/admin/users/${userId}`;
        }

        closeModal('userActionsModal');
        showNotification(`User ${action} successful`, 'success');
    } catch (err) {
        console.error('Error handling user action:', err);
        showNotification('Error performing user action', 'error');
    }
}

// Maintenance Mode Handler
async function handleMaintenance(event) {
    event.preventDefault();
    
    const duration = document.getElementById('duration').value;
    const message = document.getElementById('message').value;

    try {
        const response = await fetch('/admin/maintenance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ duration, message })
        });

        if (!response.ok) throw new Error('Failed to enable maintenance mode');

        closeModal('maintenanceModal');
        showNotification('Maintenance mode enabled', 'success');
    } catch (err) {
        console.error('Error enabling maintenance mode:', err);
        showNotification('Error enabling maintenance mode', 'error');
    }
}

// Utility Functions
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.style.display = 'none';
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function updateReportCount() {
    const countElement = document.querySelector('.reports .stat-number');
    if (countElement) {
        let count = parseInt(countElement.textContent);
        countElement.textContent = Math.max(0, count - 1);
    }
}

// Close modals when clicking outside
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
});

// Close modals with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }
});