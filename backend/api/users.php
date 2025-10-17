<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/database.php';

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Check if user is authenticated and is admin
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Access denied. Admin privileges required.']);
    exit;
}

try {
    $pdo = Database::getConnection();

    // GET - Get all users
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $stmt = $pdo->prepare("
            SELECT id, full_name, username, email, role, last_login, created_at 
            FROM users 
            ORDER BY created_at DESC
        ");
        $stmt->execute();
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'data' => $users
        ]);
    }

    // POST - Add new user
    elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $full_name = $input['full_name'] ?? '';
        $username = $input['username'] ?? '';
        $email = $input['email'] ?? '';
        $password = $input['password'] ?? '';
        $role = $input['role'] ?? 'pharmacist';

        // Validate input
        if (empty($full_name) || empty($username) || empty($email) || empty($password)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'All fields are required.']);
            exit;
        }

        // Check if username or email already exists
        $checkStmt = $pdo->prepare("SELECT id FROM users WHERE username = ? OR email = ?");
        $checkStmt->execute([$username, $email]);
        if ($checkStmt->fetch()) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Username or email already exists.']);
            exit;
        }

        // Insert new user with plain text password
        $insertStmt = $pdo->prepare("
            INSERT INTO users (full_name, username, email, password, role, created_at) 
            VALUES (?, ?, ?, ?, ?, NOW())
        ");
        
        if ($insertStmt->execute([$full_name, $username, $email, $password, $role])) {
            echo json_encode([
                'success' => true,
                'message' => 'User created successfully.',
                'user_id' => $pdo->lastInsertId()
            ]);
        } else {
            throw new Exception('Failed to create user.');
        }
    }

    // PUT - Update user
    elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $id = $input['id'] ?? 0;
        $full_name = $input['full_name'] ?? '';
        $username = $input['username'] ?? '';
        $email = $input['email'] ?? '';
        $role = $input['role'] ?? 'pharmacist';
        $change_password = $input['change_password'] ?? false;
        $new_password = $input['new_password'] ?? '';

        // Validate input
        if (empty($id) || empty($full_name) || empty($username) || empty($email)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Required fields are missing.']);
            exit;
        }

        // Check if username or email already exists (excluding current user)
        $checkStmt = $pdo->prepare("SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?");
        $checkStmt->execute([$username, $email, $id]);
        if ($checkStmt->fetch()) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Username or email already exists.']);
            exit;
        }

        // Prepare update query
        if ($change_password && !empty($new_password)) {
            $updateStmt = $pdo->prepare("
                UPDATE users 
                SET full_name = ?, username = ?, email = ?, password = ?, role = ? 
                WHERE id = ?
            ");
            $result = $updateStmt->execute([$full_name, $username, $email, $new_password, $role, $id]);
        } else {
            $updateStmt = $pdo->prepare("
                UPDATE users 
                SET full_name = ?, username = ?, email = ?, role = ? 
                WHERE id = ?
            ");
            $result = $updateStmt->execute([$full_name, $username, $email, $role, $id]);
        }

        if ($result) {
            echo json_encode([
                'success' => true,
                'message' => 'User updated successfully.'
            ]);
        } else {
            throw new Exception('Failed to update user.');
        }
    }

    // DELETE - Delete user
    elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        $input = json_decode(file_get_contents('php://input'), true);
        $id = $input['id'] ?? 0;

        // Prevent admin from deleting their own account
        if ($id == $_SESSION['user_id']) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'You cannot delete your own account.']);
            exit;
        }

        $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
        
        if ($stmt->execute([$id])) {
            echo json_encode([
                'success' => true,
                'message' => 'User deleted successfully.'
            ]);
        } else {
            throw new Exception('Failed to delete user.');
        }
    }

} catch (Exception $e) {
    error_log("Users API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error: ' . $e->getMessage()
    ]);
}
?>