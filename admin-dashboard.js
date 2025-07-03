// Admin Dashboard JavaScript
const API_URL = 'http://localhost:3000/api';
let currentUser = null;
let employees = [];
let attendance = [];
let departments = [];
let currentPage = 1;
let attCurrentPage = 1;
const itemsPerPage = 10;

// DOM Elements
const dashboardTab = document.getElementById('dashboardTab');
const employeesTab = document.getElementById('employeesTab');
const attendanceTab = document.getElementById('attendanceTab');
const tabLinks = document.querySelectorAll('.dashboard-nav a');
const logoutBtn = document.getElementById('logoutBtn');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mainNav = document.getElementById('mainNav');

// Mobile menu toggle
if (mobileMenuBtn && mainNav) {
    mobileMenuBtn.addEventListener('click', (e) => {
        e.preventDefault();
        mainNav.classList.toggle('active');
        mobileMenuBtn.setAttribute('aria-expanded', 
            mainNav.classList.contains('active') ? 'true' : 'false'
        );
    });
}

// Close mobile menu when clicking outside
document.addEventListener('click', (e) => {
    if (mainNav && mobileMenuBtn && !mainNav.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
        mainNav.classList.remove('active');
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
    }
});

// Close mobile menu when a link is clicked
document.querySelectorAll('.dashboard-nav a').forEach(link => {
    link.addEventListener('click', () => {
        if (window.innerWidth <= 992) {
            mainNav.classList.remove('active');
            mobileMenuBtn.setAttribute('aria-expanded', 'false');
        }
    });
});

// Dashboard Elements
const totalEmployeesEl = document.getElementById('totalEmployees');
const presentTodayEl = document.getElementById('presentToday');
const lateTodayEl = document.getElementById('lateToday');
const absentTodayEl = document.getElementById('absentToday');
const recentAttendanceTable = document.querySelector('#recentAttendanceTable tbody');

// Employees Tab Elements
const employeesTable = document.querySelector('#employeesTable tbody');
const deptFilter = document.getElementById('deptFilter');
const searchEmployee = document.getElementById('searchEmployee');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const pageInfo = document.getElementById('pageInfo');
const addEmployeeBtn = document.getElementById('addEmployeeBtn');
const exportEmployeesBtn = document.getElementById('exportEmployeesBtn');

// Attendance Tab Elements
const attendanceTable = document.querySelector('#attendanceTable tbody');
const attDeptFilter = document.getElementById('attDeptFilter');
const attStatusFilter = document.getElementById('attStatusFilter');
const startDate = document.getElementById('startDate');
const endDate = document.getElementById('endDate');
const attPrevPageBtn = document.getElementById('attPrevPage');
const attNextPageBtn = document.getElementById('attNextPage');
const attPageInfo = document.getElementById('attPageInfo');
const exportAttendanceBtn = document.getElementById('exportAttendanceBtn');
const applyAttendanceFilters = document.getElementById('applyAttendanceFilters');
const resetFilters = document.getElementById('resetFilters');

// Modal Elements
const modal = document.getElementById('employeeModal');
const closeModal = document.querySelector('.close');
const cancelBtn = document.getElementById('cancelBtn');
const employeeForm = document.getElementById('employeeForm');
const modalTitle = document.getElementById('modalTitle');

// Chart
let departmentChart = null;

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in
    const token = localStorage.getItem('adminToken');
    if (!token) {
        window.location.href = 'admin-login.html';
        return;
    }
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize date pickers
    flatpickr(".date-picker", {
        dateFormat: "Y-m-d",
        defaultDate: new Date()
    });
    
    // Set default dates
    const today = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    startDate.value = formatDate(lastMonth);
    endDate.value = formatDate(today);
    
    // Load initial data
    loadDashboardData();
    loadEmployees();
    loadAttendance();
});

