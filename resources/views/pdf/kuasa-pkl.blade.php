@extends('pdf.layout')
@section('title', 'Surat Kuasa PKL ' . ($number ?? ''))

@section('content')
    <div class="doc-no" style="text-align:left;">
        <table style="width:100%">
            <tr>
                <td style="width:55%">No. <b>{{ $number }}</b></td>
                <td style="text:right">{{ $place }}, {{ $date }}</td>
            </tr>
        </table>
    </div>

    <h2 class="doc-title">Surat Kuasa</h2>

    <div class="clause" style="margin-top:16px;">
        Yang bertanda tangan di bawah ini :
    </div>

    <div class="field"><span class="lbl">Nama</span><span class="val">: H. Syarif</span></div>
    <div class="field"><span class="lbl">Perusahaan</span><span class="val">: PT. Bunga Teratai</span></div>
    <div class="field"><span class="lbl">Jabatan</span><span class="val">: Direktur Utama</span></div>

    <div class="clause" style="margin-top:12px;">
        Dengan ini dengan sadar dan tanpa tekanan dari pihak manapun memberikan kuasa kepada :
    </div>

    <div class="field"><span class="lbl">Nama</span><span class="val">: {{ $attorney }}</span></div>
    <div class="field"><span class="lbl">Jabatan</span><span class="val">: {{ $attorneyTitle }}</span></div>

    <div class="clause" style="margin-top:12px;">
        Untuk dan atas nama perusahaan PT. Bunga Teratai melakukan segala tindakan yang diperlukan
        berkaitan dengan keperluan <b>Praktek Laut (PKL) taruna</b>
        <b>{{ $crewName }}</b> pada kapal <b>{{ $vesselName }}</b>,
        termasuk namun tidak terbatas pada pengurusan dokumen, pengesahan, dan keperluan
        administrasi lainnya di hadapan instansi terkait.
    </div>

    <div class="clause">
        Demikian surat kuasa ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.
    </div>

    <div class="sign-row">
        <div class="sign-col">
            <div class="sign-space"></div>
            <b>H. Syarif</b><br>
            Direktur Utama
        </div>
    </div>
@endsection
