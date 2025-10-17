<?php
// Add error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Include database config to start session
require_once '../config/database.php';

try {
    // Check if user is logged in by checking session
    if (isset($_SESSION['user_id']) && isset($_SESSION['username'])) {
        // User is logged in
        echo json_encode([
            'success' => true,
            'message' => 'User is authenticated',
            'user' => [
                'id' => $_SESSION['user_id'],
                'username' => $_SESSION['username'],
                'full_name' => $_SESSION['full_name'],
                'email' => $_SESSION['email'],
                'role' => $_SESSION['role']
            ]
        ]);
    } else {
        // User is not logged in
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'message' => 'User not authenticated',
            'session_data' => [
                'session_started' => session_status() === PHP_SESSION_ACTIVE,
                'session_id' => session_id(),
                'has_user_id' => isset($_SESSION['user_id']),
                'session_keys' => array_keys($_SESSION ?? [])
            ]
        ]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'message' => 'Server error: ' . $e->getMessage()
    ]);
}
?>