const NRP_PATTERN = /^\d{8}$/;
const NRP_EMAIL_DOMAIN = "polri.go.id";

export const NRP_ERROR_MESSAGE = "NRP must be exactly 8 digits";

export function authEmailToNrp(email: string): string | null {
	const normalizedEmail = email.trim().toLowerCase();
	const suffix = `@${NRP_EMAIL_DOMAIN}`;

	if (!normalizedEmail.endsWith(suffix)) {
		return null;
	}

	const nrp = normalizedEmail.slice(0, -suffix.length);
	return NRP_PATTERN.test(nrp) ? nrp : null;
}

export function isValidNrp(nrp: string): boolean {
	return NRP_PATTERN.test(nrp.trim());
}

export function nrpToAuthEmail(nrp: string): string {
	return `${nrp.trim()}@${NRP_EMAIL_DOMAIN}`;
}
