<?php

namespace App\Services;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

class AisService
{
    /**
     * Generate mock AIS vessels dalam radius tertentu
     * Simulasi data dari API AIS (facha.dev, MarineTraffic, dll)
     */
    public function getVesselsInRadius(float $lat, float $lng, float $radiusNm): Collection
    {
        $cacheKey = "ais_mock_{$lat}_{$lng}_{$radiusNm}";
        
        return Cache::remember($cacheKey, 60, function() use ($lat, $lng, $radiusNm) {
            // Generate 8-15 kapal mock di alur Sungai Mahakam (bukan acak di daratan).
            $count = rand(8, 15);
            $vessels = [];

            for ($i = 0; $i < $count; $i++) {
                $position = \App\Support\MahakamRiver::positionAt(
                    mt_rand(0, 1000) / 1000,
                    mt_rand(-400, 400),
                    mt_rand(-45, 45),
                );
                $vessels[] = $this->generateMockVessel($position, $i);
            }

            return collect($vessels);
        });
    }
    
    /**
     * Generate 1 mock vessel pada posisi alur yang diberikan.
     *
     * @param  array{0: float, 1: float}  $position  [lat, lng]
     */
    private function generateMockVessel(array $position, int $index): array
    {
        [$positionLat, $positionLng] = $position;

        // Nama kapal realistis (Indonesian + international)
        $shipNames = [
            'MV SAMARINDA PRIMA', 'TB BUNGA TERATAI 7', 'TONGKANG BARGE 205',
            'MV KALIMANTAN STAR', 'TB ORIENTAL DRAGON', 'TONGKANG BARGE 308',
            'MV BALIKPAPAN JAYA', 'TB SEA HAWK', 'TONGKANG BARGE 412',
            'MV MAHAKAM RIVER', 'TB PACIFIC VOYAGER', 'TONGKANG BARGE 516',
            'MV BORNEO SPIRIT', 'TB NAVIGATOR', 'TONGKANG BARGE 620',
            'MV EAGLE EYE', 'TB MARINER', 'TONGKANG BARGE 724',
        ];
        
        // Jenis kapal dengan kode AIS
        $vesselTypes = [
            'Cargo Ship' => 70,
            'Tug' => 52,
            'Tanker' => 80,
            'Passenger Ship' => 60,
            'Fishing Vessel' => 30,
            'Container Ship' => 71,
            'Bulk Carrier' => 79,
        ];
        
        $typeKeys = array_keys($vesselTypes);
        $randomType = $typeKeys[array_rand($typeKeys)];
        
        // Destinations di perairan Mahakam / Kalimantan Timur
        $ports = ['SAMARINDA', 'MUARA BADAK', 'MUARA BERAU', 'TENGGARONG', 'LOA JANAN',
                  'BALIKPAPAN', 'BONTANG', 'TANJUNG BARA'];
        
        $destination = $ports[array_rand($ports)];
        
        // ETA realistis (0-5 hari dari sekarang)
        $days = rand(0, 5);
        $hours = rand(0, 23);
        $eta = now()->addDays($days)->addHours($hours)->format('m-d H:i');

        $speed = round(mt_rand(0, 200) / 10, 1); // 0-20 knots
        $navStatus = $speed > 0.5
            ? 'Underway Using Engine'
            : (rand(0, 1) === 1 ? 'At Anchor' : 'Moored');

        return [
            'mmsi' => (string)(500000000 + $index * 1234 + rand(0, 999)),
            'imo' => rand(9000000, 9999999),
            'vessel_name' => $shipNames[array_rand($shipNames)] . ' ' . rand(1, 99),
            'call_sign' => 'YX' . rand(1000, 9999),
            'vessel_type' => $randomType,
            'vessel_type_code' => $vesselTypes[$randomType],
            'latitude' => $positionLat,
            'longitude' => $positionLng,
            'speed' => $speed,
            'course' => round(mt_rand(0, 3600) / 10, 1), // 0-360°
            'heading' => rand(0, 359),
            'draught' => round(10 + (mt_rand(0, 150) / 10), 1), // 10.0-25.0 m
            'nav_status' => $navStatus,
            'source' => 'Terrestrial', // AIS darat; tetap data simulasi
            'destination' => $destination,
            'eta' => $eta,
            'last_seen_at' => now()->subMinutes(rand(0, 30))->toIso8601String(),
        ];
    }
    
    /**
     * Match AIS vessel dengan fleet vessel berdasarkan MMSI/IMO
     */
    public function matchWithFleet(Collection $aisVessels, Collection $fleetVessels): array
    {
        $matched = [];
        $unmatched = [];
        
        foreach ($aisVessels as $ais) {
            $fleetMatch = $fleetVessels->first(function($vessel) use ($ais) {
                return ($vessel->mmsi && $vessel->mmsi === $ais['mmsi']) ||
                       ($vessel->imo && $vessel->imo === $ais['imo']);
            });
            
            if ($fleetMatch) {
                $matched[] = [
                    'ais_data' => $ais,
                    'fleet_vessel' => $fleetMatch,
                ];
            } else {
                $unmatched[] = $ais;
            }
        }
        
        return [
            'matched' => $matched,
            'unmatched' => $unmatched,
        ];
    }
}
