
CREATE DATABASE IF NOT EXISTS edutrack_db;

USE edutrack_db;

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(10) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('student', 'admin') DEFAULT 'student',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- COURSES TABLE
CREATE TABLE IF NOT EXISTS courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL
);

-- ATTENDANCE TABLE
CREATE TABLE IF NOT EXISTS attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    subject VARCHAR(100) NOT NULL,
    total_classes INT DEFAULT 0,
    present INT DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ASSIGNMENTS TABLE
CREATE TABLE IF NOT EXISTS assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    due_date DATE NOT NULL
);

-- RESULTS TABLE
CREATE TABLE IF NOT EXISTS results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    subject VARCHAR(100) NOT NULL,
    marks INT NOT NULL,
    grade VARCHAR(5) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- SAMPLE COURSES
INSERT INTO courses (title, description) VALUES
('HTML & CSS', 'Learn website structure and styling.'),
('JavaScript', 'Learn interactive web development.'),
('C++ Programming', 'Learn programming fundamentals.'),
('Database Management', 'Learn SQL and database concepts.'),
('Web Development', 'Learn complete frontend and backend development.');

-- SAMPLE ASSIGNMENTS
INSERT INTO assignments (title, subject, due_date) VALUES
('HTML Website Project', 'HTML & CSS', '2026-11-10'),
('JavaScript Practical', 'JavaScript', '2026-11-12'),
('C++ Programming Task', 'C++', '2026-11-15'),
('SQL Database Project', 'Database Management', '2026-11-18');
