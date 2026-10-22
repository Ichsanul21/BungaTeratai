@extends('pdf.layout')
@section('title', 'Surat ' . $number)

@section('content')
    <div class="doc-no" style="text-align:left; margin-top:6px;">Nomor: {{ $number }}</div>

    <div style="margin-top:18px; text-align:center; font-size:12.5pt; font-weight:bold; text-transform:uppercase; letter-spacing:1px;">
        {{ $subject }}
    </div>
    <div class="field" style="margin-top:16px;"><span class="lbl">Kepada Yth.</span><span class="val">: <b>{{ $to }}</b></span></div>
    <div class="field"><span class="lbl">Di</span><span class="val">: Tempat</span></div>
    <div class="field"><span class="lbl">Tanggal</span><span class="val">: {{ \Illuminate\Support\Carbon::parse($date)->translatedFormat('d F Y') }}</span></div>

    <div style="margin-top:16px; font-size:11pt; line-height:1.6; text-align:justify;">
        {!! nl2br(e($body)) !!}
    </div>

    <div class="sign-row">
        <div class="sign-col">
            Hormat kami,<br><div class="materai">( {{ $lh['name'] }} )</div>
            <div class="sign-space"></div>
            <b>{{ $signer }}</b><br>{{ $signerTitle }}
        </div>
    </div>

    <div class="footer-note">Surat diterbitkan elektronik oleh Bunga Teratai System — {{ now()->translatedFormat('d F Y H:i') }} WITA.</div>
@endsection
