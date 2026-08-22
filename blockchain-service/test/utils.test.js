const { isValidBytes32, isValidAddress } = require("../src/utils");

describe("isValidBytes32", () => {
    test("acepta un hash valido (0x + 64 hex)", () => {
        expect(isValidBytes32("0x" + "a".repeat(64))).toBe(true);
    });

    test("rechaza strings sin 0x", () => {
        expect(isValidBytes32("a".repeat(64))).toBe(false);
    });

    test("rechaza largo incorrecto", () => {
        expect(isValidBytes32("0x" + "a".repeat(63))).toBe(false);
    });

    test("rechaza valores que no son string", () => {
        expect(isValidBytes32(12345)).toBe(false);
        expect(isValidBytes32(undefined)).toBe(false);
    });
});

describe("isValidAddress", () => {
    test("acepta un address valido (0x + 40 hex)", () => {
        expect(isValidAddress("0x" + "a".repeat(40))).toBe(true);
    });

    test("rechaza strings sin 0x", () => {
        expect(isValidAddress("a".repeat(40))).toBe(false);
    });

    test("rechaza largo incorrecto", () => {
        expect(isValidAddress("0x" + "a".repeat(33))).toBe(false);
        expect(isValidAddress("0x" + "a".repeat(41))).toBe(false);
    });

    test("rechaza valores que no son string", () => {
        expect(isValidAddress(12345)).toBe(false);
        expect(isValidAddress(undefined)).toBe(false);
    });
});