// Set up event listeners
function setupEventListeners() {
    // Tab navigation
    tabLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tab = e.target.closest('a').dataset.tab;
            if (tab) {
                showTab(tab);
            }
        });
    });
    
    // Logout
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('adminToken');
        window.location.href = 'admin-login.html';
    });
    
    // Employees tab
    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderEmployeesTable();
        }
    });
    
    nextPageBtn.addEventListener('click', () => {
        const maxPage = Math.ceil(employees.length / itemsPerPage);
        if (currentPage < maxPage) {
            currentPage++;
            renderEmployeesTable();
        }
    });
    
    addEmployeeBtn.addEventListener('click', () => openEmployeeModal());
    exportEmployeesBtn.addEventListener('click', exportEmployees);
    
    // Attendance tab
    attPrevPageBtn.addEventListener('click', () => {
        if (attCurrentPage > 1) {
            attCurrentPage--;
            renderAttendanceTable();
        }
    });
    
    attNextPageBtn.addEventListener('click', () => {
        const maxPage = Math.ceil(attendance.length / itemsPerPage);
        if (attCurrentPage < maxPage) {
            attCurrentPage++;
            renderAttendanceTable();
        }
    });
    
    applyAttendanceFilters.addEventListener('click', loadAttendance);
    resetFilters.addEventListener('click', resetAttendanceFilters);
    exportAttendanceBtn.addEventListener('click', exportAttendance);
    
    // Modal
    closeModal.addEventListener('click', () => modal.style.display = 'none');
    cancelBtn.addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Form submission
    employeeForm.addEventListener('submit', handleEmployeeSubmit);
}

