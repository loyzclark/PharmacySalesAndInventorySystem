<?php
// This file connects to our MySQL database
class Database {
    // Database settings - change these if your setup is different
    private static $host = 'localhost';
    private static $db_name = 'pharmacy_management';
    private static $username = 'root';
    private static $password = '';  // Default XAMPP has no password

    // Function to connect to database - now static
    public static function getConnection() {
        $conn = null;

        try {
            // Create connection using PDO
            $conn = new PDO(
                "mysql:host=" . self::$host . ";dbname=" . self::$db_name, 
                self::$username, 
                self::$password
            );
            
            // Set character encoding
            $conn->exec("set names utf8");
            
            // Set error mode to exceptions
            $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            
        } catch(PDOException $exception) {
            error_log("Database connection error: " . $exception->getMessage());
            throw new Exception("Database connection failed: " . $exception->getMessage());
        }

        return $conn;
    }
}

// Start PHP session for login (only if not already started)
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
?>