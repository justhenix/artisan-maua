export type ConfidenceState = 'resolved' | 'needs_review' | 'unresolved';

export type ReviewBlocker = {
	id: string;
	impact: 'High impact' | 'Medium impact';
	impactKey: 'highImpact' | 'mediumImpact';
	question: string;
	questionKey: 'starBirdQuestion' | 'birdOfPreyQuestion';
	evidence: string;
	source: string;
	risk: string;
	riskKey: 'starBirdRisk' | 'birdOfPreyRisk';
	options: string[];
	answer: string;
	required?: boolean;
	field?: string;
};

export type SheetLineItem = {
	id: string;
	item: string;
	styleCode: string;
	qty: number;
	finish: string;
	notes: string;
	source: string;
	unitPrice?: number;
	imageUrl?: string;
	confidenceState?: ConfidenceState;
	unresolvedFields?: string[];
};

export type TableCell = string | number | boolean | null | undefined;
