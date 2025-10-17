<?php
// Add error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Include database config
require_once '../config/database.php';

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Not authenticated']);
    exit();
}

try {
    $database = new Database();
    $db = $database->getConnection();
    
    $method = $_SERVER['REQUEST_METHOD'];
    $input = json_decode(file_get_contents('php://input'), true);
    
    switch ($method) {
        case 'GET':
            handleGetSales($db);
            break;
            
        case 'POST':
            handleCreateSale($db, $input);
            break;
            
        case 'DELETE':
            handleDeleteSale($db, $input);
            break;
            
        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    }
    
} catch (Exception $e) {
    error_log("Sales API error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
}

// Get sales data with statistics
// In handleGetSales function, replace the sales query:
function handleGetSales($db) {
    try {
        // Get sales statistics
        $statistics = getSalesStatistics($db);
        
        // Get recent sales with details and sequential numbering
        $salesQuery = "
            SELECT 
                s.id,
                s.customer_name,
                s.total_amount,
                s.sale_date,
                s.created_at,
                u.full_name as cashier_name,
                COUNT(si.id) as items_count,
                (@row_number := @row_number + 1) as display_number
            FROM sales s
            CROSS JOIN (SELECT @row_number := 0) r
            LEFT JOIN users u ON s.user_id = u.id
            LEFT JOIN sale_items si ON s.id = si.sale_id
            GROUP BY s.id
            ORDER BY s.created_at DESC
            LIMIT 50
        ";
        
        $salesStmt = $db->prepare($salesQuery);
        $salesStmt->execute();
        $sales = $salesStmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'data' => [
                'statistics' => $statistics,
                'sales' => $sales
            ]
        ]);
        
    } catch (Exception $e) {
        throw $e;
    }
}

// Get sales statistics
// Get sales statistics - FIXED VERSION
// Get sales statistics - PRODUCTION VERSION
function getSalesStatistics($db) {
    try {
        // Get the most recent sale date to use as "today" for demo purposes
        $recentDateQuery = "SELECT MAX(sale_date) as recent_date FROM sales LIMIT 1";
        $recentDateStmt = $db->prepare($recentDateQuery);
        $recentDateStmt->execute();
        $recentDate = $recentDateStmt->fetch(PDO::FETCH_ASSOC)['recent_date'];
        
        // If no sales exist, use current date
        if (!$recentDate) {
            $recentDate = date('Y-m-d');
        }
        
        error_log("🔍 DEBUG: Using reference date: " . $recentDate);
        
        // Today's sales (based on most recent sale date)
        $todayQuery = "SELECT COALESCE(SUM(total_amount), 0) as total, COUNT(*) as count 
                       FROM sales WHERE DATE(sale_date) = DATE(?)";
        $todayStmt = $db->prepare($todayQuery);
        $todayStmt->execute([$recentDate]);
        $today = $todayStmt->fetch(PDO::FETCH_ASSOC);
        
        // This week's sales (week of most recent sale)
        $weekQuery = "SELECT COALESCE(SUM(total_amount), 0) as total, COUNT(*) as count 
                      FROM sales WHERE YEARWEEK(sale_date, 1) = YEARWEEK(?, 1)";
        $weekStmt = $db->prepare($weekQuery);
        $weekStmt->execute([$recentDate]);
        $week = $weekStmt->fetch(PDO::FETCH_ASSOC);
        
        // This month's sales (month of most recent sale)
        $monthQuery = "SELECT COALESCE(SUM(total_amount), 0) as total, COUNT(*) as count 
                       FROM sales WHERE MONTH(sale_date) = MONTH(?) 
                       AND YEAR(sale_date) = YEAR(?)";
        $monthStmt = $db->prepare($monthQuery);
        $monthStmt->execute([$recentDate, $recentDate]);
        $month = $monthStmt->fetch(PDO::FETCH_ASSOC);
        
        // All time sales
        $allTimeQuery = "SELECT COALESCE(SUM(total_amount), 0) as total, COUNT(*) as count FROM sales";
        $allTimeStmt = $db->prepare($allTimeQuery);
        $allTimeStmt->execute();
        $allTime = $allTimeStmt->fetch(PDO::FETCH_ASSOC);
        
        error_log("🔍 DEBUG: Stats - Today: {$today['total']}, Week: {$week['total']}, Month: {$month['total']}");
        
        return [
            'today' => [
                'revenue' => (float)$today['total'],
                'transactions' => (int)$today['count']
            ],
            'week' => [
                'revenue' => (float)$week['total'],
                'transactions' => (int)$week['count']
            ],
            'month' => [
                'revenue' => (float)$month['total'],
                'transactions' => (int)$month['count']
            ],
            'all_time' => [
                'revenue' => (float)$allTime['total'],
                'transactions' => (int)$allTime['count']
            ]
        ];
        
    } catch (Exception $e) {
        error_log("❌ ERROR in getSalesStatistics: " . $e->getMessage());
        throw $e;
    }
}

