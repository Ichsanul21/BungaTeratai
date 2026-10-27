@extends('pdf.layout')
@section('title', 'Permohonan Sijil ON ' . ($sijil->no_surat ?? ''))

@section('content')
    <table style="width:100%; font-size:10.5pt; margin-bottom:6px;">
        <tr>
            <td style="width:52%">
                No : <b>{{ $sijil->no_surat ?? '—' }}</b><br>
                Lampiran :<br>
                Perihal : <b>Permohonan Sijil {{ strtoupper($sijil->kind) }}</b>
            </td>
            <td style="width:48%">
                {{ $place }}, {{ $sijil->letter_date->format('d F Y') }}<br><br>
                Kepada Yth.<br>
                Kepala Kantor Kesyahbandaran<br>
                Dan Otoritas Pelabuhan Kelas I<br><br>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Di - Samarinda
            </td>
        </tr>
    </table>

    <div class="clause" style="margin-top:10px;"><b>Dengan Hormat,</b></div>
    <div class="clause">
        Bersama ini kami mengajukan permohonan kepada Bapak/Ibu agar kiranya berkenan
        untuk memberikan perihal tersebut diatas pada kapal kami dengan data sebagai berikut :
    </div>

    <div class="field"><span class="lbl">Nama Kapal</span><span class="val">: {{ $vessel->vessel_name }}</span></div>
    <div class="field"><span class="lbl">Isi Kotor</span><span class="val">: {{ rtrim(number_format((float) ($vessel->gt ?? 0), 0, ',', '.'), '0') }} GT</span></div>
    <div class="field"><span class="lbl">Jenis Kapal</span><span class="val">: {{ $vesselTypeLabel }}</span></div>
    <div class="field"><span class="lbl">Bendera</span><span class="val">: Indonesia</span></div>
    <div class="field"><span class="lbl">Pemilik</span><span class="val">: PT. Bunga Teratai</span></div>

    <div class="clause" style="margin-top:10px;">
        Nama dan Jabatan Anak Buah Kapal yang akan di sijil {{ strtoupper($sijil->kind) }} dengan data sebagai berikut :
    </div>

    <table class="data" style="margin-top:4px;">
        <thead>
            <tr><th style="width:8%">NO</th><th>NAMA</th><th style="width:34%">JABATAN</th></tr>
        </thead>
        <tbody>
            @foreach ($crewList as $i => $c)
                <tr>
                    <td>{{ str_pad((string) ($i + 1), 2, '0', STR_PAD_LEFT) }}.</td>
                    <td>{{ $c['name'] }}</td>
                    <td>{{ $c['rank'] }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <div class="clause" style="margin-top:12px;">
        Demikian permohonan ini kami buat, atas perhatian dan bantuan Bapak/Ibu kami ucapkan terimakasih.
    </div>

    <div class="sign-row">
        <div class="sign-col">
            Hormat Kami,<br>
            <b>PT. Bunga Teratai</b>
            <div class="sign-space"></div>
            <b>{{ $sijil->signed_by ?? 'Capt Azwar Saputra' }}</b>
        </div>
    </div>

@endsection
