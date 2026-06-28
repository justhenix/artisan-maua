import type { ConfidenceState, ReviewBlocker, SheetLineItem } from './types';

export function hasUnresolvedRequiredBlockers(blockers: Pick<ReviewBlocker, 'answer' | 'required'>[]) {
	return blockers.some((blocker) => (blocker.required ?? true) && !String(blocker.answer ?? '').trim());
}

export function canCreateSheets(blockers: Pick<ReviewBlocker, 'answer' | 'required'>[]) {
	return !hasUnresolvedRequiredBlockers(blockers);
}

export function unresolvedRequiredCount(blockers: Pick<ReviewBlocker, 'answer' | 'required'>[]) {
	return blockers.filter((blocker) => (blocker.required ?? true) && !String(blocker.answer ?? '').trim()).length;
}

export function unresolvedWarnings(item: Pick<SheetLineItem, 'styleCode' | 'qty' | 'finish' | 'unresolvedFields'>) {
	const warnings = new Set<string>(item.unresolvedFields ?? []);
	if (!item.styleCode?.trim()) {
		warnings.add('style code');
	} else {
		warnings.delete('style code');
	}
	if (!Number.isFinite(Number(item.qty)) || Number(item.qty) <= 0) {
		warnings.add('quantity');
	} else {
		warnings.delete('quantity');
	}
	if (!item.finish?.trim()) {
		warnings.add('finish/material');
	} else {
		warnings.delete('finish/material');
		warnings.delete('material/finish');
		warnings.delete('finish');
	}
	return Array.from(warnings);
}

function hasRequiredProductionWarning(warnings: string[]) {
	return (
		warnings.includes('style code') ||
		warnings.includes('quantity') ||
		warnings.includes('finish/material') ||
		warnings.includes('material/finish') ||
		warnings.includes('finish')
	);
}

export function confidenceStateFor(item: SheetLineItem): ConfidenceState {
	const warnings = unresolvedWarnings(item);
	if (hasRequiredProductionWarning(warnings)) return 'unresolved';
	if (warnings.length > 0 || item.confidenceState === 'needs_review') return 'needs_review';
	return 'resolved';
}

export function allRequiredFieldsResolved(items: SheetLineItem[], blockers: ReviewBlocker[]) {
	if (hasUnresolvedRequiredBlockers(blockers)) {
		return false;
	}
	for (const item of items) {
		if (hasRequiredProductionWarning(unresolvedWarnings(item))) {
			return false;
		}
	}
	return true;
}

export function getBlockingMessage(item: SheetLineItem): string | null {
	const warnings = unresolvedWarnings(item);
	const fields: string[] = [];
	if (warnings.includes('style code')) fields.push('style code');
	if (warnings.includes('quantity')) fields.push('quantity');
	if (warnings.includes('finish/material') || warnings.includes('finish')) {
		fields.push(item.id === 'mountain-new' ? 'material/finish' : 'finish');
	}
	if (warnings.includes('size')) fields.push('size');

	const hasHold = item.notes?.toLowerCase().includes('hold');

	if (fields.length === 0 && !hasHold) return null;

	const action = item.id === 'starburst-hat-stud' ? 'choose exact' : 'confirm';
	let msg = '';
	if (fields.length > 0) {
		if (fields.length === 1) {
			msg = `${action} ${fields[0]}`;
		} else {
			msg = `${action} ${fields.slice(0, -1).join(', ')} and ${fields[fields.length - 1]}`;
		}
	}

	if (hasHold) {
		if (msg) msg += ' (on hold)';
		else msg = 'on hold';
	}

	return `${item.item}: ${msg}`;
}

export function mergeAndDeduplicateItems(items: SheetLineItem[]) {
	// First, group items by normalized name
	const groups = new Map<string, SheetLineItem[]>();
	for (const item of items) {
		const key = item.item.toLowerCase().replace(/[\s\-_]/g, '').trim();
		if (!groups.has(key)) {
			groups.set(key, []);
		}
		groups.get(key)!.push(item);
	}

	const deduped: SheetLineItem[] = [];
	const conflicts: { itemId: string; field: string; message: string; evidence: string; sources: string[] }[] = [];

	for (const [key, groupItems] of groups.entries()) {
		if (groupItems.length === 1) {
			deduped.push(groupItems[0]);
			continue;
		}

		// Check if they are from different files
		const uniqueSources = Array.from(new Set(groupItems.map(i => i.source).filter(Boolean)));
		if (uniqueSources.length <= 1) {
			// All from the same file, keep all (could be multiple separate lines in the same PO)
			deduped.push(...groupItems);
			continue;
		}

		// Group by distinct (qty, finish, styleCode)
		const variants: { qty: number; finish: string; styleCode: string; items: SheetLineItem[] }[] = [];
		for (const item of groupItems) {
			const qtyVal = Number(item.qty || 0);
			const finishVal = (item.finish || '').toLowerCase().trim();
			const styleVal = (item.styleCode || '').toLowerCase().trim();

			let found = false;
			for (const v of variants) {
				if (v.qty === qtyVal && v.finish === finishVal && v.styleCode === styleVal) {
					v.items.push(item);
					found = true;
					break;
				}
			}
			if (!found) {
				variants.push({ qty: qtyVal, finish: finishVal, styleCode: styleVal, items: [item] });
			}
		}

		if (variants.length === 1) {
			// Exact duplicates across files! Deduplicate to a single item.
			const primary = variants[0].items[0];
			const sources = Array.from(new Set(groupItems.map(i => i.source).filter(Boolean)));
			primary.source = sources.join(', ');
			deduped.push(primary);
		} else {
			// Conflicts exist between files!
			// Let's identify which fields differ
			const distinctQties = new Set(variants.map(v => v.qty));
			const distinctFinishes = new Set(variants.map(v => v.finish));
			const distinctStyles = new Set(variants.map(v => v.styleCode));

			const conflictSources = Array.from(new Set(groupItems.map(i => i.source).filter(Boolean)));
			const conflictEvidence = groupItems.map(i => `${i.source}: ${i.item} (Qty: ${i.qty}, Finish: ${i.finish || 'unspecified'})`).join(' vs ');

			// Keep the first item as the base, but mark it unresolved/needs review
			const baseItem = groupItems[0];
			baseItem.source = conflictSources.join(', ');

			if (distinctQties.size > 1) {
				conflicts.push({
					itemId: baseItem.id,
					field: 'qty',
					message: `Source files disagree on quantity`,
					evidence: conflictEvidence,
					sources: conflictSources
				});
				baseItem.confidenceState = 'unresolved';
			}
			if (distinctFinishes.size > 1) {
				conflicts.push({
					itemId: baseItem.id,
					field: 'finish/material',
					message: `Source files disagree on finish/material`,
					evidence: conflictEvidence,
					sources: conflictSources
				});
				baseItem.confidenceState = 'unresolved';
			}
			if (distinctStyles.size > 1) {
				conflicts.push({
					itemId: baseItem.id,
					field: 'style code',
					message: `Source files disagree on style code`,
					evidence: conflictEvidence,
					sources: conflictSources
				});
				baseItem.confidenceState = 'unresolved';
			}

			deduped.push(baseItem);
		}
	}

	return { deduped, conflicts };
}

