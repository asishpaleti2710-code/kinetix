-- ====================================================================
-- Kinetix - Production MySQL Database Schema
-- Multi-Agent Sales Platform
-- ====================================================================

CREATE DATABASE IF NOT EXISTS kinetix CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE kinetix;

-- 1. Users Table (Authentication & Access Control)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'sales_rep',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Leads Table (Lead Profiling, BANT Scoring & Segmentation)
CREATE TABLE IF NOT EXISTS leads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    business_type VARCHAR(255),
    employee_count INT DEFAULT 1,
    budget DECIMAL(12, 2) DEFAULT 0.00,
    timeline VARCHAR(100),
    lead_score INT DEFAULT 0,
    lead_status VARCHAR(50) DEFAULT 'Cold', -- Hot, Warm, Cold
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_lead_status (lead_status),
    INDEX idx_lead_score (lead_score),
    INDEX idx_lead_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Appointments Table (Meeting Slots & Confirmations)
CREATE TABLE IF NOT EXISTS appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lead_id INT NOT NULL,
    date DATE NOT NULL,
    time VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'Scheduled', -- Scheduled, Completed, Cancelled
    meeting_link VARCHAR(500),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    INDEX idx_appointment_lead (lead_id),
    INDEX idx_appointment_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Conversations Table (Message Log, Agent Routing & Tool History)
CREATE TABLE IF NOT EXISTS conversations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lead_id INT,
    session_id VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    sender VARCHAR(50) NOT NULL, -- customer, assistant, system
    agent_used VARCHAR(100),     -- IntentAgent, LeadAgent, KnowledgeAgent, AppointmentAgent, FollowupAgent
    tools_called TEXT,           -- JSON array of tools triggered
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
    INDEX idx_conversation_lead (lead_id),
    INDEX idx_conversation_session (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Documents Table (Uploaded Knowledge Base Assets)
CREATE TABLE IF NOT EXISTS documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500),
    file_size INT,
    chunk_count INT DEFAULT 0,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_doc_filename (filename)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Evaluations Table (Automated Multi-Agent Test Harness & Metrics)
CREATE TABLE IF NOT EXISTS evaluations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT,
    test_case_name VARCHAR(255),
    intent_accuracy FLOAT NOT NULL DEFAULT 0.0,
    tool_accuracy FLOAT NOT NULL DEFAULT 0.0,
    hallucination_score FLOAT NOT NULL DEFAULT 0.0, -- Lower is better (0.0 = zero hallucination)
    response_relevance FLOAT NOT NULL DEFAULT 0.0,
    qualification_completeness FLOAT NOT NULL DEFAULT 0.0,
    overall_score FLOAT NOT NULL DEFAULT 0.0,
    status VARCHAR(50) DEFAULT 'PASS', -- PASS, FAIL, WARNING
    execution_time_ms FLOAT DEFAULT 0.0,
    details TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL,
    INDEX idx_eval_status (status),
    INDEX idx_eval_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
