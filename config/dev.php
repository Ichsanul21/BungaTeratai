<?php

/**
 * Developer Mode — akun internal (Alenkosa) yang bisa segalanya dan
 * aktivitasnya dipisah ke dev_activity_logs, bukan Jejak Audit klien.
 *
 * Matikan dengan DEV_MODE=false (default): panel & akun developer otomatis
 * tidak bisa dipakai (404) tanpa perlu menghapus data apa pun.
 */
return [
    'enabled' => env('DEV_MODE', false),

    'email' => env('DEV_EMAIL', 'dev@bungateratai.id'),

    'name' => env('DEV_NAME', 'Developer'),

    /** Sesi developer maksimal (jam) sebelum dipaksa keluar. */
    'session_hours' => (int) env('DEV_SESSION_HOURS', 8),

    /** Batas baris log yang ditampilkan panel (maks 2000). */
    'log_lines' => (int) env('DEV_LOG_LINES', 400),
];
