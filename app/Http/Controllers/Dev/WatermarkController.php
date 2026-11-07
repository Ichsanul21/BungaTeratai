<?php

namespace App\Http\Controllers\Dev;

use App\Http\Controllers\Controller;
use App\Services\Dev\DevActivityService;
use App\Services\WatermarkService;
use Illuminate\Http\Request;

class WatermarkController extends Controller
{
    public function update(Request $request)
    {
        $data = $request->validate([
            'enabled' => ['required', 'boolean'],
            'line1' => ['required', 'string', 'max:140'],
            'line2' => ['required', 'string', 'max:140'],
            'opacity' => ['required', 'numeric', 'min:0.01', 'max:0.35'],
            'speed' => ['required', 'integer', 'min:10', 'max:240'],
            'angle' => ['required', 'integer', 'min:-60', 'max:60'],
            'font_size' => ['required', 'integer', 'min:8', 'max:24'],
            'color' => ['required', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'show_login' => ['required', 'boolean'],
            'pdf_enabled' => ['required', 'boolean'],
        ]);

        $before = WatermarkService::get();
        $config = WatermarkService::save($data);

        DevActivityService::log(
            'watermark_updated',
            'setting',
            null,
            $before,
            $config,
            'Watermark diperbarui',
        );

        return back()->with('success', 'Pengaturan watermark disimpan.');
    }

    public function reset()
    {
        $before = WatermarkService::get();
        $config = WatermarkService::reset();

        DevActivityService::log(
            'watermark_reset',
            'setting',
            null,
            $before,
            $config,
            'Watermark dikembalikan ke default',
        );

        return back()->with('success', 'Watermark dikembalikan ke pengaturan default.');
    }
}
