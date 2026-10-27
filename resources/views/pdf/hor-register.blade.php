@extends('pdf.layout')
@section('title', 'Hours of Rest ' . $crew->name . ' ' . $monthLabel)

@section('content')
    <h2 class="doc-title">Register Hours of Rest (Jam Istirahat Awak)</h2>
    <p style="font-size:9pt; margin-top:-4px; color:#444;">
        MLC 2006 / SOLAS XI/1 — minimal 10 jam istirahat per 24 jam (satu blok &ge; 6 jam),
        maksimal 14 jam kerja per 24 jam, minimal 77 jam istirahat per 7 hari.
    </p>

    <table style="width:100%; margin-bottom:10px; font-size:10pt;">
        <tr>
            <td style="width:16%">NAMA AWAK</td><td style="width:2%">:</td>
            <td style="width:34%"><b>{{ $crew->name }}</b></td>
            <td style="width:16%">JABATAN</td><td style="width:2%">:</td>
            <td>{{ strtoupper($crew->rank) }}</td>
        </tr>
        <tr>
            <td>KAPAL</td><td>:</td>
            <td>{{ $vessel?->vessel_name ?? '—' }}</td>
            <td>PERIODE</td><td>:</td>
            <td><b>{{ $monthLabel }}</b></td>
        </tr>
    </table>

    <table class="data">
        <thead>
            <tr>
                <th style="width:12%">TANGGAL</th>
                <th style="width:8%">HARI</th>
                <th style="width:34%">BLOK ISTIRAHAT (WITA)</th>
                <th style="width:9%">ISTIRAHAT</th>
                <th style="width:9%">KERJA</th>
                <th style="width:12%">STATUS</th>
                <th style="width:16%">CATATAN</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($rows as $row)
                <tr>
                    <td>{{ $row['date'] }}</td>
                    <td>{{ $row['weekday'] }}</td>
                    <td>{{ $row['entries'] ?? '— belum dicatat —' }}</td>
                    <td>{{ $row['rest_h'] !== null ? $row['rest_h'].' j' : '—' }}</td>
                    <td>{{ $row['work_h'] !== null ? $row['work_h'].' j' : '—' }}</td>
                    <td>
                        @if ($row['ok'] === true)
                            PATUH
                        @elseif ($row['ok'] === false)
                            LANGGAR
                        @else
                            —
                        @endif
                    </td>
                    <td>{{ $row['note'] ?? '' }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <h3 style="font-size:11pt; margin-top:14px;">Kepatuhan Mingguan (77 jam / 7 hari)</h3>
    <table class="data">
        <thead>
            <tr>
                <th style="width:16%">MINGGU</th>
                <th style="width:34%">RENTANG</th>
                <th style="width:18%">TOTAL ISTIRAHAT</th>
                <th style="width:32%">STATUS</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($weekly as $week)
                <tr>
                    <td>{{ $week['label'] }}</td>
                    <td>{{ $week['range'] }}</td>
                    <td>{{ $week['rest_h'] }} jam</td>
                    <td>
                        @if (! $week['complete'])
                            DATA BELUM LENGKAP ({{ $week['rest_h'] }}/77 jam, belum 7 hari tercatat)
                        @elseif ($week['ok'])
                            PATUH
                        @else
                            LANGGAR (&lt; 77 jam)
                        @endif
                    </td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <p style="font-size:8.5pt; color:#555; margin-top:10px;">
        Catatan: blok istirahat memakai waktu kapal (WITA). Bila jam kapal meleset &gt; 15 menit dari waktu server,
        catatan ditandai saat sinkronisasi. Rekaman offline dari kapal ikut tercatat pada kolom catatan.
    </p>

    <table style="width:100%; margin-top:24px; font-size:10pt;">
        <tr>
            <td style="width:50%">Dibuat oleh,</td>
            <td style="width:50%">Mengetahui,</td>
        </tr>
        <tr><td style="height:70px"></td><td></td></tr>
        <tr>
            <td>( {{ $lh['person_in_charge'] ?? 'Kepala Awak / KKM' }} )</td>
            <td>( Nakhoda / Master )</td>
        </tr>
    </table>

    <div class="footer-note">
        Awak: {{ $crew->name }} · Periode {{ $monthLabel }} · Dicetak {{ now()->format('d-m-Y H:i') }} WITA · BUNGA TERATAI SYSTEM
    </div>
@endsection
