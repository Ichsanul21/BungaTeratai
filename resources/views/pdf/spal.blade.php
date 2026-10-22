@extends('pdf.layout')
@section('title', 'SPAL ' . ($voyage->spal_number ?? ''))

@section('content')
    <h2 class="doc-title">Surat Perjanjian Angkutan Laut</h2>
    <div class="doc-no">Nomor: {{ $voyage->spal_number ?? '—' }} &nbsp;&middot;&nbsp; Tanggal: {{ optional($voyage->spal_date)->translatedFormat('d F Y') }}</div>

    <div class="clause">
        Perjanjian ini mengikuti dan sesuai dengan THE BALTIC AND INTERNATIONAL MARITIM COUNCIL UNIFORM GENERAL
        CHARTER (AS RECEIVED 1922, 1976 and 1997) CODE NAME "GENCON" dan ketentuan umum yang tercantum di halaman
        belakang/terlampir.
    </div>

    <div class="field"><span class="lbl">1. PEMILIK KAPAL / OPERATOR</span><span class="val">: {{ $lh['name'] }}<br>{{ $lh['address'] }}<br>Telp. {{ $lh['phone'] }} — {{ $lh['email'] }}</span></div>
    <div class="field"><span class="lbl">2. PENYEWA RUANG KAPAL / SHIPPER</span><span class="val">: {{ $voyage->customer?->name ?? '—' }}<br>{{ $voyage->customer?->address ?? '' }}</span></div>
    <div class="field"><span class="lbl">3. NAMA DAN DATA KAPAL</span><span class="val">: {{ $voyage->vessel?->vessel_name }}{{ $relationship ? ' — '.($relationship->tugboat?->vessel_name).' &amp; '.($relationship->barge?->vessel_name) : '' }} (GT {{ $voyage->vessel?->gt ?? '—' }})</span></div>
    <div class="field"><span class="lbl">4. KEAGENAN KAPAL</span><span class="val">: {{ $voyage->vessel?->base_location ?? '—' }} (Ditanggung Pemilik Kapal)</span></div>
    <div class="field"><span class="lbl">5. POSISI KAPAL SAAT INI</span><span class="val">: {{ $voyage->origin }}</span></div>
    <div class="field"><span class="lbl">6. KESEDIAAN KAPAL UNTUK MUAT</span><span class="val">: {{ optional($voyage->planned_departure)->translatedFormat('d F Y') }}</span></div>
    <div class="field"><span class="lbl">7. JENIS MUATAN DAN JUMLAHNYA</span><span class="val">: {{ $cargo ? ucwords(str_replace('_', ' ', $cargo->commodity_type)).' ± '.number_format((float) $cargo->weight_ton, 0, ',', '.') .' MT' : '—' }}</span></div>
    <div class="field"><span class="lbl">8. JUMLAH BIAYA ANGKUTAN / LUMPSUM</span><span class="val">: {{ $voyage->freight_unit === 'lumpsum' ? 'Rp '.number_format((float) $voyage->freight_rate, 0, ',', '.').' (lumpsum)' : 'Rp '.number_format((float) $voyage->freight_rate, 0, ',', '.').' / MT (belum termasuk PPN)' }}</span></div>
    <div class="field"><span class="lbl">9. CARA PEMBAYARAN</span><span class="val">: {{ $voyage->payment_terms === 'dp_100' ? '100% dibayar di muka' : ($voyage->payment_terms === 'dp_50_50' ? '50% dibayar pada saat muat — 50% dibayar pada saat kapal tiba POD sebelum bongkar' : ($voyage->payment_terms_note ?? '—')) }}</span></div>
    <div class="field"><span class="lbl">10. PEMBAYARAN DISETOR KE</span><span class="val">: {{ $lh['bank'] }}, a.n. {{ $lh['account_holder'] }}</span></div>
    <div class="field"><span class="lbl">11. PELABUHAN MUAT (POL)</span><span class="val">: {{ $voyage->jetty_loading ?? $voyage->origin }}</span></div>
    <div class="field"><span class="lbl">12. PELABUHAN BONGKAR (POD)</span><span class="val">: {{ $voyage->jetty_discharge ?? $voyage->destination }}</span></div>
    <div class="field"><span class="lbl">13. LAMA HARI MUAT DAN BONGKAR</span><span class="val">: {{ $voyage->laytime_days ? $voyage->laytime_days.' (empat belas) Hari, muat dan bongkar' : '—' }}</span></div>
    <div class="field"><span class="lbl">14. DENDA KETERLAMBATAN (DEMURRAGE)</span><span class="val">: Rp {{ number_format((float) $voyage->demurrage_per_day, 0, ',', '.') }} per hari</span></div>
    <div class="field"><span class="lbl">15. PENGIRIM BARANG (SHIPPER)</span><span class="val">: {{ $voyage->shipper ?? $voyage->customer?->name ?? '—' }}</span></div>
    <div class="field"><span class="lbl">16. PENERIMA BARANG (CONSIGNEE)</span><span class="val">: {{ $voyage->consignee ?? '—' }}</span></div>
    <div class="field"><span class="lbl">17. ASURANSI KAPAL</span><span class="val">: Ditanggung Pemilik Kapal</span></div>
    <div class="field"><span class="lbl">18. ASURANSI BARANG</span><span class="val">: Ditanggung Pemilik Barang</span></div>

    <div class="clause"><b>19. SYARAT-SYARAT TAMBAHAN YANG DISETUJUI BERSAMA:</b></div>
    <div class="clause">- Tahapan pembayaran wajib diselesaikan sesuai terms yang disetujui pada point 9, dan apabila terjadi ketidaksesuaian terms pembayaran, maka Pemilik / Operator Kapal berhak untuk membatalkan kontrak secara sepihak dan atau menangguhkan pembongkaran cargo serta biaya yang timbul akan diperhitungkan.</div>
    <div class="clause">- Pembayaran tidak tergantung pihak ketiga.</div>
    <div class="clause">- Shipper menjamin cargo tidak dalam masalah. Apabila cargo bermasalah segala biaya yang timbul kami bebankan pada shipper.</div>
    <div class="clause">- Hal-hal lainnya sesuai dengan ketentuan umum.</div>

    <div class="clause"><b>20. PERSELISIHAN:</b> Apabila timbul perselisihan akan diselesaikan secara musyawarah bersama, dan apabila tidak dapat tercapai kesepakatan, maka kedua belah pihak setuju untuk diselesaikan secara Hukum di Pengadilan Negeri setempat.</div>

    <div class="clause">Demikian Surat Perjanjian Angkutan Laut ini kami buat untuk disepakati bersama dengan ditanda tangani diatas materai yang cukup dalam rangkap dua, masing-masing mempunyai kekuatan hukum yang sama.</div>

    <div class="sign-row">
        <div class="sign-col">
            PEMILIK KAPAL / OPERATOR<br>
            <div class="materai">( {{ $lh['name'] }} )</div>
            <div class="sign-space"></div>
            <b>{{ $lh['director'] }}</b><br>{{ $lh['director_title'] }}
        </div>
        <div class="sign-col">
            PENYEWA RUANG KAPAL / SHIPPER<br>
            <div class="materai">( {{ $voyage->customer?->name ?? '...........................' }} )</div>
            <div class="sign-space"></div>
            <b>{{ $voyage->customer?->name ? '...........................' : '...........................' }}</b><br>Direktur
        </div>
    </div>

    <div class="page-break"></div>
    <h2 class="doc-title" style="margin-top:0;">Ketentuan Umum</h2>

    <div class="clause"><b>1.</b> Pemilik / Operator berhak dan dibenarkan memuat muatan di atas deck dan segala resiko adalah menjadi beban dan tanggung jawab penyewa / shipper dengan limit kapal dalam keadaan layak laut (Sea Worthy). Shipper menjamin bahwa muatan (cargo) yang dimuat adalah miliknya yang telah bebas dari kewajiban apapun dari pihak lain/pihak ke tiga.</div>
    <div class="clause"><b>2.A.</b> Pemilik / operator tidak bertanggung jawab atas tumpah, hilang, rusak, berkurang muatan baik dalam pelayaran maupun sewaktu berada di pelabuhan muat / bongkar. Pemilik / Operator berhak untuk menahan dan atau menjual muatan apabila pembayaran uang tambang dari penyewa tidak sesuai dengan surat perjanjian diatas, dan berhak untuk dilunasi sesuai dengan yang tercantum dalam kontrak untuk menutupi kerugian yang timbul akibat dari pelaksanaan pengangkutan.</div>
    <div class="clause"><b>B.</b> Apabila jumlah muatan lebih dari yang tercantum dalam Surat Perjanjian Angkutan Laut ini, maka pemilik muatan akan menambahkan uang tambang secara prorate (sesuai jumlah kelebihan muatan).</div>
    <div class="clause"><b>3.</b> Di tempat-tempat dangkal dan membahayakan ABK serta kapal, Pemilik / Operator berhak menentukan tempat yang aman dan terdekat untuk pemuatan dan pembongkaran muatan demi keselamatan ABK dan kapal.</div>
    <div class="clause"><b>4.</b> Apabila oleh karena sesuatu dan lain hal yang menyangkut nautis sehingga kapal yang akan mengangkut mengalami keterlambatan atau hambatan, maka pemilik / Operator kapal dibenarkan untuk menggantikan dengan Armada lain yang sama ukurannya tanpa merubah dari ini dan bunyi perjanjian ini.</div>
    <div class="clause"><b>5.</b> Asuransi muatan, Lashing / Unlashing material, marine cargo surveyor OPT / OPP, Kran darat, EMKL, serta hal-hal teknis menjadi tanggung jawab Penyewa / Shipper.</div>
    <div class="clause"><b>6.</b> Force Majeur dalam perjanjian ini adalah: badai, ombak besar, pasang surut, gempa bumi, sengatan petir, pernyataan darurat dari pemerintah serta hal lain yang sifatnya diluar kemampuan akal manusia (Act Of Good) tetapi tidak termasuk pemogokan buruh yang disebabkan kesalahan pemilik muatan.</div>
    <div class="clause"><b>7.</b> Apabila terjadi General Average, maka akan mengikuti York Antwerp 1974 / Undang-undang yang berlaku di Indonesia dan uang tambang serta dead-freight tidak dapat di collect dari general average tersebut.</div>
    <div class="clause"><b>8.</b> Pemilik muatan menjamin sepenuhnya jumlah tonase / kubikasi muatannya dan bila diragukan maka pemilik muatan wajib membayar freight sesuai hasil pengukuran ulang surveyor tersebut.</div>
    <div class="clause"><b>9.</b> Apabila penyewa kapal membatalkan Perjanjian Angkutan Laut atau muatan tidak ada (setelah kapal sandar dan telah kami tunggu 1 (satu) x 24 (dua puluh empat) jam), maka untuk pembayaran 25% pada saat kontrak ditandatangani tidak dapat dikembalikan kepada pihak penyewa kapal.</div>
    <div class="clause"><b>10.</b> Hal-hal yang belum tercantum dalam surat Perjanjian ini, akan dibicarakan bersama dan ditambahkan setelah persetujuan kedua belah pihak sebagai addendum.</div>

    <div class="sign-row">
        <div class="sign-col"><div class="sign-space"></div>PEMILIK KAPAL / OPERATOR</div>
        <div class="sign-col"><div class="sign-space"></div>PENYEWA RUANG KAPAL / SHIPPER</div>
    </div>

    <div class="footer-note">Dokumen diterbitkan secara elektronik oleh PortWind Intelligence — {{ now()->translatedFormat('d F Y H:i') }} WITA.</div>
@endsection


