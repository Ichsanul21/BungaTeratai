<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>@yield('title', 'Dokumen')</title>
    <style>
        * { box-sizing: border-box; }
        body { font-family: "DejaVu Sans", Arial, sans-serif; font-size: 11pt; color: #111; margin: 0; padding: 28px 34px; }
        .kop { border-bottom: 3px double #111; padding-bottom: 8px; margin-bottom: 16px; }
        .kop table { width: 100%; border: 0; }
        .kop td { border: 0; vertical-align: middle; padding: 0; }
        .kop .logo { width: 74px; height: 74px; background: #C41212; color: #fff; text-align: center;
            font-size: 34pt; font-weight: bold; line-height: 74px; border-radius: 8px; }
        .kop h1 { font-size: 17pt; margin: 0; letter-spacing: 1px; color: #111; }
        .kop .sub { font-size: 8.5pt; color: #333; line-height: 1.4; }
        h2.doc-title { text-align: center; font-size: 13pt; text-transform: uppercase; letter-spacing: 2px;
            text-decoration: underline; margin: 14px 0 6px; }
        .doc-no { text-align: center; font-size: 10.5pt; margin-bottom: 16px; }
        table.data { width: 100%; border-collapse: collapse; margin: 8px 0; }
        table.data th, table.data td { border: 1px solid #444; padding: 5px 7px; font-size: 10pt; vertical-align: top; }
        table.data th { background: #f0f0f0; }
        .clause { margin-bottom: 7px; font-size: 10.5pt; line-height: 1.45; text-align: justify; }
        .clause b { display: inline-block; min-width: 26px; }
        .field { display: table; width: 100%; margin-bottom: 8px; font-size: 10.5pt; }
        .field .lbl { display: table-cell; width: 46%; vertical-align: top; font-weight: bold; }
        .field .val { display: table-cell; vertical-align: top; }
        .amount { text-align: right; }
        .total-line { border-top: 2px solid #111; font-weight: bold; font-size: 12pt; }
        .sign-row { margin-top: 34px; display: table; width: 100%; }
        .sign-col { display: table-cell; width: 50%; text-align: center; font-size: 10.5pt; }
        .sign-space { height: 78px; }
        .materai { font-size: 9pt; color: #555; }
        .page-break { page-break-before: always; }
        .footer-note { font-size: 8.5pt; color: #555; margin-top: 14px; }
        .watermark { text-align: center; font-size: 8.5pt; color: #999; letter-spacing: 3px; margin-top: 10px; }
        .amount-big { font-size: 12.5pt; font-weight: bold; }
    </style>
</head>
<body>
    <div class="kop">
        <table>
            <tr>
                <td style="width:80px;"><div class="logo">B</div></td>
                <td style="text-align:center;">
                    <h1>{{ $lh['name'] ?? 'PT BUNGA TERATAI' }}</h1>
                    <div class="sub">
                        {{ $lh['address'] ?? 'Jl. Mulawarman No. 23, Samarinda, Kalimantan Timur' }}<br>
                        Telp: {{ $lh['phone'] ?? '(0541) 731034' }} &middot; Email: {{ $lh['email'] ?? 'adm.teratai@gmail.com' }}
                    </div>
                </td>
                <td style="width:150px; text-align:right;" class="sub">
                    NPWP: {{ $lh['npwp'] ?? '—' }}<br>
                    {{ $lh['bank'] ?? '' }}<br>
                    a.n. {{ $lh['account_holder'] ?? 'PT Bunga Teratai' }}
                </td>
            </tr>
        </table>
    </div>

    @yield('content')

    <div class="watermark">PORTWIND INTELLIGENCE — DOKUMEN SISTEM</div>
</body>
</html>
