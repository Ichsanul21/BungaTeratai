@extends('pdf.layout')
@section('title', 'Surat Pengangkatan Taruna ' . ($movement->no_surat ?? ''))

@section('content')
    <div class="doc-no" style="text-align:left;">
        <table style="width:100%">
            <tr>
                <td style="width:55%">No. <b>{{ $movement->no_surat ?? '—' }}</b></td>
                <td style="text:right">{{ $place }}, {{ $movement->movement_date->format('d F Y') }}</td>
            </tr>
        </table>
    </div>

    <h2 class="doc-title">Surat Pengangkatan (Mutasi ON)</h2>

    <div class="clause" style="margin-top:14px;">
        Yang bertandatangan dibawah ini, bertindak untuk atas nama manajemen <b>PT. Bunga Teratai</b><br>
        dengan ini menetapkan dan memutuskan taruna atas nama :
    </div>

    <div class="field"><span class="lbl">Nama</span><span class="val">: {{ $crew->name }}</span></div>
    <div class="field"><span class="lbl">Kode Pelaut</span><span class="val">: {{ $crew->seafarer_code ?? '—' }}</span></div>
    <div class="field"><span class="lbl">Tempat / Tgl Lahir</span><span class="val">: {{ ($crew->birth_place ?? '—').', '.($crew->birth_date ? $crew->birth_date->format('d/m/Y') : '—') }}</span></div>
    <div class="field"><span class="lbl">Nama Kapal</span><span class="val">: {{ $vessel ? $vessel->vessel_name : '—' }}</span></div>
    <div class="field"><span class="lbl">Alamat</span><span class="val">: {{ $crew->address ?? '—' }}</span></div>
    <div class="field"><span class="lbl">Jabatan</span><span class="val">: {{ $movement->role ?? 'Kadet' }}</span></div>
    <div class="field"><span class="lbl">Sekolah</span><span class="val">: {{ $crew->school_origin ?? '—' }}</span></div>
    <div class="field"><span class="lbl">N.I.T</span><span class="val">: {{ $crew->nit ?? '—' }}</span></div>

    <div class="clause" style="margin-top:12px;">
        Bahwa yang bersangkutan terhitung sejak tanggal diterbitkannya surat ini dinyatakan
        mulai melaksanakan <b>Praktek Laut (Prala)</b> di kapal sesuai dengan tersebut diatas.
    </div>

    <div class="clause">
        Demikian surat keterangan ini dibuat agar dapat dipergunakan sebagai mana mestinya.
    </div>

    <div class="sign-row">
        <div class="sign-col">
            {{ $place }}, {{ $movement->movement_date->format('d F Y') }}<br>
            <b>PT. Bunga Teratai</b>
            <div class="sign-space"></div>
            <b>H. Ariyanto</b>
        </div>
    </div>

    <div class="footer-note">Tembusan : Diketahui Nakhoda / KKM {{ $vessel ? $vessel->vessel_name : '' }}</div>
@endsection