// Create new sale
function handleCreateSale($db, $input) {
    try {
        // Validate input
        if (empty($input['items']) || !is_array($input['items'])) {
            echo json_encode(['success' => false, 'message' => 'Sale items are required']);
            return;
        }
        
        if (empty($input['sale_date'])) {
            echo json_encode(['success' => false, 'message' => 'Sale date is required']);
            return;
        }
        
        // Start transaction
        $db->beginTransaction();
        
        // Calculate total amount
        $totalAmount = 0;
        foreach ($input['items'] as $item) {
            $totalAmount += $item['quantity'] * $item['unit_price'];
        }
        
        // Insert sale record
        $saleQuery = "INSERT INTO sales (customer_name, total_amount, sale_date, user_id) 
                      VALUES (?, ?, ?, ?)";
        $saleStmt = $db->prepare($saleQuery);
        $saleStmt->execute([
            $input['customer_name'] ?? 'Walk-in Customer',
            $totalAmount,
            $input['sale_date'],
            $_SESSION['user_id']
        ]);
        
        $saleId = $db->lastInsertId();
        
        // Insert sale items and update stock
        foreach ($input['items'] as $item) {
            // Insert sale item
            $itemQuery = "INSERT INTO sale_items (sale_id, medicine_id, quantity, unit_price, total_price) 
                          VALUES (?, ?, ?, ?, ?)";
            $itemStmt = $db->prepare($itemQuery);
            $totalPrice = $item['quantity'] * $item['unit_price'];
            $itemStmt->execute([
                $saleId,
                $item['medicine_id'],
                $item['quantity'],
                $item['unit_price'],
                $totalPrice
            ]);
            
            // Update medicine stock
            $updateStockQuery = "UPDATE medicines SET stock_quantity = stock_quantity - ? WHERE id = ?";
            $updateStockStmt = $db->prepare($updateStockQuery);
            $updateStockStmt->execute([$item['quantity'], $item['medicine_id']]);
            
            // Check if stock is sufficient
            $checkStockQuery = "SELECT stock_quantity FROM medicines WHERE id = ?";
            $checkStockStmt = $db->prepare($checkStockQuery);
            $checkStockStmt->execute([$item['medicine_id']]);
            $stock = $checkStockStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($stock['stock_quantity'] < 0) {
                $db->rollBack();
                echo json_encode(['success' => false, 'message' => 'Insufficient stock for one or more items']);
                return;
            }
        }
        
        // Commit transaction
        $db->commit();
        
        echo json_encode([
            'success' => true,
            'message' => 'Sale completed successfully',
            'sale_id' => $saleId
        ]);
        
    } catch (Exception $e) {
        $db->rollBack();
        echo json_encode(['success' => false, 'message' => 'Error creating sale: ' . $e->getMessage()]);
    }
}

// Delete sale
function handleDeleteSale($db, $input) {
    try {
        if (empty($input['id'])) {
            echo json_encode(['success' => false, 'message' => 'Sale ID is required']);
            return;
        }
        
        // Start transaction
        $db->beginTransaction();
        
        // Get sale items to restore stock
        $itemsQuery = "SELECT medicine_id, quantity FROM sale_items WHERE sale_id = ?";
        $itemsStmt = $db->prepare($itemsQuery);
        $itemsStmt->execute([$input['id']]);
        $items = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Restore stock for each item
        foreach ($items as $item) {
            $restoreStockQuery = "UPDATE medicines SET stock_quantity = stock_quantity + ? WHERE id = ?";
            $restoreStockStmt = $db->prepare($restoreStockQuery);
            $restoreStockStmt->execute([$item['quantity'], $item['medicine_id']]);
        }
        
        // Delete sale (will cascade delete sale_items)
        $deleteSaleQuery = "DELETE FROM sales WHERE id = ?";
        $deleteSaleStmt = $db->prepare($deleteSaleQuery);
        $deleteSaleStmt->execute([$input['id']]);
        
        // Commit transaction
        $db->commit();
        
        echo json_encode(['success' => true, 'message' => 'Sale deleted successfully']);
        
    } catch (Exception $e) {
        $db->rollBack();
        echo json_encode(['success' => false, 'message' => 'Error deleting sale: ' . $e->getMessage()]);
    }
}
?>