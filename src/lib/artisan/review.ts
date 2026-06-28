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
		warnings.delete('finish');
	}
	return Array.from(warnings);
}

export function confidenceStateFor(item: SheetLineItem): ConfidenceState {
	if (item.confidenceState) return item.confidenceState;
	return unresolvedWarnings(item).length > 0 ? 'unresolved' : 'resolved';
}

export function allRequiredFieldsResolved(items: SheetLineItem[], blockers: ReviewBlocker[]) {
	if (hasUnresolvedRequiredBlockers(blockers)) {
		return false;
	}
	for (const item of items) {
		const warnings = unresolvedWarnings(item);
		if (
			warnings.includes('style code') ||
			warnings.includes('quantity') ||
			warnings.includes('finish/material') ||
			warnings.includes('finish') ||
			warnings.includes('material/finish')
		) {
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


