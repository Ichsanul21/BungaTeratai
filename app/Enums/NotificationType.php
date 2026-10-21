<?php

namespace App\Enums;

enum NotificationType: string
{
    case DocExpiring = 'dokumen_mendekati_kedaluwarsa';
    case DocExpired = 'dokumen_kedaluwarsa';
    case VoyageIncomplete = 'berkas_perjalanan_belum_lengkap';
    case DocRevision = 'dokumen_membutuhkan_revisi';
    case ApprovalPending = 'persetujuan_internal_menunggu';
    case DepartureSoon = 'jadwal_keberangkatan_mendekat';
    case VoyageDelayed = 'perjalanan_terlambat';
    case ArrivalReportMissing = 'laporan_kedatangan_belum_diisi';
    case ClosureIncomplete = 'penutupan_perjalanan_belum_selesai';
}
