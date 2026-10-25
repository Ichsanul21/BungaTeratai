<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>@yield('title', 'Dokumen')</title>
    <style>
        @page { margin: 16mm 14mm 14mm 14mm; }
        * { box-sizing: border-box; }
        body { font-family: "DejaVu Sans", Arial, sans-serif; font-size: 10.5pt; color: #111; margin: 0; padding: 0; line-height: 1.4; word-wrap: break-word; }
        .kop { border-bottom: 2px solid #C41212; padding-bottom: 8px; margin-bottom: 14px; }
        .kop table { width: 100%; border: 0; table-layout: fixed; }
        .kop td { border: 0; vertical-align: middle; padding: 0; word-wrap: break-word; }
        .kop .logo { width: 60px; height: 60px; background: #C41212; color: #fff; text-align: center;
            font-size: 20pt; font-weight: bold; line-height: 60px; border-radius: 6px; letter-spacing: 1px; }
        .kop h1 { font-size: 15pt; margin: 0 0 3px 0; letter-spacing: 1.5px; color: #172B3A; font-weight: bold; }
        .kop .sub { font-size: 8.5pt; color: #333; line-height: 1.4; }
        h2.doc-title { text-align: center; font-size: 13pt; text-transform: uppercase; letter-spacing: 2px;
            text-decoration: underline; margin: 12px 0 6px; }
        .doc-no { text-align: center; font-size: 10pt; margin-bottom: 14px; }
        table { border-collapse: collapse; page-break-inside: auto; }
        tr { page-break-inside: avoid; page-break-after: auto; }
        thead { display: table-header-group; }
        tfoot { display: table-footer-group; }
        table.data { width: 100%; border-collapse: collapse; margin: 8px 0; table-layout: fixed; word-wrap: break-word; }
        table.data th, table.data td { border: 1px solid #444; padding: 5px 7px; font-size: 9.5pt; vertical-align: top; word-wrap: break-word; overflow-wrap: break-word; }
        table.data th { background: #f0f0f0; }
        .clause { margin-bottom: 7px; font-size: 10pt; line-height: 1.45; text-align: justify; word-wrap: break-word; }
        .clause b { display: inline-block; min-width: 26px; }
        .field { display: table; width: 100%; margin-bottom: 6px; font-size: 10pt; table-layout: fixed; word-wrap: break-word; }
        .field .lbl { display: table-cell; width: 44%; vertical-align: top; font-weight: bold; word-wrap: break-word; }
        .field .val { display: table-cell; width: 56%; vertical-align: top; word-wrap: break-word; }
        .amount { text-align: right; white-space: nowrap; }
        .total-line { border-top: 2px solid #111; font-weight: bold; font-size: 11pt; }
        .sign-row { margin-top: 28px; display: table; width: 100%; page-break-inside: avoid; }
        .sign-col { display: table-cell; width: 50%; text-align: center; font-size: 10pt; vertical-align: top; }
        .sign-space { height: 64px; }
        .materai { font-size: 8.5pt; color: #555; }
        .page-break { page-break-before: always; }
        .footer-note { font-size: 8pt; color: #555; margin-top: 14px; page-break-inside: avoid; }
        .watermark { text-align: center; font-size: 8pt; color: #999; letter-spacing: 2px; margin-top: 8px; page-break-inside: avoid; }
        .amount-big { font-size: 12pt; font-weight: bold; }
    </style>
</head>
<body>
    <div class="kop">
        <table>
            <tr>
                <td style="width:65px; vertical-align:middle;"><div class="logo">BT</div></td>
                <td style="text-align:left; padding-left:14px; vertical-align:middle;">
                    <h1>PT BUNGA TERATAI</h1>
                    <div class="sub">
                        Jl. Nahkoda No. 35, Samarinda Ilir, Kota Samarinda, Kalimantan Timur 75113<br>
                        Telepon: +62 812 3456 7890 &nbsp;|&nbsp; Email: bungateratai@gmail.com
                    </div>
                </td>
            </tr>
        </table>
    </div>

    @yield('content')

    <div class="watermark">BUNGA TERATAI SYSTEM - DOKUMEN SISTEM</div>
</body>
</html>
