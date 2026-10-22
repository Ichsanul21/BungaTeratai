@extends('pdf.layout')
@section('title', 'Penunjukan Keagenan ' . ($agency->letter_no ?? ''))

@section('content')
    <div class="doc-no" style="text-align:left; margin-top:6px;">Nomor: {{ $agency->letter_no }}</div>
    <div class="field" style="margin-top:14px;"><span class="lbl">Kepada Yth.</span><span class="val">: <b>{{ $agency->agent_name }}</b><br>{{ $agency->agent_address ?? 'Di Tempat' }}</span></div>
    <div class="field"><span class="lbl"></span><span class="val">Di Tempat</span></div>

    <div class="clause" style="margin-top:14px;"><b>Perihal: Penunjukan Keagenan</b></div>
    <div class="clause">Dengan hormat,</div>
    <div class="clause">
        Sehubungan dengan rencana kedatangan kapal kami di <b>{{ $agency->port_name ?? $voyage?->destination ?? '—' }}</b>,
        bersama ini kami menunjuk perusahaan Bapak/Ibu untuk handling keagenan kapal selama di
        <b>{{ $agency->port_name ?? $voyage?->destination ?? '—' }}</b>. Adapun data-data kapal sebagai berikut:
    </div>

    <div class="field"><span class="lbl">Nama Kapal</span><span class="val">: {{ $voyage?->vessel?->vessel_name ?? '—' }}</span></div>
    <div class="field"><span class="lbl">Bendera</span><span class="val">: Indonesia</span></div>
    <div class="field"><span class="lbl">G R T</span><span class="val">: {{ $agency->grt ?? $voyage?->vessel?->gt ?? '—' }}</span></div>
    <div class="field"><span class="lbl">Nama Nakhoda</span><span class="val">: {{ $agency->captain_phone ? $agency->captain_phone.' / ' : '' }}{{ $agency->captain_name ?? '—' }} ( Nakhoda )</span></div>
    <div class="field"><span class="lbl">Jenis Layanan</span><span class="val">: Keagenan Pelabuhan {{ $agency->port_type }}</span></div>

    <div class="clause" style="margin-top:14px;">Demikian surat penunjukan ini kami buat. Atas kerja samanya kami mengucapkan terima kasih.</div>

    <div class="sign-row">
        <div class="sign-col">
            Samarinda, {{ optional($agency->letter_date ?? now())->translatedFormat('d F Y') }}<br>
            {{ $lh['name'] }}<br>
            <div class="sign-space"></div>
            <b>{{ $lh['director'] }}</b><br>{{ $lh['director_title'] }}
        </div>
    </div>

    <div class="footer-note">Dokumen diterbitkan elektronik oleh Bunga Teratai System — {{ now()->translatedFormat('d F Y H:i') }} WITA.</div>
@endsection
