<?php

// Alur Sungai Mahakam (reach Samarinda) untuk data demo.
//
// Sumber geometri: OpenStreetMap way 42858247 (waterway=river, name=Sungai
// Mahakam), diambil pada 2026-11-03. Titik-titik ini adalah centerline alur —
// dipakai App\Support\MahakamRiver untuk menempatkan kapal demo agar tidak
// pernah jatuh di daratan. Urutan: hulu (Tenggarong) → hilir (delta).
//
// Jangan mengacak urutan titik; interpolasi posisi bergantung pada urutan ini.
return [
    ['name' => 'Mahakam · Tenggarong',        'lat' => -0.420856, 'lng' => 117.000929],
    ['name' => 'Mahakam · Loa Kulu',          'lat' => -0.433179, 'lng' => 117.003745],
    ['name' => 'Mahakam · Loa Kulu Hilir',    'lat' => -0.445235, 'lng' => 117.002946],
    ['name' => 'Mahakam 04',                  'lat' => -0.455666, 'lng' => 117.007694],
    ['name' => 'Mahakam 05',                  'lat' => -0.466613, 'lng' => 117.014415],
    ['name' => 'Mahakam · Sungai Siring',     'lat' => -0.473347, 'lng' => 117.017392],
    ['name' => 'Mahakam 07',                  'lat' => -0.487116, 'lng' => 117.022591],
    ['name' => 'Mahakam · Samarinda Ulu',     'lat' => -0.500812, 'lng' => 117.026748],
    ['name' => 'Mahakam 09',                  'lat' => -0.523120, 'lng' => 117.027934],
    ['name' => 'Mahakam 10',                  'lat' => -0.528120, 'lng' => 117.032537],
    ['name' => 'Mahakam · Loa Janan',         'lat' => -0.533688, 'lng' => 117.039017],
    ['name' => 'Mahakam 12',                  'lat' => -0.538065, 'lng' => 117.039585],
    ['name' => 'Mahakam 13',                  'lat' => -0.545463, 'lng' => 117.029452],
    ['name' => 'Mahakam · Loa Duri',          'lat' => -0.562264, 'lng' => 117.020053],
    ['name' => 'Mahakam 15',                  'lat' => -0.574043, 'lng' => 117.019796],
    ['name' => 'Mahakam 16',                  'lat' => -0.589815, 'lng' => 117.035994],
    ['name' => 'Mahakam 17',                  'lat' => -0.590977, 'lng' => 117.041237],
    ['name' => 'Mahakam 18',                  'lat' => -0.585437, 'lng' => 117.056102],
    ['name' => 'Mahakam 19',                  'lat' => -0.584947, 'lng' => 117.058522],
    ['name' => 'Mahakam 20',                  'lat' => -0.589368, 'lng' => 117.066922],
    ['name' => 'Mahakam 21',                  'lat' => -0.591209, 'lng' => 117.072088],
    ['name' => 'Mahakam 22',                  'lat' => -0.584046, 'lng' => 117.080162],
    ['name' => 'Mahakam · Loa Buah',          'lat' => -0.575563, 'lng' => 117.082207],
    ['name' => 'Mahakam 24',                  'lat' => -0.560636, 'lng' => 117.083694],
    ['name' => 'Mahakam 25',                  'lat' => -0.544998, 'lng' => 117.086888],
    ['name' => 'Mahakam 26',                  'lat' => -0.537288, 'lng' => 117.093374],
    ['name' => 'Mahakam 27',                  'lat' => -0.535507, 'lng' => 117.102816],
    ['name' => 'Mahakam 28',                  'lat' => -0.533673, 'lng' => 117.113523],
    ['name' => 'Mahakam · Sungai Kunjang',    'lat' => -0.531220, 'lng' => 117.116318],
    ['name' => 'Mahakam · Jembatan Mahakam',  'lat' => -0.518998, 'lng' => 117.119736],
    ['name' => 'Mahakam 31',                  'lat' => -0.512059, 'lng' => 117.121880],
    ['name' => 'Mahakam 32',                  'lat' => -0.505113, 'lng' => 117.126702],
    ['name' => 'Mahakam · Pelabuhan Samarinda', 'lat' => -0.503435, 'lng' => 117.133355],
    ['name' => 'Mahakam · Samarinda Kota',    'lat' => -0.503966, 'lng' => 117.139067],
    ['name' => 'Mahakam 35',                  'lat' => -0.509394, 'lng' => 117.151889],
    ['name' => 'Mahakam 36',                  'lat' => -0.516862, 'lng' => 117.155563],
    ['name' => 'Mahakam 37',                  'lat' => -0.526854, 'lng' => 117.155135],
    ['name' => 'Mahakam 38',                  'lat' => -0.537411, 'lng' => 117.162092],
    ['name' => 'Mahakam 39',                  'lat' => -0.545704, 'lng' => 117.169855],
    ['name' => 'Mahakam · Muara Badak Hulu',  'lat' => -0.554050, 'lng' => 117.178052],
    ['name' => 'Mahakam 41',                  'lat' => -0.559849, 'lng' => 117.188873],
    ['name' => 'Mahakam 42',                  'lat' => -0.565032, 'lng' => 117.204139],
    ['name' => 'Mahakam 43',                  'lat' => -0.570145, 'lng' => 117.219260],
    ['name' => 'Mahakam 44',                  'lat' => -0.572996, 'lng' => 117.229958],
    ['name' => 'Mahakam · Muara Badak',       'lat' => -0.575181, 'lng' => 117.247612],
    ['name' => 'Mahakam 46',                  'lat' => -0.578124, 'lng' => 117.261243],
    ['name' => 'Mahakam 47',                  'lat' => -0.584773, 'lng' => 117.277763],
    ['name' => 'Mahakam · Muara Mahakam',     'lat' => -0.593281, 'lng' => 117.286997],
    ['name' => 'Mahakam · Muara Berau',       'lat' => -0.600027, 'lng' => 117.290592],
];
