const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = 'attendance.db';
const JWT_SECRET = 'your-secret-key-123';

// Admin credentials
const ADMIN_CREDENTIALS = {
    username: 'kartik@123',
    password: '$2a$10$XFDJ9zZz9zZz9zZz9zZz.e9zZz9zZz9zZz9zZz9zZz9zZz9zZz2' // hashed '1234'
};

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Initialize database
const db = new sqlite3.Database(DB_FILE, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
    }
});

// Initialize database tables
function initializeDatabase() {
    const queries = [
        `CREATE TABLE IF NOT EXISTS employees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            email TEXT UNIQUE,
            department TEXT,
            position TEXT,
            joining_date TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS attendance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id TEXT NOT NULL,
            name TEXT NOT NULL,
            date TEXT NOT NULL,
            status TEXT NOT NULL,
            check_in TEXT,
            check_out TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
        )`
    ];

    // Execute all table creation queries
    const executeQuery = (index) => {
        if (index >= queries.length) {
            // After tables are created, check if we need to add sample data
            checkAndAddSampleData();
            return;
        }
        
        db.run(queries[index], (err) => {
            if (err) {
                console.error('Error creating table:', err.message);
            } else {
                console.log(`Table ${index + 1} initialized`);
                executeQuery(index + 1);
            }
        });
    };

    executeQuery(0);
}

// Add sample employee data if table is empty
function checkAndAddSampleData() {
    db.get('SELECT COUNT(*) as count FROM employees', (err, row) => {
        if (err) {
            console.error('Error checking employee count:', err);
            return;
        }

        if (row.count === 0) {
            addSampleEmployees();
        }
    });
}

