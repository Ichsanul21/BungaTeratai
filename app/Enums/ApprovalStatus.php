<?php

namespace App\Enums;

enum ApprovalStatus: string
{
    case Approved = 'approved';
    case RevisionRequired = 'revision_required';
    case Rejected = 'rejected';
}
