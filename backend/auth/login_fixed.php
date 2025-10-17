<?php
// Add error reporting to see any PHP errors
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Set headers to allow communication between frontend and backend
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Log that the file was reached
error_log("login_fixed.php was accessed");

try {
    // Check if we can include the database file
    if (!file_exists('../config/database.php')) {
        throw new Exception("Database config file not found at: " . realpath('../config/database.php'));
    }
    
    require_once '../config/database.php';
    error_log("Database file included successfully");
    
    // Handle both POST and GET for testing
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        echo json_encode([
            'success' => false, 
            'message' => 'This is the login endpoint. Use POST method.',
            'server_info' => [
                'request_method' => $_SERVER['REQUEST_METHOD'],
                'php_version' => PHP_VERSION,
                'current_time' => date('Y-m-d H:i:s'),
                'file_path' => __FILE__
            ]
        ]);
        exit();
    }
    
    // Only allow POST requests for actual login
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Only POST method allowed']);
        exit();
    }
    
    // Get the data sent from the frontend
    $raw_input = file_get_contents('php://input');
    error_log("Raw input: " . $raw_input);
    
    $input = json_decode($raw_input, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception("Invalid JSON data: " . json_last_error_msg());
    }
    
    // Check if username and password were sent
    if (!isset($input['username']) || !isset($input['password'])) {
        echo json_encode(['success' => false, 'message' => 'Username and password are required']);
        exit();
    }

    $username = trim($input['username']);
    $password = $input['password'];

    // Check if they're not empty
    if (empty($username) || empty($password)) {
        echo json_encode(['success' => false, 'message' => 'Username and password cannot be empty']);
        exit();
    }

    // Connect to database
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        throw new Exception("Could not connect to database");
    }
    
    error_log("Database connected successfully");

    // Look for user in database
    $query = "SELECT id, full_name, username, email, password, role FROM users WHERE username = ?";
    $stmt = $db->prepare($query);
    $stmt->execute([$username]);

    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    // Check if user exists
    if (!$user) {
        echo json_encode(['success' => false, 'message' => 'Try Again']);
        exit();
    }

    // Check if password is correct (simple comparison for now)
    if ($password !== $user['password']) {
        echo json_encode([
            'success' => false, 
            'message' => 'Wrong email or password',
            'debug' => [
                'stored_password' => $user['password'],
                'input_password' => $password,
                'match' => $password === $user['password']
            ]
        ]);
        exit();
    }

    // Login successful! Save user info in session
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['username'] = $user['username'];
    $_SESSION['full_name'] = $user['full_name'];
    $_SESSION['email'] = $user['email'];
    $_SESSION['role'] = $user['role'];

    // Update last login time
    $updateQuery = "UPDATE users SET last_login = NOW() WHERE id = ?";
    $updateStmt = $db->prepare($updateQuery);
    $updateStmt->execute([$user['id']]);

    // Send success response back to frontend
    echo json_encode([
        'success' => true,
        'message' => 'Login successful',
        'user' => [
            'id' => $user['id'],
            'username' => $user['username'],
            'full_name' => $user['full_name'],
            'email' => $user['email'],
            'role' => $user['role']
        ]
    ]);

} catch (Exception $e) {
    // If something goes wrong, send error message
    error_log("Login error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'message' => 'Server error: ' . $e->getMessage(),
        'file' => __FILE__,
        'line' => __LINE__
    ]);
}
?>