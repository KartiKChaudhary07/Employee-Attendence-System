// API base URL
const API_URL = 'http://localhost:3000/api';

// DOM Elements
let records = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', async function() {
    // Authentication state management
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const protectedLinks = document.getElementById('protectedLinks');
    const authLinks = document.getElementById('authLinks');
    const userMenu = document.getElementById('userMenu');
    const userName = document.getElementById('userName');
    const logoutBtn = document.getElementById('logoutBtn');
    const attendanceForm = document.getElementById('attendanceForm');
    
    // Update UI based on authentication state
    if (currentUser) {
        if (protectedLinks) protectedLinks.style.display = 'block';
        if (authLinks) authLinks.style.display = 'none';
        if (userMenu) userMenu.style.display = 'block';
        if (userName) userName.textContent = currentUser.name || 'User';
    } else {
        if (protectedLinks) protectedLinks.style.display = 'none';
        if (authLinks) authLinks.style.display = 'block';
        if (userMenu) userMenu.style.display = 'none';
    }
    
    // Handle logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            localStorage.removeItem('currentUser');
            window.location.href = 'index.html';
        });
    }
    
    // Load attendance records
    await loadAttendanceRecords();
    
    // Handle form submission
    if (attendanceForm) {
        attendanceForm.addEventListener('submit', handleFormSubmit);
    }
    
    // Handle export to Excel
    document.getElementById('exportExcel')?.addEventListener('click', exportToExcel);
});

// Load attendance records from the server
async function loadAttendanceRecords() {
    try {
        const response = await fetch(`${API_URL}/attendance`);
        if (!response.ok) throw new Error('Failed to load records');
        
        records = await response.json();
        updateRecordsTable();
        updateStats();
    } catch (error) {
        console.error('Error loading records:', error);
        alert('Failed to load attendance records. Please try again.');
    }
}

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();
    
    // Get form values
    const employeeId = document.getElementById('employeeId').value.trim();
    const name = document.getElementById('name').value.trim();
    const date = document.getElementById('date').value;
    const status = document.querySelector('input[name="status"]:checked').value;
    
    try {
        const response = await fetch(`${API_URL}/attendance`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                employeeId,
                name,
                date,
                status
            })
        });
        
        if (!response.ok) throw new Error('Failed to save record');
        
        // Reset form
        e.target.reset();
        document.getElementById('date').value = new Date().toISOString().split('T')[0];
        
        // Reload records
        await loadAttendanceRecords();
        
    } catch (error) {
        console.error('Error saving record:', error);
        alert('Failed to save attendance record. Please try again.');
    }
}

// Update the records table with data from the server
function updateRecordsTable() {
    const recordsTable = document.getElementById('recordsTable');
    if (!recordsTable) return;
    
    // Clear current table
    recordsTable.innerHTML = '';
    
    if (records.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="4" class="text-center">No attendance records found</td>';
        recordsTable.appendChild(row);
        return;
    }
    
    // Add each record to the table
    records.forEach(record => {
        const row = document.createElement('tr');
        
        // Format status with color
        let statusBadge = '';
        switch(record.status) {
            case 'present':
                statusBadge = 'Present';
                break;
            case 'absent':
                statusBadge = 'Absent';
                break;
            case 'late':
                statusBadge = 'Late';
                break;
        }
        
        row.innerHTML = `
            <td>${record.employee_id}</td>
            <td>${record.name}</td>
            <td>${formatDate(record.date)}</td>
            <td><span class="status-badge ${record.status}">${statusBadge}</span></td>
        `;
        
        recordsTable.appendChild(row);
    });
}

// Update statistics
function updateStats() {
    if (!records || records.length === 0) {
        document.getElementById('presentCount').textContent = '0';
        document.getElementById('absentCount').textContent = '0';
        document.getElementById('lateCount').textContent = '0';
        document.getElementById('totalCount').textContent = '0';
        return;
    }
    
    const presentCount = records.filter(r => r.status === 'present').length;
    const absentCount = records.filter(r => r.status === 'absent').length;
    const lateCount = records.filter(r => r.status === 'late').length;
    
    document.getElementById('presentCount').textContent = presentCount;
    document.getElementById('absentCount').textContent = absentCount;
    document.getElementById('lateCount').textContent = lateCount;
    document.getElementById('totalCount').textContent = records.length;
}

// Function to format date as DD/MM/YYYY
function formatDate(dateString) {
    const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
    return new Date(dateString).toLocaleDateString('en-GB', options);
}

// Export to Excel functionality
async function exportToExcel() {
    if (!records || records.length === 0) {
        alert('No attendance records to export!');
        return;
    }

    // Format data for Excel
    const excelData = records.map(record => ({
        'Employee ID': record.employee_id,
        'Name': record.name,
        'Date': formatDate(record.date),
        'Status': record.status.charAt(0).toUpperCase() + record.status.slice(1),
        'Timestamp': new Date(record.date).toISOString()
    }));

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(excelData);
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
    
    // Generate filename with current date
    const date = new Date().toISOString().split('T')[0];
    const filename = `Attendance_Records_${date}.xlsx`;
    
    // Export the file
    XLSX.writeFile(wb, filename);
}

// Set today's date as default when the page loads
window.onload = function() {
    const dateInput = document.getElementById('date');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
};
