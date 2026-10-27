@extends('pdf.layout')
@section('title', 'Crew List ' . $vessel->vessel_name)

@section('content')
    <h2 class="doc-title">Crew List</h2>

    <table style="width:100%; margin-bottom:10px; font-size:10pt;">
        <tr>
            <td style="width:16%">NAMA KAPAL</td><td style="width:2%">:</td>
            <td style="width:34%"><b>{{ $vessel->vessel_name }}</b></td>
            <td style="width:16%">BENDERA</td><td style="width:2%">:</td>
            <td>INDONESIA</td>
        </tr>
        <tr>
            <td>GRT</td><td>:</td>
            <td>{{ rtrim(number_format((float) ($vessel->gt ?? 0), 0, ',', '.'), '0') }} GT</td>
            <td>PEMILIK</td><td>:</td>
            <td>PT. BUNGA TERATAI</td>
        </tr>
    </table>

    <table class="data">
        <thead>
            <tr>
                <th style="width:4%">NO</th>
                <th style="width:22%">NAMA AWAK KAPAL</th>
                <th style="width:13%">JABATAN</th>
                <th style="width:11%">BUKU PELAUT</th>
                <th style="width:9%">BERLAKU</th>
                <th style="width:14%">NO PKL</th>
                <th style="width:9%">ANT / ATT</th>
                <th style="width:9%">KODE PELAUT</th>
                <th style="width:9%">SIGN ON</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($rows as $i => $row)
                <tr>
                    <td>{{ $i + 1 }}</td>
                    <td>{{ $row['name'] }}</td>
                    <td>{{ $row['rank'] }}</td>
                    <td>{{ $row['buku_no'] ?? '—' }}</td>
                    <td>{{ $row['buku_exp'] ?? '—' }}</td>
                    <td>{{ $row['no_pkl'] ?? '—' }}</td>
                    <td>{{ $row['ant'] ?? '—' }}</td>
                    <td>{{ $row['seafarer_code'] ?? '—' }}</td>
                    <td>{{ $row['sign_on'] ?? '—' }}</td>
                </tr>
            @empty
                <tr><td colspan="9" style="text-align:center;">Belum ada awak terdaftar untuk kapal ini.</td></tr>
            @endforelse
        </tbody>
    </table>

    <div class="footer-note">
        Total awak: {{ count($rows) }} orang · Dicetak {{ now()->format('d-m-Y H:i') }} · BUNGA TERATAI SYSTEM
    </div>

@endsection
