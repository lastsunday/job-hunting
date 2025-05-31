import { expect, test } from "vitest";

test('test function default param', () => {
    function testFunction({ param = null, otherFunction = defaultOtherFunction } = {}) {
        return {
            param: param,
            otherFunction: otherFunction
        }
    }
    function defaultOtherFunction() {
        return `defaultOtherFunction`;
    }
    expect(testFunction()).toStrictEqual({ param: null, otherFunction: defaultOtherFunction });
    function customFunction() {
        return `customFunction`;
    }
    expect(testFunction({ param: "myParam", otherFunction: customFunction })).toStrictEqual({ param: "myParam", otherFunction: customFunction });
})