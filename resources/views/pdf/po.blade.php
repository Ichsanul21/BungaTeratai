@extends('pdf.layout')
@section('title', 'Purchase Order ' . $po->po_number)

@section('content')
    <h2 class="doc-title" style="letter-spacing:4px;">PURCHASE ORDER</h2>
    <table class="data" style="margin-top:8px;">
        <tr><th style="width:18%;">NO</th><td>: {{ $po->po_number }}</td></tr>
        <tr><th>TGL</th><td>: {{ optional($po->order_date)->translatedFormat('d F Y') }}</td></tr>
        <tr><th>KEPADA YTH</th><td>: <b>{{ $po->supplier?->name ?? '-' }}</b>{{ $po->supplier?->address ? '<br>'.$po->supplier->address : '' }}</td></tr>
        <tr><th>UNIT</th><td>: {{ $po->vessel?->vessel_name ?? 'UMUM / KANTOR' }}</td></tr>
        <tr><th>DEPT</th><td>: {{ $po->dept }}</td></tr>
    </table>

    <table class="data" style="margin-top:14px;">
        <tr>
            <th style="width:6%;">NO</th>
            <th style="width:40%;">NAMA BARANG</th>
            <th style="width:22%;">NOMOR BARANG</th>
            <th style="width:10%;">QTY</th>
            <th style="width:10%;">HARGA</th>
            <th style="width:12%;" class="amount">JUMLAH</th>
        </tr>
        @foreach($po->items as $i => $item)
            <tr>
                <td style="text-align:center;">{{ $i + 1 }}</td>
                <td>{{ $item->item_name }}</td>
                <td>{{ $item->item_code ?? '-' }}</td>
                <td style="text-align:center;">{{ rtrim(rtrim(number_format((float) $item->qty, 3, ',', '.'), '0'), ',') }} {{ $item->unit }}</td>
                <td class="amount">{{ number_format((float) $item->price, 0, ',', '.') }}</td>
                <td class="amount">{{ number_format((float) $item->amount, 0, ',', '.') }}</td>
            </tr>
        @endforeach
        <tr class="total-line">
            <td colspan="5">Sub Total</td>
            <td class="amount">Rp {{ number_format((float) $po->subtotal, 0, ',', '.') }}</td>
        </tr>
    </table>

    <div class="sign-row">
        <div class="sign-col">
            Hormat kami,<br>
            <div class="materai">( {{ $lh['name'] }} )</div>
            <div class="sign-space"></div>
            <b>{{ $lh['director'] }}</b><br>{{ $lh['director_title'] }}
        </div>
        <div class="sign-col">
            Penerima / {{ $po->supplier?->name ?? 'Pihak Terkait' }}
            <div class="sign-space"></div>
        </div>
    </div>

    <div class="footer-note">Purchase Order diterbitkan elektronik oleh Bunga Teratai System - {{ now()->translatedFormat('d F Y H:i') }} WITA.</div>
@endsection