// Generate sample employee data
function addSampleEmployees() {
    const departments = ['Engineering', 'HR', 'Marketing', 'Sales', 'Finance', 'Operations'];
    const positions = [
        'Software Engineer', 'Senior Developer', 'Team Lead', 'Manager',
        'HR Executive', 'Marketing Specialist', 'Sales Representative',
        'Financial Analyst', 'Operations Manager', 'Intern'
    ];
    
    const firstNames = ['John', 'Jane', 'Michael', 'Emily', 'David', 'Sarah', 'Robert', 'Lisa', 'James', 'Jennifer'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Garcia', 'Rodriguez', 'Wilson'];
    
    const employees = [];
    
    // Generate 50 sample employees
    for (let i = 1; i <= 50; i++) {
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        const name = `${firstName} ${lastName}`;
        const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@company.com`;
        const department = departments[Math.floor(Math.random() * departments.length)];
        const position = positions[Math.floor(Math.random() * positions.length)];
        const joiningDate = new Date(2020 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 12), 1 + Math.floor(Math.random() * 28))
            .toISOString().split('T')[0];
        
        employees.push({
            employee_id: `EMP${1000 + i}`,
            name,
            email,
            department,
            position,
            joining_date: joiningDate
        });
    }
    
    // Add sample attendance for each employee
    const addNextEmployee = (index) => {
        if (index >= employees.length) {
            console.log('Sample data generation complete');
            // Add sample attendance after all employees are added
            addSampleAttendance();
            return;
        }
        
        const emp = employees[index];
        db.run(
            'INSERT INTO employees (employee_id, name, email, department, position, joining_date) VALUES (?, ?, ?, ?, ?, ?)',
            [emp.employee_id, emp.name, emp.email, emp.department, emp.position, emp.joining_date],
            (err) => {
                if (err) {
                    console.error('Error adding employee:', err);
                } else {
                    // Add some sample attendance for this employee
                    addEmployeeAttendance(emp.employee_id, emp.name, () => {
                        addNextEmployee(index + 1);
                    });
                }
            }
        );
    };
    
    addNextEmployee(0);
}

// Add sample attendance for an employee
function addEmployeeAttendance(employeeId, employeeName, callback) {
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const attendance = [];
    
    // Generate attendance for the last 30 days
    for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        // Skip weekends (0 = Sunday, 6 = Saturday)
        if (date.getDay() === 0 || date.getDay() === 6) continue;
        
        const status = Math.random() > 0.1 ? 'present' : (Math.random() > 0.5 ? 'late' : 'absent');
        let checkIn, checkOut;
        
        if (status === 'present') {
            // Random check-in between 8:00 AM and 10:00 AM
            const checkInHour = 8 + Math.floor(Math.random() * 3);
            const checkInMinute = Math.floor(Math.random() * 60);
            checkIn = `${checkInHour.toString().padStart(2, '0')}:${checkInMinute.toString().padStart(2, '0')}`;
            
            // Check-out 8-10 hours after check-in
            const checkOutHour = checkInHour + 8 + Math.floor(Math.random() * 3);
            const checkOutMinute = Math.floor(Math.random() * 60);
            checkOut = `${checkOutHour.toString().padStart(2, '0')}:${checkOutMinute.toString().padStart(2, '0')}`;
        } else if (status === 'late') {
            // Late check-in between 10:00 AM and 12:00 PM
            const checkInHour = 10 + Math.floor(Math.random() * 3);
            const checkInMinute = Math.floor(Math.random() * 60);
            checkIn = `${checkInHour.toString().padStart(2, '0')}:${checkInMinute.toString().padStart(2, '0')}`;
            
            // Check-out 6-8 hours after check-in
            const checkOutHour = checkInHour + 6 + Math.floor(Math.random() * 3);
            const checkOutMinute = Math.floor(Math.random() * 60);
            checkOut = `${checkOutHour.toString().padStart(2, '0')}:${checkOutMinute.toString().padStart(2, '0')}`;
        }
        
        attendance.push({
            employee_id: employeeId,
            name: employeeName,
            date: date.toISOString().split('T')[0],
            status,
            check_in: checkIn,
            check_out: checkOut
        });
    }
    
    // Add attendance records to database
    const addNextAttendance = (index) => {
        if (index >= attendance.length) {
            callback();
            return;
        }
        
        const record = attendance[index];
        db.run(
            'INSERT INTO attendance (employee_id, name, date, status, check_in, check_out) VALUES (?, ?, ?, ?, ?, ?)',
            [record.employee_id, record.name, record.date, record.status, record.check_in, record.check_out],
            (err) => {
                if (err) {
                    console.error('Error adding attendance:', err);
                }
                addNextAttendance(index + 1);
            }
        );
    };
    
    addNextAttendance(0);
}

// Add sample attendance data for all employees
function addSampleAttendance() {
    // This is now handled by addEmployeeAttendance called from addSampleEmployees
    console.log('Adding sample attendance data...');
}

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.sendStatus(401);
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Admin login
app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;
    
    if (username === ADMIN_CREDENTIALS.username) {
        const validPassword = await bcrypt.compare(password, ADMIN_CREDENTIALS.password);
        if (validPassword) {
            const token = jwt.sign(
                { username: ADMIN_CREDENTIALS.username, role: 'admin' },
                JWT_SECRET,
                { expiresIn: '24h' }
            );
            return res.json({ token });
        }
    }
    
    res.status(401).json({ error: 'Invalid credentials' });
});

// Get all employees (admin only)
app.get('/api/admin/employees', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    
    const sql = 'SELECT * FROM employees ORDER BY name';
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Get all attendance records (admin only)
app.get('/api/admin/attendance', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    
    const { startDate, endDate, department, status } = req.query;
    let sql = `
        SELECT a.*, e.department, e.position, e.email 
        FROM attendance a
        JOIN employees e ON a.employee_id = e.employee_id
        WHERE 1=1
    `;
    const params = [];
    
    if (startDate) {
        sql += ' AND a.date >= ?';
        params.push(startDate);
    }
    
    if (endDate) {
        sql += ' AND a.date <= ?';
        params.push(endDate);
    }
    
    if (department) {
        sql += ' AND e.department = ?';
        params.push(department);
    }
    
    if (status) {
        sql += ' AND a.status = ?';
        params.push(status);
    }
    
    sql += ' ORDER BY a.date DESC, a.employee_id';
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Get attendance summary by employee (admin only)
app.get('/api/admin/summary', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    
    const { startDate, endDate, department } = req.query;
    
    let sql = `
        SELECT 
            e.employee_id,
            e.name,
            e.department,
            e.position,
            SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_days,
            SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_days,
            SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_days,
            COUNT(a.id) as total_days
        FROM employees e
        LEFT JOIN attendance a ON e.employee_id = a.employee_id
        WHERE 1=1
    `;
    
    const params = [];
    
    if (startDate) {
        sql += ' AND a.date >= ?';
        params.push(startDate);
    }
    
    if (endDate) {
        sql += ' AND a.date <= ?';
        params.push(endDate);
    }
    
    if (department) {
        sql += ' AND e.department = ?';
        params.push(department);
    }
    
    sql += ' GROUP BY e.employee_id, e.name, e.department, e.position';
    sql += ' ORDER BY e.department, e.name';
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Regular user routes
// Save attendance record
app.post('/api/attendance', (req, res) => {
    const { employeeId, name, date, status } = req.body;
    
    const sql = `
        INSERT INTO attendance (employee_id, name, date, status)
        VALUES (?, ?, ?, ?)
    `;
    
    db.run(sql, [employeeId, name, date, status], function(err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json({
            id: this.lastID,
            employeeId,
            name,
            date,
            status
        });
    });
});

// Get all attendance records for current user
app.get('/api/attendance', (req, res) => {
    const { employeeId } = req.query;
    
    if (!employeeId) {
        return res.status(400).json({ error: 'Employee ID is required' });
    }
    
    const sql = 'SELECT * FROM attendance WHERE employee_id = ? ORDER BY date DESC';
    
    db.all(sql, [employeeId], (err, rows) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Delete attendance record
app.delete('/api/attendance/:id', (req, res) => {
    const { id } = req.params;
    
    db.run('DELETE FROM attendance WHERE id = ?', [id], function(err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json({ changes: this.changes });
    });
});

// Serve the frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

// Handle process termination
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('Database connection closed');
        }
        process.exit(0);
    });
});
