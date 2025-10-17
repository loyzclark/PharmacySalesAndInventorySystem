<?php
// Add error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Set headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
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
            handleGetInventory($db);
            break;
            
        case 'POST':
            handleAddMedicine($db, $input);
            break;
            
        case 'PUT':
            handleUpdateMedicine($db, $input);
            break;
            
        case 'DELETE':
            handleDeleteMedicine($db, $input);
            break;
            
        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    }
    
} catch (Exception $e) {
    error_log("Inventory API error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
}

// Get all medicines with inventory data
function handleGetInventory($db) {
    try {
        $query = "
            SELECT 
                m.id,
                m.name,
                m.generic_name,
                m.brand,
                m.dosage,
                m.unit_price,
                m.stock_quantity,
                m.reorder_level,
                m.batch_number,
                m.expiry_date,
                m.supplier,
                m.created_at,
                m.updated_at,
                c.name as category_name,
                c.color as category_color,
                CASE 
                    WHEN m.expiry_date < CURDATE() THEN 'expired'
                    WHEN m.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 90 DAY) THEN 'expiring'
                    WHEN m.stock_quantity <= m.reorder_level THEN 'low-stock'
                    WHEN m.stock_quantity > m.reorder_level THEN 'in-stock'
                    ELSE 'unknown'
                END as status
            FROM medicines m
            LEFT JOIN categories c ON m.category_id = c.id
            ORDER BY m.name
        ";
        
        $stmt = $db->prepare($query);
        $stmt->execute();
        $medicines = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get inventory summary
        $summaryQuery = "
            SELECT 
                COUNT(*) as total_medicines,
                SUM(stock_quantity) as total_stock,
                SUM(stock_quantity * unit_price) as total_value,
                SUM(CASE WHEN stock_quantity <= reorder_level THEN 1 ELSE 0 END) as low_stock_count,
                COUNT(DISTINCT category_id) as categories_count
            FROM medicines
            WHERE stock_quantity >= 0
        ";
        
        $summaryStmt = $db->prepare($summaryQuery);
        $summaryStmt->execute();
        $summary = $summaryStmt->fetch(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'data' => [
                'medicines' => $medicines,
                'summary' => $summary
            ]
        ]);
        
    } catch (Exception $e) {
        throw $e;
    }
}

