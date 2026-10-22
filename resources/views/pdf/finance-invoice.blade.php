@extends('pdf.layout')
@section('title', 'Invoice ' . $invoice->number)

@section('content')
    <h2 class="doc-title">I N V O I C E</h2>
    <div class="doc-no">Nomor: {{ $invoice->number }} &nbsp;&middot;&nbsp; Tanggal: {{ optional($invoice->issue_date)->translatedFormat('d F Y') }}</div>

    <div class="field"><span class="lbl">Kepada Yth.</span><span class="val">: <b>{{ $invoice->customer?->name ?? '—' }}</b><br>{{ $invoice->customer?->address ?? '' }}<br>{{ $invoice->customer?->phone ?? '' }}</span></div>
    <div class="field"><span class="lbl">No. Faktur Pajak</span><span class="val">: {{ $invoice->fp_number ?? '—' }}</span></div>

    <table class="data" style="margin-top:12px;">
        <tr><th style="width:70%;">Description</th><th class="amount" style="width:30%;">Amount</th></tr>
        @foreach($invoice->items as $item)
            <tr>
                <td>{{ $item->description }}{{ $item->qty > 1 ? ' × '.rtrim(rtrim(number_format((float) $item->qty, 2, ',', '.'), '0'), ',') : '' }}</td>
                <td class="amount">Rp {{ number_format((float) $item->amount, 0, ',', '.') }} ,-</td>
            </tr>
        @endforeach
        <tr class="total-line"><td>Sub Total</td><td class="amount">Rp {{ number_format((float) $invoice->subtotal, 0, ',', '.') }} ,-</td></tr>
        <tr><td>PPN {{ $invoice->ppn_rate }}%</td><td class="amount">Rp {{ number_format((float) $invoice->ppn_amount, 0, ',', '.') }} ,-</td></tr>
        @if($invoice->pph23_amount > 0)
            <tr><td>PPh 23 (ditahan)</td><td class="amount">- Rp {{ number_format((float) $invoice->pph23_amount, 0, ',', '.') }} ,-</td></tr>
        @endif
        <tr class="total-line"><td>TOTAL TAGIHAN</td><td class="amount">Rp {{ number_format((float) $invoice->total, 0, ',', '.') }} ,-</td></tr>
    </table>

    <div class="field" style="margin-top:12px;"><span class="lbl">Jatuh Tempo</span><span class="val">: {{ optional($invoice->due_date)->translatedFormat('d F Y') ?? '—' }}</span></div>
    <div class="field"><span class="lbl">Rekening</span><span class="val">: {{ $lh['bank'] }}<br>a.n. {{ $lh['account_holder'] }}</span></div>

    <div class="sign-row">
        <div class="sign-col">
            Hormat kami,<br><div class="materai">( {{ $lh['name'] }} )</div>
            <div class="sign-space"></div>
            <b>{{ $lh['director'] }}</b><br>{{ $lh['director_title'] }}
        </div>
    </div>

    <div class="footer-note">Dicetak melalui PortWind Intelligence — {{ now()->translatedFormat('d F Y H:i') }} WITA.</div>
@endsection
