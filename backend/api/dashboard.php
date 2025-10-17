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
    
    // Get dashboard statistics
    $dashboardData = getDashboardStats($db);
    
    echo json_encode([
        'success' => true,
        'data' => $dashboardData
    ]);
    
} catch (Exception $e) {
    error_log("Dashboard API error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
}

function getDashboardStats($db) {
    try {
        error_log("🔍 DEBUG: Calculating dashboard statistics");
        
        // Get the most recent sale date to use as "today" for consistency
        $recentDateQuery = "SELECT MAX(sale_date) as recent_date FROM sales LIMIT 1";
        $recentDateStmt = $db->prepare($recentDateQuery);
        $recentDateStmt->execute();
        $recentDate = $recentDateStmt->fetch(PDO::FETCH_ASSOC)['recent_date'];
        
        // If no sales exist, use current date
        if (!$recentDate) {
            $recentDate = date('Y-m-d');
        }
        
        error_log("🔍 DEBUG: Dashboard using reference date: " . $recentDate);
        
        // Get total medicines count
        $totalMedicinesQuery = "SELECT COUNT(*) as count FROM medicines";
        $totalMedicinesStmt = $db->prepare($totalMedicinesQuery);
        $totalMedicinesStmt->execute();
        $totalMedicines = $totalMedicinesStmt->fetch(PDO::FETCH_ASSOC)['count'];
        
        // Get low stock count
        $lowStockQuery = "SELECT COUNT(*) as count FROM medicines WHERE stock_quantity <= reorder_level";
        $lowStockStmt = $db->prepare($lowStockQuery);
        $lowStockStmt->execute();
        $lowStockCount = $lowStockStmt->fetch(PDO::FETCH_ASSOC)['count'];
        
        // Get stock alerts (low stock + expiring)
        $alertsQuery = "
            SELECT COUNT(*) as count FROM medicines 
            WHERE stock_quantity <= reorder_level 
            OR expiry_date <= DATE_ADD(CURDATE(), INTERVAL 90 DAY)
        ";
        $alertsStmt = $db->prepare($alertsQuery);
        $alertsStmt->execute();
        $stockAlerts = $alertsStmt->fetch(PDO::FETCH_ASSOC)['count'];
        
        // Get today's sales revenue and transaction count - USE SAME LOGIC AS SALES.PHP
        $todaySalesQuery = "
            SELECT 
                COALESCE(SUM(total_amount), 0) as total_revenue,
                COUNT(*) as transaction_count
            FROM sales 
            WHERE DATE(sale_date) = DATE(?)
        ";
        $todaySalesStmt = $db->prepare($todaySalesQuery);
        $todaySalesStmt->execute([$recentDate]);
        $todaySalesData = $todaySalesStmt->fetch(PDO::FETCH_ASSOC);
        $todaySales = $todaySalesData['total_revenue'];
        $todayTransactions = $todaySalesData['transaction_count'];
        
        error_log("🔍 DEBUG: Dashboard today sales - revenue: " . $todaySales . ", transactions: " . $todayTransactions);
        
        // Get recent activity (recently updated medicines)
        $recentActivityQuery = "
            SELECT 
                m.name,
                m.stock_quantity,
                m.reorder_level,
                m.updated_at,
                c.name as category_name,
                CASE 
                    WHEN m.expiry_date < CURDATE() THEN 'Expired'
                    WHEN m.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 90 DAY) THEN 'Expiring Soon'
                    WHEN m.stock_quantity <= m.reorder_level THEN 'Low Stock'
                    WHEN m.stock_quantity > m.reorder_level THEN 'In Stock'
                    ELSE 'Unknown'
                END as status
            FROM medicines m
            LEFT JOIN categories c ON m.category_id = c.id
            ORDER BY m.updated_at DESC
            LIMIT 10
        ";
        
        $recentActivityStmt = $db->prepare($recentActivityQuery);
        $recentActivityStmt->execute();
        $recentActivity = $recentActivityStmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get inventory value
        $inventoryValueQuery = "SELECT SUM(stock_quantity * unit_price) as total_value FROM medicines";
        $inventoryValueStmt = $db->prepare($inventoryValueQuery);
        $inventoryValueStmt->execute();
        $inventoryValue = $inventoryValueStmt->fetch(PDO::FETCH_ASSOC)['total_value'] ?? 0;
        
        return [
            'statistics' => [
                'total_medicines' => (int)$totalMedicines,
                'low_stock_count' => (int)$lowStockCount,
                'stock_alerts_count' => (int)$stockAlerts,
                'today_sales' => (float)$todaySales,
                'today_transactions' => (int)$todayTransactions,
                'inventory_value' => (float)$inventoryValue
            ],
            'recent_activity' => $recentActivity
        ];
        
    } catch (Exception $e) {
        error_log("❌ ERROR in getDashboardStats: " . $e->getMessage());
        throw $e;
    }
}
?>