// Add new medicine
// Add new medicine
function handleAddMedicine($db, $input) {
    try {
        // Validate required fields
        if (empty($input['name']) || empty($input['unit_price']) || !isset($input['stock_quantity'])) {
            echo json_encode(['success' => false, 'message' => 'Name, unit price, and stock quantity are required']);
            return;
        }
        
        // Get category ID if category name is provided
        $categoryId = null;
        if (!empty($input['category'])) {
            $catQuery = "SELECT id FROM categories WHERE name = ?";
            $catStmt = $db->prepare($catQuery);
            $catStmt->execute([$input['category']]);
            $category = $catStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($category) {
                $categoryId = $category['id'];
            } else {
                // Create new category if it doesn't exist
                $createCatQuery = "INSERT INTO categories (name, description) VALUES (?, ?)";
                $createCatStmt = $db->prepare($createCatQuery);
                $createCatStmt->execute([$input['category'], 'Auto-created category']);
                $categoryId = $db->lastInsertId();
            }
        }
        
        // Insert medicine - FIXED THE SQL SYNTAX ERROR
        $query = "
            INSERT INTO medicines 
            (name, generic_name, brand, category_id, dosage, unit_price, stock_quantity, reorder_level, batch_number, expiry_date, supplier)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ";
        
        $stmt = $db->prepare($query);
        $result = $stmt->execute([
            $input['name'],
            $input['generic_name'] ?? null,
            $input['brand'] ?? null,
            $categoryId,
            $input['dosage'] ?? null,
            $input['unit_price'],
            $input['stock_quantity'],
            $input['reorder_level'] ?? 10,
            $input['batch_number'] ?? null,   
            !empty($input['expiry_date']) ? $input['expiry_date'] : null,
            $input['supplier'] ?? null
        ]);
        
        if ($result) {
            $medicineId = $db->lastInsertId();
            echo json_encode([
                'success' => true,
                'message' => 'Medicine added successfully',
                'medicine_id' => $medicineId
            ]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to add medicine']);
        }
        
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Error adding medicine: ' . $e->getMessage()]);
    }
}

// Update medicine
function handleUpdateMedicine($db, $input) {
    try {
        if (empty($input['id'])) {
            echo json_encode(['success' => false, 'message' => 'Medicine ID is required']);
            return;
        }
        
        // Get category ID if category name is provided
        $categoryId = null;
        if (!empty($input['category'])) {
            $catQuery = "SELECT id FROM categories WHERE name = ?";
            $catStmt = $db->prepare($catQuery);
            $catStmt->execute([$input['category']]);
            $category = $catStmt->fetch(PDO::FETCH_ASSOC);
            $categoryId = $category ? $category['id'] : null;
        }
        
        $query = "
            UPDATE medicines 
            SET name = ?, generic_name = ?, brand = ?, category_id = ?, dosage = ?, 
                unit_price = ?, stock_quantity = ?, reorder_level = ?, batch_number = ?, expiry_date = ?, 
                supplier = ?, updated_at = NOW()
            WHERE id = ?
        ";
        
        $stmt = $db->prepare($query);
        $result = $stmt->execute([
            $input['name'],
            $input['generic_name'] ?? null,
            $input['brand'] ?? null,
            $categoryId,
            $input['dosage'] ?? null,
            $input['unit_price'],
            $input['stock_quantity'],
            $input['reorder_level'] ?? 10,
            $input['batch_number'] ?? null,
            !empty($input['expiry_date']) ? $input['expiry_date'] : null,
            $input['supplier'] ?? null,
            $input['id']
        ]);
        
        if ($result) {
            echo json_encode(['success' => true, 'message' => 'Medicine updated successfully']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to update medicine']);
        }
        
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Error updating medicine: ' . $e->getMessage()]);
    }
}

// Delete medicine
// Delete medicine
// Delete medicine (with related sale_items)
function handleDeleteMedicine($db, $input) {
    try {
        if (empty($input['id'])) {
            echo json_encode(['success' => false, 'message' => 'Medicine ID is required']);
            return;
        }
        
        $medicineId = $input['id'];
        
        // Start transaction
        $db->beginTransaction();
        
        // First check if medicine exists
        $checkQuery = "SELECT id, name FROM medicines WHERE id = ?";
        $checkStmt = $db->prepare($checkQuery);
        $checkStmt->execute([$medicineId]);
        $medicine = $checkStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$medicine) {
            echo json_encode(['success' => false, 'message' => 'Medicine not found']);
            return;
        }
        
        // Delete related sale_items first
        $deleteSalesQuery = "DELETE FROM sale_items WHERE medicine_id = ?";
        $deleteSalesStmt = $db->prepare($deleteSalesQuery);
        $deleteSalesStmt->execute([$medicineId]);
        
        // Delete the medicine
        $deleteQuery = "DELETE FROM medicines WHERE id = ?";
        $deleteStmt = $db->prepare($deleteQuery);
        $deleteStmt->execute([$medicineId]);
        
        // Check if any row was affected
        if ($deleteStmt->rowCount() === 0) {
            $db->rollBack();
            echo json_encode(['success' => false, 'message' => 'Medicine not found or already deleted']);
            return;
        }
        
        // Commit transaction
        $db->commit();
        
        echo json_encode([
            'success' => true, 
            'message' => 'Medicine "' . $medicine['name'] . '" and all related sales records deleted successfully'
        ]);
        
    } catch (Exception $e) {
        $db->rollBack();
        error_log("Delete medicine error: " . $e->getMessage());
        echo json_encode(['success' => false, 'message' => 'Error deleting medicine: ' . $e->getMessage()]);
    }
}
?>