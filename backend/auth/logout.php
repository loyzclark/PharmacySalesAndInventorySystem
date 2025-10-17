<?php
// Add error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Include database config to access session
require_once '../config/database.php';

try {
    // Log the logout attempt
    error_log("Logout attempt for session ID: " . session_id());
    
    if (isset($_SESSION['username'])) {
        $username = $_SESSION['username'];
        error_log("Logging out user: " . $username);
    }
    
    // Destroy all session data
    session_unset();
    session_destroy();
    
    // Start a new session (clean slate)
    session_start();
    session_regenerate_id(true);
    
    echo json_encode([
        'success' => true,
        'message' => 'Logged out successfully'
    ]);
    
    error_log("Logout successful");

} catch (Exception $e) {
    error_log("Logout error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'message' => 'Logout error: ' . $e->getMessage()
    ]);
}
?>