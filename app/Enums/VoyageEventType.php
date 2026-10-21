<?php

namespace App\Enums;

enum VoyageEventType: string
{
    case Created = 'created';
    case Uploaded = 'uploaded';
    case Revision = 'revision';
    case Verified = 'verified';
    case InternalApproved = 'internal_approved';
    case ExternalApproved = 'external_approved';
    case Departed = 'departed';
    case Arrived = 'arrived';
    case Closed = 'closed';
    case Cancelled = 'cancelled';
    case PassengerChange = 'passenger_change';
    case Delayed = 'delayed';
    case StatusChanged = 'status_changed';
}
