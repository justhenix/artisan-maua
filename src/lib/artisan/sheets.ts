import { confidenceStateFor, unresolvedRequiredCount, unresolvedWarnings } from './review';
import type { ReviewBlocker, SheetLineItem, TableCell } from './types';

type SheetLabels = {
	item: string;
	styleCode: string;
	qty: string;
	materialFinish: string;
	confidence: string;
	unresolvedWarnings: string;
	sourceEvidence: string;
	technicalInstructions: string;
	orderNotes: string;
	packed: string;
	packagingSpecifics: string;
	fulfillmentFlags: string;
	pendingResolution: string;
	directShip: string;
	backorder: string;
	splitShipAfterCasting: string;
	resolved?: string;
	needsReview?: string;
	unresolved?: string;
};

function warningRows(blockers: ReviewBlocker[], labels: SheetLabels, width: number): TableCell[][] {
	const count = unresolvedRequiredCount(blockers);
	if (count === 0) return [];
	const message = `${count} required production detail${count === 1 ? '' : 's'} unresolved`;
	return [[labels.pendingResolution, message, ...Array(Math.max(0, width - 2)).fill('')]];
}

function getExportStatus(item: SheetLineItem, labels: SheetLabels): string {
	const state = confidenceStateFor(item);
	if (state === 'resolved') return labels.resolved || 'Ready';
	if (state === 'needs_review') return labels.needsReview || 'Check note';
	return labels.unresolved || 'Needs answer';
}

export function buildProductionRows({
	items,
	blockers,
	labels,
	getTechnicalInstructions
}: {
	items: SheetLineItem[];
	blockers: ReviewBlocker[];
	labels: SheetLabels;
	getTechnicalInstructions?: (item: SheetLineItem) => string;
}): TableCell[][] {
	const header = [
		labels.item,
		labels.styleCode,
		labels.qty,
		labels.materialFinish,
		labels.confidence,
		labels.unresolvedWarnings,
		labels.technicalInstructions,
		labels.orderNotes,
		labels.sourceEvidence
	];

	return [
		header,
		...warningRows(blockers, labels, header.length),
		...items.map((item) => [
			item.item,
			item.styleCode,
			item.qty,
			item.finish,
			getExportStatus(item, labels),
			unresolvedWarnings(item).join('; '),
			getTechnicalInstructions?.(item) ?? '',
			item.notes,
			item.source
		])
	];
}

export function buildPackingRows({
	items,
	blockers,
	packedItems,
	labels,
	getPackagingSpecifics,
	isBackordered
}: {
	items: SheetLineItem[];
	blockers: ReviewBlocker[];
	packedItems: Record<string, boolean>;
	labels: SheetLabels;
	getPackagingSpecifics: (styleCode: string) => string;
	isBackordered: (styleCode: string) => boolean;
}): TableCell[][] {
	const header = [
		labels.item,
		labels.styleCode,
		labels.qty,
		labels.packed,
		labels.packagingSpecifics,
		labels.fulfillmentFlags,
		labels.confidence,
		labels.unresolvedWarnings,
		labels.orderNotes
	];

	return [
		header,
		...warningRows(blockers, labels, header.length),
		...items.map((item) => {
			const backordered = isBackordered(item.styleCode);
			return [
				item.item,
				item.styleCode,
				item.qty,
				packedItems[item.id] ? 'yes' : 'no',
				getPackagingSpecifics(item.styleCode),
				backordered ? `${labels.backorder} - ${labels.splitShipAfterCasting}` : labels.directShip,
				getExportStatus(item, labels),
				unresolvedWarnings(item).join('; '),
				item.notes
			];
		})
	];
}