// Show tab content
function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
    });
    
    // Remove active class from all tab links
    tabLinks.forEach(link => {
        link.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(`${tabName}Tab`).style.display = 'block';
    
    // Add active class to clicked tab
    const activeTab = Array.from(tabLinks).find(link => link.dataset.tab === tabName);
    if (activeTab) {
        activeTab.classList.add('active');
    }
    
    // Refresh data if needed
    if (tabName === 'dashboard') {
        loadDashboardData();
    } else if (tabName === 'employees') {
        loadEmployees();
    } else if (tabName === 'attendance') {
        loadAttendance();
    }
}

// Load dashboard data
async function loadDashboardData() {
    try {
        // Load summary data
        const today = formatDate(new Date());
        const [employeesRes, attendanceRes, summaryRes] = await Promise.all([
            fetchWithToken(`${API_URL}/admin/employees`),
            fetchWithToken(`${API_URL}/admin/attendance?date=${today}`),
            fetchWithToken(`${API_URL}/admin/summary`)
        ]);
        
        const employees = await employeesRes.json();
        const todayAttendance = await attendanceRes.json();
        const summary = await summaryRes.json();
        
        // Update dashboard stats
        totalEmployeesEl.textContent = employees.length;
        
        const presentCount = todayAttendance.filter(a => a.status === 'present').length;
        const lateCount = todayAttendance.filter(a => a.status === 'late').length;
        const absentCount = employees.length - presentCount - lateCount;
        
        presentTodayEl.textContent = presentCount;
        lateTodayEl.textContent = lateCount;
        absentTodayEl.textContent = absentCount > 0 ? absentCount : 0;
        
        // Render recent attendance
        renderRecentAttendance(todayAttendance.slice(0, 5));
        
        // Render department chart
        renderDepartmentChart(summary);
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        alert('Failed to load dashboard data. Please try again.');
    }
}

// Load employees
async function loadEmployees() {
    try {
        const response = await fetchWithToken(`${API_URL}/admin/employees`);
        employees = await response.json();
        
        // Extract unique departments
        departments = [...new Set(employees.map(emp => emp.department))].filter(Boolean);
        
        // Update department filters
        updateDepartmentFilters();
        
        // Render employees table
        renderEmployeesTable();
        
    } catch (error) {
        console.error('Error loading employees:', error);
        alert('Failed to load employees. Please try again.');
    }
}

// Load attendance
async function loadAttendance() {
    try {
        let url = `${API_URL}/admin/attendance`;
        const params = [];
        
        if (startDate.value) {
            params.push(`startDate=${startDate.value}`);
        }
        
        if (endDate.value) {
            params.push(`endDate=${endDate.value}`);
        }
        
        const dept = attDeptFilter.value;
        if (dept) {
            params.push(`department=${encodeURIComponent(dept)}`);
        }
        
        const status = attStatusFilter.value;
        if (status) {
            params.push(`status=${status}`);
        }
        
        if (params.length > 0) {
            url += `?${params.join('&')}`;
        }
        
        const response = await fetchWithToken(url);
        attendance = await response.json();
        
        // Render attendance table
        renderAttendanceTable();
        
    } catch (error) {
        console.error('Error loading attendance:', error);
        alert('Failed to load attendance records. Please try again.');
    }
}

// Reset attendance filters
function resetAttendanceFilters() {
    const today = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    startDate.value = formatDate(lastMonth);
    endDate.value = formatDate(today);
    attDeptFilter.value = '';
    attStatusFilter.value = '';
    
    loadAttendance();
}

// Update department filters
function updateDepartmentFilters() {
    // Clear existing options
    deptFilter.innerHTML = '<option value="">All Departments</option>';
    attDeptFilter.innerHTML = '<option value="">All Departments</option>';
    
    // Add departments to both filters
    departments.forEach(dept => {
        const option1 = document.createElement('option');
        option1.value = dept;
        option1.textContent = dept;
        deptFilter.appendChild(option1);
        
        const option2 = document.createElement('option');
        option2.value = dept;
        option2.textContent = dept;
        attDeptFilter.appendChild(option2);
    });
}

// Render recent attendance
function renderRecentAttendance(records) {
    recentAttendanceTable.innerHTML = '';
    
    if (records.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="5" class="text-center">No attendance records for today</td>';
        recentAttendanceTable.appendChild(row);
        return;
    }
    
    records.forEach(record => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${record.name}</td>
            <td>${formatDate(record.date)}</td>
            <td><span class="status-badge ${record.status}">${record.status}</span></td>
            <td>${record.check_in || 'N/A'}</td>
            <td>${record.check_out || 'N/A'}</td>
        `;
        
        recentAttendanceTable.appendChild(row);
    });
}

// Render employees table
function renderEmployeesTable() {
    const searchTerm = searchEmployee.value.toLowerCase();
    const selectedDept = deptFilter.value;
    
    // Filter employees
    let filteredEmployees = [...employees];
    
    if (searchTerm) {
        filteredEmployees = filteredEmployees.filter(emp => 
            emp.name.toLowerCase().includes(searchTerm) || 
            emp.employee_id.toLowerCase().includes(searchTerm) ||
            emp.email.toLowerCase().includes(searchTerm)
        );
    }
    
    if (selectedDept) {
        filteredEmployees = filteredEmployees.filter(emp => emp.department === selectedDept);
    }
    
    // Calculate pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedEmployees = filteredEmployees.slice(startIndex, endIndex);
    const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
    
    // Update pagination controls
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage >= totalPages;
    pageInfo.textContent = `Page ${currentPage} of ${totalPages || 1}`;
    
    // Render table rows
    employeesTable.innerHTML = '';
    
    if (paginatedEmployees.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="7" class="text-center">No employees found</td>';
        employeesTable.appendChild(row);
        return;
    }
    
    paginatedEmployees.forEach(emp => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${emp.employee_id}</td>
            <td>${emp.name}</td>
            <td>${emp.email}</td>
            <td>${emp.department || 'N/A'}</td>
            <td>${emp.position || 'N/A'}</td>
            <td>${emp.joining_date ? formatDate(emp.joining_date) : 'N/A'}</td>
            <td class="actions">
                <button class="btn-icon edit-employee" data-id="${emp.employee_id}" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon delete-employee" data-id="${emp.employee_id}" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        employeesTable.appendChild(row);
    });
    
    // Add event listeners to action buttons
    document.querySelectorAll('.edit-employee').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const empId = e.currentTarget.dataset.id;
            editEmployee(empId);
        });
    });
    
    document.querySelectorAll('.delete-employee').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const empId = e.currentTarget.dataset.id;
            if (confirm(`Are you sure you want to delete employee ${empId}?`)) {
                deleteEmployee(empId);
            }
        });
    });
}

// Render attendance table
function renderAttendanceTable() {
    // Calculate pagination
    const startIndex = (attCurrentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedAttendance = attendance.slice(startIndex, endIndex);
    const totalPages = Math.ceil(attendance.length / itemsPerPage);
    
    // Update pagination controls
    attPrevPageBtn.disabled = attCurrentPage === 1;
    attNextPageBtn.disabled = attCurrentPage >= totalPages;
    attPageInfo.textContent = `Page ${attCurrentPage} of ${totalPages || 1}`;
    
    // Render table rows
    attendanceTable.innerHTML = '';
    
    if (paginatedAttendance.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="8" class="text-center">No attendance records found</td>';
        attendanceTable.appendChild(row);
        return;
    }
    
    paginatedAttendance.forEach(record => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${record.employee_id}</td>
            <td>${record.name}</td>
            <td>${formatDate(record.date)}</td>
            <td><span class="status-badge ${record.status}">${record.status}</span></td>
            <td>${record.check_in || 'N/A'}</td>
            <td>${record.check_out || 'N/A'}</td>
            <td>${record.department || 'N/A'}</td>
            <td>${record.position || 'N/A'}</td>
        `;
        
        attendanceTable.appendChild(row);
    });
}

