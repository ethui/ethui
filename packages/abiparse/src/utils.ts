export const EthUnits = [
	"wei",
	"kwei",
	"babbage",
	"mwei",
	"lovelace",
	"gwei",
	"shannon",
	"twei",
	"microether",
	"szabo",
	"pwei",
	"milliether",
	"finney",
	"ether",
] as const;

export type TEthUnit = (typeof EthUnits)[number];

export const ethUnitRegex = new RegExp(`${EthUnits.join("|")}`, "i");

const unitToExponent: { [K in TEthUnit]: bigint } = {
	wei: 0n,
	kwei: 3n,
	babbage: 3n,
	mwei: 6n,
	lovelace: 6n,
	gwei: 9n,
	shannon: 9n,
	twei: 12n,
	szabo: 12n,
	microether: 12n,
	pwei: 15n,
	finney: 15n,
	milliether: 15n,
	ether: 18n,
};

export function parseIntWithUnit(n: bigint, unit: TEthUnit) {
	const exponent = unitToExponent[unit];

	return n * 10n ** exponent;
}
