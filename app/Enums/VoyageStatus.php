<?php

namespace App\Enums;

enum VoyageStatus: string
{
    case Draft = 'draft';
    case Planned = 'planned';
    case DocumentPreparation = 'document_preparation';
    case InternalReview = 'internal_review';
    case AwaitingExternalApproval = 'awaiting_external_approval';
    case ReadyForDeparture = 'ready_for_departure';
    case Departed = 'departed';
    case InTransit = 'in_transit';
    case Arrived = 'arrived';
    case VoyageClosure = 'voyage_closure';
    case Completed = 'completed';
    case Delayed = 'delayed';
    case Cancelled = 'cancelled';
}
