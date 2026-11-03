<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Vessel;
use App\Services\AisService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AisController extends Controller
{
    public function radius(Request $request, AisService $aisService): JsonResponse
    {
        $validated = $request->validate([
            'lat' => 'required|numeric|between:-90,90',
            'lng' => 'required|numeric|between:-180,180',
            'radius' => 'required|numeric|min:1|max:100',
        ]);
        
        $aisVessels = $aisService->getVesselsInRadius(
            $validated['lat'],
            $validated['lng'],
            $validated['radius']
        );
        
        $fleetVessels = Vessel::whereNotNull('mmsi')
            ->orWhereNotNull('imo')
            ->get();
        
        $matching = $aisService->matchWithFleet($aisVessels, $fleetVessels);
        
        return response()->json([
            'ais_vessels' => $matching['unmatched'],
            'matched_vessels' => $matching['matched'],
            'count' => $aisVessels->count(),
            'timestamp' => now()->toIso8601String(),
        ]);
    }
}
