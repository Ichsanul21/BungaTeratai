<?php

namespace App\Enums;

enum VerificationStatus: string
{
    case Missing = 'missing';
    case Draft = 'draft';
    case Uploaded = 'uploaded';
    case UnderReview = 'under_review';
    case RevisionRequired = 'revision_required';
    case Verified = 'verified';
    case Rejected = 'rejected';
    case Archived = 'archived';
}
