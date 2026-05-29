<?php
declare(strict_types=1);

// Usage: php DataBase/tools/generate_password_hash.php "Test@2026"
$password = $argv[1] ?? 'Test@2026';
echo password_hash($password, PASSWORD_DEFAULT), PHP_EOL;
