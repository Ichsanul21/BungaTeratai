@extends('pdf.layout')
@section('title', 'Invoice ' . $invoice->number)

@section('content')
    <h2 class="doc-title">I N V O I C E</h2>
    <div class="doc-no">Nomor: {{ $invoice->number }} &nbsp;&middot;&nbsp; Tanggal: {{ optional($invoice->issue_date)->translatedFormat('d F Y') }}
        @if($kind === 'pelunasan') &nbsp;&middot;&nbsp; <b>PELUNASAN (100%)</b>
        @elseif($kind === 'dp100') &nbsp;&middot;&nbsp; <b>DP (100%)</b>
        @else &nbsp;&middot;&nbsp; <b>DOWN PAYMENT (50%)</b> @endif
    </div>

    <div class="field"><span class="lbl">Kepada Yth.</span><span class="val">: <b>{{ $invoice->customer?->name ?? '—' }}</b><br>{{ $invoice->customer?->address ?? '' }}</span></div>

    <table class="data">
        <tr>
            <th style="width:30%;">Kapal</th>
            <td>{{ $voyage?->vessel?->vessel_name }}{{ $voyage?->relationships->first() ? ' - '.$voyage->relationships->first()->barge?->vessel_name : '' }}</td>
        </tr>
        <tr>
            <th>Kontrak</th>
            <td>SPAL No: {{ $voyage?->spal_number ?? '—' }} @if($voyage?->spal_date) Tanggal : {{ $voyage->spal_date->translatedFormat('d F Y') }} @endif</td>
        </tr>
        <tr>
            <th>Periode</th>
            <td>{{ optional($voyage?->planned_departure)->translatedFormat('d F Y') }} s/d {{ optional($voyage?->actual_arrival)->translatedFormat('d F Y') }}</td>
        </tr>
        <tr>
            <th>Pelabuhan</th>
            <td>{{ $voyage?->jetty_loading ?? $voyage?->origin }} → {{ $voyage?->jetty_discharge ?? $voyage?->destination }}</td>
        </tr>
        @if($kind === 'pelunasan')
        <tr>
            <th>DSR (Total Muatan)</th>
            <td><b>{{ $dsr ? number_format((float) $dsr, 0, ',', '.').' MT' : '— MT' }}</b> — sesuai DSR dari Nakhoda</td>
        </tr>
        @endif
        <tr>
            <th>PPh</th>
            <td>{{ number_format((float) $invoice->pph_rate * 100, 1) }}% &nbsp;·&nbsp; PPN {{ $invoice->ppn_rate }}%</td>
        </tr>
    </table>

    <table class="data" style="margin-top:14px;">
        <tr><th style="width:70%;">Description</th><th class="amount" style="width:30%;">Amount</th></tr>
        @if($kind === 'dp' || $kind === 'dp100')
            <tr><td>Down Payment Freight Charter Contract ({{ $kind === 'dp100' ? '100%' : '50%' }} dari total freight)</td>
                <td class="amount">Rp {{ number_format($kind === 'dp100' ? (float) $invoice->subtotal : (float) $invoice->subtotal, 0, ',', '.') }} ,-</td></tr>
        @elseif($kind === 'pelunasan')
            <tr><td>Pelunasan Freight Charter Contract (sisa 50%) — DSR {{ $dsr ? number_format((float) $dsr, 0, ',', '.').' MT' : '' }}</td>
                <td class="amount">Rp {{ number_format((float) $invoice->subtotal, 0, ',', '.') }} ,-</td></tr>
        @else
            @foreach($invoice->items as $item)
                <tr><td>{{ $item->description }}</td><td class="amount">Rp {{ number_format((float) $item->amount, 0, ',', '.') }} ,-</td></tr>
            @endforeach
        @endif
        <tr class="total-line"><td>Sub Total</td><td class="amount">Rp {{ number_format((float) $invoice->subtotal, 0, ',', '.') }} ,-</td></tr>
        <tr><td>PPN {{ $invoice->ppn_rate }}%</td><td class="amount">Rp {{ number_format((float) $invoice->ppn_amount, 0, ',', '.') }} ,-</td></tr>
        <tr><td>PPh {{ number_format((float) $invoice->pph_rate * 100, 1) }}% (ditahan)</td><td class="amount">- Rp {{ number_format((float) $invoice->pph23_amount, 0, ',', '.') }} ,-</td></tr>
        <tr class="total-line"><td>TOTAL TAGIHAN</td><td class="amount">Rp {{ number_format((float) $invoice->total, 0, ',', '.') }} ,-</td></tr>
    </table>

    <div class="field" style="margin-top:12px;"><span class="lbl">Rekening Pembayaran</span><span class="val">: {{ $lh['bank'] }}<br>a.n. {{ $lh['account_holder'] }}</span></div>
    @if($invoice->fp_number)
        <div class="field"><span class="lbl">No. Faktur Pajak</span><span class="val">: {{ $invoice->fp_number }}</span></div>
    @endif

    <div class="sign-row">
        <div class="sign-col">
            Hormat kami,<br><div class="materai">( {{ $lh['name'] }} )</div>
            <div class="sign-space"></div>
            <b>{{ $lh['director'] }}</b><br>{{ $lh['director_title'] }}
        </div>
    </div>

    <div class="footer-note">Dicetak melalui Bunga Teratai System — {{ now()->translatedFormat('d F Y H:i') }} WITA.</div>
@endsection
