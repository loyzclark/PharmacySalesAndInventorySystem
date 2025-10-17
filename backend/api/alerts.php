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
    
    // Get filter parameter if provided
    $filter = $_GET['filter'] ?? 'all';
    
    // Get alerts data
    $alertsData = getStockAlerts($db, $filter);
    
    echo json_encode([
        'success' => true,
        'data' => $alertsData
    ]);
    
} catch (Exception $e) {
    error_log("Stock Alerts API error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
}

function getStockAlerts($db, $filter) {
    try {
        // Base query to get all medicines with alert conditions
        $baseQuery = "
            SELECT 
                m.id,
                m.name,
                m.generic_name,
                m.brand,
                m.stock_quantity,
                m.reorder_level,
                m.unit_price,
                m.expiry_date,
                m.supplier,
                c.name as category_name,
                c.color as category_color,
                CASE 
                    WHEN m.expiry_date < CURDATE() THEN 'expired'
                    WHEN m.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 90 DAY) THEN 'expiring'
                    WHEN m.stock_quantity <= m.reorder_level THEN 'low-stock'
                    ELSE 'normal'
                END as alert_type,
                CASE 
                    WHEN m.expiry_date < CURDATE() THEN 'Critical'
                    WHEN m.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 'High'
                    WHEN m.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 90 DAY) THEN 'Medium'
                    WHEN m.stock_quantity <= m.reorder_level THEN 'Medium'
                    ELSE 'Low'
                END as priority,
                DATEDIFF(m.expiry_date, CURDATE()) as days_to_expiry
            FROM medicines m
            LEFT JOIN categories c ON m.category_id = c.id
        ";
        
        // Apply filter conditions
        $whereConditions = [];
        $params = [];
        
        switch ($filter) {
            case 'critical':
                $whereConditions[] = "(m.expiry_date < CURDATE() OR (m.stock_quantity <= m.reorder_level AND m.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)))";
                break;
            case 'lowstock':
                $whereConditions[] = "m.stock_quantity <= m.reorder_level";
                break;
            case 'expiring':
                $whereConditions[] = "m.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 90 DAY) AND m.expiry_date >= CURDATE()";
                break;
            case 'all':
            default:
                $whereConditions[] = "(m.stock_quantity <= m.reorder_level OR m.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 90 DAY))";
                break;
        }
        
        // Build final query
        $query = $baseQuery;
        if (!empty($whereConditions)) {
            $query .= " WHERE " . implode(" AND ", $whereConditions);
        }
        $query .= " ORDER BY 
            CASE 
                WHEN m.expiry_date < CURDATE() THEN 1
                WHEN m.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 2
                WHEN m.stock_quantity <= m.reorder_level THEN 3
                ELSE 4
            END,
            m.expiry_date ASC, m.stock_quantity ASC";
        
        $stmt = $db->prepare($query);
        $stmt->execute($params);
        $alerts = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get summary counts
        $summaryData = getAlertsSummary($db);
        
        return [
            'alerts' => $alerts,
            'summary' => $summaryData,
            'filter' => $filter
        ];
        
    } catch (Exception $e) {
        throw $e;
    }
}

function getAlertsSummary($db) {
    try {
        // Get critical alerts count (expired + low stock & expiring soon)
        $criticalQuery = "
            SELECT COUNT(*) as count FROM medicines 
            WHERE expiry_date < CURDATE() 
            OR (stock_quantity <= reorder_level AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY))
        ";
        $criticalStmt = $db->prepare($criticalQuery);
        $criticalStmt->execute();
        $criticalCount = $criticalStmt->fetch(PDO::FETCH_ASSOC)['count'];
        
        // Get low stock count
        $lowStockQuery = "SELECT COUNT(*) as count FROM medicines WHERE stock_quantity <= reorder_level";
        $lowStockStmt = $db->prepare($lowStockQuery);
        $lowStockStmt->execute();
        $lowStockCount = $lowStockStmt->fetch(PDO::FETCH_ASSOC)['count'];
        
        // Get expiring soon count (within 90 days, not expired)
        $expiringQuery = "
            SELECT COUNT(*) as count FROM medicines 
            WHERE expiry_date <= DATE_ADD(CURDATE(), INTERVAL 90 DAY) 
            AND expiry_date >= CURDATE()
        ";
        $expiringStmt = $db->prepare($expiringQuery);
        $expiringStmt->execute();
        $expiringCount = $expiringStmt->fetch(PDO::FETCH_ASSOC)['count'];
        
        // Get total alerts count
        $totalQuery = "
            SELECT COUNT(*) as count FROM medicines 
            WHERE stock_quantity <= reorder_level 
            OR expiry_date <= DATE_ADD(CURDATE(), INTERVAL 90 DAY)
        ";
        $totalStmt = $db->prepare($totalQuery);
        $totalStmt->execute();
        $totalCount = $totalStmt->fetch(PDO::FETCH_ASSOC)['count'];
        
        return [
            'critical_alerts' => (int)$criticalCount,
            'low_stock_alerts' => (int)$lowStockCount,
            'expiring_alerts' => (int)$expiringCount,
            'total_alerts' => (int)$totalCount
        ];
        
    } catch (Exception $e) {
        throw $e;
    }
}
?>