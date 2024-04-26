import { expect, test } from "bun:test";

import { parse } from "./";

test("uints", () => {
	expect(parse("1234")).toEqual(1234n);
	expect(parse("1234")).toEqual(1234n);
});

test("ints", () => {
	expect(parse("-1")).toEqual(-1n);
});

test("quoted strings", () => {
	expect(parse('"asd"')).toEqual("asd");
	expect(parse('"asd\\"dsa"')).toEqual('asd"dsa');
});

test("unquoted strings", () => {
	expect(parse("asd")).toEqual("asd");
});

test("arrays", () => {
	expect(parse("[]")).toEqual([]);
	expect(parse("[1,2]")).toEqual([1n, 2n]);
});

test("arrays of quoted strings", () => {
	expect(parse('["asd","dsa"]')).toEqual(["asd", "dsa"]);
});

test("uints", () => {
	expect(parse("[[[1]],2]")).toEqual([[[1n]], 2n]);
});

test("bytes", () => {
	expect(parse("0x1234")).toEqual("0x1234");
});

test("arbitrarily nested values", () => {
	expect(parse('[0x1234, "asd", [1, 2, 3]]')).toEqual([
		"0x1234",
		"asd",
		[1n, 2n, 3n],
	]);
});

test("unquoted strings inside nested values", () => {
	expect(parse("[asd]")).toEqual(["asd"]);
	expect(parse("[asd,dsa]")).toEqual(["asd", "dsa"]);
	expect(parse("[[1],dsa]")).toEqual([[1n], "dsa"]);
	expect(parse("[[foo],[[bar]]]")).toEqual([["foo"], [["bar"]]]);
});

test("number with subunit", () => {
	expect(parse("1 wei")).toEqual(1n);
	expect(parse("1 kwei")).toEqual(1000n);
	expect(parse("1 mwei")).toEqual(1000000n);
	expect(parse("1 gwei")).toEqual(1n * 10n ** 9n);
	expect(parse("1 szabo")).toEqual(1n * 10n ** 12n);
	expect(parse("1 ether")).toEqual(1n * 10n ** 18n);
});