// Render department chart
function renderDepartmentChart(summary) {
    const ctx = document.getElementById('departmentCanvas').getContext('2d');
    
    // Group by department
    const deptData = {};
    
    summary.forEach(emp => {
        if (!deptData[emp.department]) {
            deptData[emp.department] = {
                present: 0,
                absent: 0,
                late: 0,
                total: 0
            };
        }
        
        deptData[emp.department].present += emp.present_days || 0;
        deptData[emp.department].absent += emp.absent_days || 0;
        deptData[emp.department].late += emp.late_days || 0;
        deptData[emp.department].total += (emp.present_days || 0) + (emp.absent_days || 0) + (emp.late_days || 0);
    });
    
    const labels = Object.keys(deptData);
    const presentData = labels.map(dept => deptData[dept].present);
    const lateData = labels.map(dept => deptData[dept].late);
    const absentData = labels.map(dept => deptData[dept].absent);
    
    // Destroy previous chart if it exists
    if (departmentChart) {
        departmentChart.destroy();
    }
    
    // Create new chart
    departmentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Present',
                    data: presentData,
                    backgroundColor: '#4caf50',
                    borderColor: '#4caf50',
                    borderWidth: 1
                },
                {
                    label: 'Late',
                    data: lateData,
                    backgroundColor: '#ff9800',
                    borderColor: '#ff9800',
                    borderWidth: 1
                },
                {
                    label: 'Absent',
                    data: absentData,
                    backgroundColor: '#f44336',
                    borderColor: '#f44336',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true,
                    title: {
                        display: true,
                        text: 'Department'
                    }
                },
                y: {
                    stacked: true,
                    title: {
                        display: true,
                        text: 'Number of Days'
                    },
                    beginAtZero: true
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Attendance by Department',
                    font: {
                        size: 16
                    }
                },
                legend: {
                    position: 'top',
                }
            }
        }
    });
}

// Open employee modal
function openEmployeeModal(employee = null) {
    const form = document.getElementById('employeeForm');
    
    if (employee) {
        // Edit mode
        modalTitle.textContent = 'Edit Employee';
        document.getElementById('employeeId').value = employee.employee_id;
        document.getElementById('empName').value = employee.name;
        document.getElementById('empEmail').value = employee.email || '';
        document.getElementById('empDept').value = employee.department || '';
        document.getElementById('empPosition').value = employee.position || '';
        document.getElementById('empId').value = employee.employee_id;
        document.getElementById('empJoinDate').value = employee.joining_date || '';
    } else {
        // Add mode
        modalTitle.textContent = 'Add Employee';
        form.reset();
        
        // Generate a new employee ID
        const maxId = employees.reduce((max, emp) => {
            const num = parseInt(emp.employee_id.replace('EMP', '')) || 0;
            return num > max ? num : max;
        }, 0);
        
        document.getElementById('empId').value = `EMP${maxId + 1}`;
        document.getElementById('empJoinDate').value = formatDate(new Date());
    }
    
    modal.style.display = 'block';
}

