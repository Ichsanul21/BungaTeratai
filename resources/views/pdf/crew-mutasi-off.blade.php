@extends('pdf.layout')
@section('title', 'Surat Pemberhentian Awak Kapal ' . ($movement->no_surat ?? ''))

@section('content')
    <div class="doc-no" style="text-align:left;">
        <table style="width:100%">
            <tr>
                <td style="width:55%">No. : <b>{{ $movement->no_surat ?? '—' }}</b></td>
                <td style="text:right">{{ $place }}, {{ $movement->movement_date->format('d F Y') }}</td>
            </tr>
        </table>
    </div>

    <h2 class="doc-title">Surat Pemberhentian Awak Kapal</h2>
    <div class="doc-no">(MUTASI OFF)</div>

    <div class="clause" style="margin-top:14px;">
        Yang bertanda tangan dibawah ini, bertindak untuk atas nama manajemen <b>PT. BUNGA TERATAI</b><br>
        dengan ini menetapkan dan memutuskan :
    </div>

    <div class="field"><span class="lbl">Nama</span><span class="val">: {{ $crew->name }}</span></div>
    <div class="field"><span class="lbl">NIP</span><span class="val">: {{ $crew->kode_nik ?? '—' }}</span></div>
    <div class="field"><span class="lbl">Kode Pelaut</span><span class="val">: {{ $crew->seafarer_code ?? '—' }}</span></div>
    <div class="field"><span class="lbl">Nama Kapal</span><span class="val">: {{ $vessel ? $vessel->vessel_name : '—' }}</span></div>
    <div class="field"><span class="lbl">Jabatan</span><span class="val">: {{ $movement->role ?? $crew->rank }}</span></div>
    <div class="field"><span class="lbl">Alasan</span><span class="val">: {{ $reasonLabel }}</span></div>

    <div class="clause" style="margin-top:12px;">
        Bahwa yang bersangkutan terhitung sejak tanggal <b>{{ $movement->movement_date->format('d F Y') }}</b>
        dinyatakan <b>BERHENTI / MUTASI OFF</b> dari kapal tersebut di atas dan tidak lagi memikul
        tanggung jawab sebagai Awak Kapal pada kapal tersebut.
    </div>

    @if ($movement->replacementCrew)
        <div class="clause">
            Pengganti: <b>{{ $movement->replacementCrew->name }}</b>
            ({{ $movement->recommendation_by ? 'Rekomendasi '.ucfirst($movement->recommendation_by) : 'Sesuai rekomendasi Nakhoda/KKM' }}).
        </div>
    @endif

    <div class="clause">
        Demikian surat pemberhentian ini dibuat untuk dapat dipergunakan sebagaimana mestinya.
    </div>

    <div class="sign-row">
        <div class="sign-col">
            <div class="sign-space"></div>
            <b>H. Ariyanto</b><br>
            ({{ $signerTitle }})
        </div>
    </div>

@endsection