// Handle employee form submission
async function handleEmployeeSubmit(e) {
    e.preventDefault();
    
    const employee = {
        employee_id: document.getElementById('empId').value,
        name: document.getElementById('empName').value,
        email: document.getElementById('empEmail').value,
        department: document.getElementById('empDept').value,
        position: document.getElementById('empPosition').value,
        joining_date: document.getElementById('empJoinDate').value
    };
    
    try {
        // In a real app, you would save this to the server
        const existingIndex = employees.findIndex(emp => emp.employee_id === employee.employee_id);
        
        if (existingIndex >= 0) {
            // Update existing employee
            employees[existingIndex] = { ...employees[existingIndex], ...employee };
        } else {
            // Add new employee
            employees.push(employee);
        }
        
        // In a real app, you would call an API to save the employee
        // await fetchWithToken(`${API_URL}/admin/employees`, {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(employee)
        // });
        
        // Close modal and refresh data
        modal.style.display = 'none';
        loadEmployees();
        
    } catch (error) {
        console.error('Error saving employee:', error);
        alert('Failed to save employee. Please try again.');
    }
}

// Edit employee
function editEmployee(employeeId) {
    const employee = employees.find(emp => emp.employee_id === employeeId);
    if (employee) {
        openEmployeeModal(employee);
    }
}

// Delete employee
async function deleteEmployee(employeeId) {
    try {
        // In a real app, you would call an API to delete the employee
        // await fetchWithToken(`${API_URL}/admin/employees/${employeeId}`, {
        //     method: 'DELETE'
        // });
        
        // For demo, just remove from the local array
        employees = employees.filter(emp => emp.employee_id !== employeeId);
        
        // Refresh the table
        renderEmployeesTable();
        
    } catch (error) {
        console.error('Error deleting employee:', error);
        alert('Failed to delete employee. Please try again.');
    }
}

// Export employees to Excel
function exportEmployees() {
    const data = employees.map(emp => ({
        'Employee ID': emp.employee_id,
        'Name': emp.name,
        'Email': emp.email,
        'Department': emp.department,
        'Position': emp.position,
        'Joining Date': emp.joining_date
    }));
    
    exportToExcel(data, 'Employees');
}

// Export attendance to Excel
function exportAttendance() {
    const data = attendance.map(record => ({
        'Employee ID': record.employee_id,
        'Name': record.name,
        'Date': formatDate(record.date),
        'Status': record.status.charAt(0).toUpperCase() + record.status.slice(1),
        'Check In': record.check_in || 'N/A',
        'Check Out': record.check_out || 'N/A',
        'Department': record.department || 'N/A',
        'Position': record.position || 'N/A'
    }));
    
    exportToExcel(data, 'Attendance_Records');
}

// Export data to Excel
function exportToExcel(data, sheetName) {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    
    // Generate filename with current date
    const date = new Date().toISOString().split('T')[0];
    const filename = `${sheetName}_${date}.xlsx`;
    
    // Save the file
    XLSX.writeFile(wb, filename);
}

// Format date as YYYY-MM-DD
function formatDate(date) {
    if (!(date instanceof Date)) {
        date = new Date(date);
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}

// Format date as DD/MM/YYYY
function formatDisplayDate(dateString) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
}

// Helper function to make authenticated requests
async function fetchWithToken(url, options = {}) {
    const token = localStorage.getItem('adminToken');
    
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    const response = await fetch(url, {
        ...options,
        headers
    });
    
    if (response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('adminToken');
        window.location.href = 'admin-login.html';
        throw new Error('Unauthorized');
    }
    
    return response;
}
