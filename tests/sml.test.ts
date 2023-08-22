/* eslint-disable no-irregular-whitespace */
import { ReliableTxtEncoding } from "@stenway/reliabletxt"
import { Uint8ArrayBuilder, WsvDocument, WsvLine } from "@stenway/wsv"
import { BinarySmlDecoder, BinarySmlEncoder, SmlAttribute, SmlDocument, SmlElement, SmlEmptyNode, SmlNamedNode, SmlNode, SmlParser, SmlParserError, SyncWsvDocumentLineIterator, SyncWsvJaggedArrayLineIterator, Uint8ArrayReader, WsvLineIterator } from "../src/sml.js"

describe("SmlNode.isElement + isAttribute + isEmptyNode + isNamedNode", () => {
	test.each([
		[new SmlElement("Test"), true, false, false, true, true, false],
		[new SmlAttribute("Test", [null]), false, true, false, true, false, true],
		[new SmlEmptyNode(), false, false, true, false, false, false],
	])(
		"Given %p returns %p, %p, %p",
		(node: SmlNode, output1, output2, output3, output4, output5, output6) => {
			expect(node.isElement()).toEqual(output1)
			expect(node.isAttribute()).toEqual(output2)
			expect(node.isEmptyNode()).toEqual(output3)
			expect(node.isNamedNode()).toEqual(output4)
			expect(node.isElementWithName("Test")).toEqual(output5)
			expect(node.isAttributeWithName("Test")).toEqual(output6)
		}
	)
})

describe("SmlNode.whitespaces + hasWhitespaces", () => {
	test.each([
		[new SmlElement("Test")],
		[new SmlAttribute("Test", [null])],
		[new SmlEmptyNode()],
	])(
		"Given %p",
		(node: SmlNode) => {
			expect(node.hasWhitespaces).toEqual(false)
			node.whitespaces = [" ", "\t"]
			expect(node.hasWhitespaces).toEqual(true)
			expect(node.whitespaces).toEqual([" ", "\t"])
			const whitespaces = node.whitespaces
			whitespaces[0] = "a"
			expect(node.whitespaces).toEqual([" ", "\t"])
			expect(() => { node.whitespaces = whitespaces }).toThrow()
			node.whitespaces = null
			expect(node.whitespaces).toEqual(null)
			expect(node.hasWhitespaces).toEqual(false)
		}
	)
})

describe("SmlNode.comment + hasComment", () => {
	test.each([
		[new SmlElement("Test")],
		[new SmlAttribute("Test", [null])],
		[new SmlEmptyNode()],
	])(
		"Given %p",
		(node: SmlNode) => {
			expect(node.hasComment).toEqual(false)
			node.comment = "Test"
			expect(node.hasComment).toEqual(true)
			expect(node.comment).toEqual("Test")
			expect(() => { node.comment = "\n" }).toThrow()
			node.comment = null
			expect(node.comment).toEqual(null)
			expect(node.hasComment).toEqual(false)
		}
	)
})

describe("SmlNode.minify", () => {
	test.each([
		[new SmlElement("Test")],
		[new SmlAttribute("Test", [null])],
		[new SmlEmptyNode()],
	])(
		"Given %p",
		(node: SmlNode) => {
			node.whitespaces = []
			node.comment = "Test"
			expect(node.hasWhitespaces).toEqual(true)
			expect(node.hasComment).toEqual(true)
			node.minify()
			expect(node.hasWhitespaces).toEqual(false)
			expect(node.hasComment).toEqual(false)
		}
	)
})

describe("SmlNode.internalSetWhitespacesAndComment", () => {
	test.each([
		[new SmlElement("Test")],
		[new SmlAttribute("Test", [null])],
		[new SmlEmptyNode()],
	])(
		"Given %p",
		(node: SmlNode) => {
			SmlNode.internalSetWhitespacesAndComment(node, ["a"], "\n")
			expect(node.whitespaces).toEqual(["a"])
			expect(node.comment).toEqual("\n")
		}
	)
})

// ----------------------------------------------------------------------

describe("SmlEmptyNode Constructor", () => {
	test.each([
		[null, null, ""],
		[[null], null, ""],
		[[""], null, ""],
		[[" "], null, " "],
		[["  "], null, "  "],
		[["  ", "  "], null, "  "],
		[null, "", "#"],
		[[null], "", "#"],
		[[""], "", "#"],
		[[" "], "", " #"],
		[["  "], "", "  #"],
		[["  ", "  "], "", "  #"],
		[null, "c", "#c"],
		[[null], "c", "#c"],
		[[""], "c", "#c"],
		[[" "], "c", " #c"],
		[["  "], "c", "  #c"],
		[["  ", "  "], "c", "  #c"],
	])(
		"Given %p and %p returns %p",
		(input1, input2, output) => {
			const node = new SmlEmptyNode(input1, input2)
			expect(node.whitespaces).toEqual(input1)
			expect(node.comment).toEqual(input2)
			expect(node.toString()).toEqual(output)
		}
	)
})

// ----------------------------------------------------------------------

describe("SmlNamedNode.hasName", () => {
	test.each([
		[new SmlElement("Test")],
		[new SmlAttribute("Test", [null])],
	])(
		"Given %p",
		(node: SmlNamedNode) => {
			expect(node.hasName("Test")).toEqual(true)
			expect(node.hasName("test")).toEqual(true)
			expect(node.hasName("TEST")).toEqual(true)
			expect(node.hasName("tEsT")).toEqual(true)
			expect(node.name === "Test").toEqual(true)
			expect(node.name !== "test").toEqual(true)
		}
	)
})

// ----------------------------------------------------------------------

describe("SmlAttribute Constructor", () => {
	test.each([
		["Test", [null], "Test -"],
		["", [null], `"" -`],
		["Test", ["Value1"], "Test Value1"],
		["Test", ["Value1", "Value2"], "Test Value1 Value2"],
		["Test", ["Value1", null], "Test Value1 -"],
	])(
		"Given %p and %p returns %p",
		(input1, input2, output) => {
			const attribute = new SmlAttribute(input1, input2)
			expect(attribute.name).toEqual(input1)
			expect(attribute.values).toEqual(input2)
			expect(attribute.toString()).toEqual(output)
		}
	)

	test("Throws", () => {
		expect(() => new SmlAttribute("Test", [])).toThrow()
	})
})

describe("SmlAttribute.values + valueCount", () => {
	test.each([
		[[null], 1],
		[["Value1"], 1],
		[["Value1", "Value2"], 2],
		[["Value1", null], 2],
	])(
		"Given %p returns %p",
		(input, output) => {
			const attribute = new SmlAttribute("Test", [null])
			attribute.values = input
			expect(attribute.values).toEqual(input)
			expect(attribute.valueCount).toEqual(output)

			const values = attribute.values
			values[0] = "Test"
			expect(attribute.values).toEqual(input)
		}
	)

	test("Throws", () => {
		const attribute = new SmlAttribute("Test", [null])
		expect(() => attribute.values = []).toThrow()
	})
})

describe("SmlAttribute.assureName", () => {
	test("Assured", () => {
		const attribute = new SmlAttribute("Test", [null])
		expect(attribute.assureName("Test")).toEqual(attribute)
	})

	test("Throws", () => {
		expect(() => new SmlAttribute("Test", [null]).assureName("Test2")).toThrow()
	})
})

describe("SmlAttribute.assureValueCount", () => {
	test("Assured", () => {
		const attribute = new SmlAttribute("Test", [null])
		expect(attribute.assureValueCount(1)).toEqual(attribute)
	})

	test("Throws", () => {
		expect(() => new SmlAttribute("Test", [null]).assureValueCount(2)).toThrow()
	})
})

describe("SmlAttribute.assureValueCountMinMax", () => {
	test.each([
		[[null], 1, null],
		[[null], null, 1],
		[[null], 1, 1],
		[["Value1"], 1, null],
		[["Value1"], null, 1],
		[["Value1"], 1, 1],
		[["Value1", "Value2"], 1, null],
		[["Value1", "Value2"], 2, null],
		[["Value1", "Value2"], null, 2],
		[["Value1", "Value2"], null, 3],
		[["Value1", "Value2"], 1, 2],
		[["Value1", "Value2"], 2, 3],
	])(
		"Given %p, %p and %p",
		(input1, input2, input3) => {
			new SmlAttribute("Test", input1).assureValueCountMinMax(input2, input3)
		}
	)

	test.each([
		[[null], 0, null],
		[[null], 2, null],
		[[null], null, 0],
		[[null], 2, 2],
		[["Value1", "Value2"], null, 1],
	])(
		"Given %p, %p and %p throws",
		(input1, input2, input3) => {
			expect(() => new SmlAttribute("Test", input1).assureValueCountMinMax(input2, input3)).toThrow()
		}
	)

	test("Only min", () => {
		new SmlAttribute("Test", [null]).assureValueCountMinMax(1)
	})
})

describe("SmlAttribute.getNullableString", () => {
	test.each([
		[[null], 0, null],
		[["Value1"], 0, "Value1"],
		[["Value1", "Value2"], 1, "Value2"],
	])(
		"Given %p and %p returns %p",
		(input1, input2, output) => {
			expect(new SmlAttribute("Test", input1).getNullableString(input2)).toEqual(output)
		}
	)

	test("No index", () => {
		expect(new SmlAttribute("Test", ["Value1", "Value2"]).getNullableString()).toEqual("Value1")
	})

	test.each([
		[[null], 1],
		[[null], -1],
	])(
		"Given %p and %p throws",
		(input1, input2) => {
			expect(() => new SmlAttribute("Test", input1).getNullableString(input2)).toThrow()
		}
	)
})

describe("SmlAttribute.getString", () => {
	test.each([
		[["Value1"], 0, "Value1"],
		[["Value1", "Value2"], 1, "Value2"],
	])(
		"Given %p and %p returns %p",
		(input1, input2, output) => {
			expect(new SmlAttribute("Test", input1).getString(input2)).toEqual(output)
		}
	)

	test("No index", () => {
		expect(new SmlAttribute("Test", ["Value1", "Value2"]).getString()).toEqual("Value1")
	})

	test.each([
		[[null], 1],
		[[null], -1],
		[[null], 0],
	])(
		"Given %p and %p throws",
		(input1, input2) => {
			expect(() => new SmlAttribute("Test", input1).getString(input2)).toThrow()
		}
	)
})

describe("SmlAttribute.getNullableStringArray", () => {
	test.each([
		[["Value1"], 0, ["Value1"]],
		[["Value1", "Value2"], 0, ["Value1", "Value2"]],
		[["Value1", "Value2"], 1, ["Value2"]],
		[[null], 0, [null]],
		[[null, "Value2"], 0, [null, "Value2"]],
		[[null, "Value2"], 1, ["Value2"]],
	])(
		"Given %p and %p returns %p",
		(input1, input2, output) => {
			const attribute = new SmlAttribute("Test", input1)
			const array = attribute.getNullableStringArray(input2)
			expect(array).toEqual(output)
			array[0] = "Test"
			expect(attribute.values).toEqual(input1)
		}
	)

	test("No index", () => {
		expect(new SmlAttribute("Test", ["Value1", null]).getNullableStringArray()).toEqual(["Value1", null])
	})

	test.each([
		[[null], 2],
		[[null], -1],
		[["Value1", "Value2"], 2],
	])(
		"Given %p and %p throws",
		(input1, input2) => {
			expect(() => new SmlAttribute("Test", input1).getNullableStringArray(input2)).toThrow()
		}
	)
})

describe("SmlAttribute.getStringArray", () => {
	test.each([
		[["Value1"], 0, ["Value1"]],
		[["Value1", "Value2"], 0, ["Value1", "Value2"]],
		[["Value1", "Value2"], 1, ["Value2"]],
	])(
		"Given %p and %p returns %p",
		(input1, input2, output) => {
			const attribute = new SmlAttribute("Test", input1)
			const array = attribute.getStringArray(input2)
			expect(array).toEqual(output)
			array[0] = "Test"
			expect(attribute.values).toEqual(input1)
		}
	)

	test("No index", () => {
		expect(new SmlAttribute("Test", ["Value1", "Value2"]).getStringArray()).toEqual(["Value1", "Value2"])
	})

	test.each([
		[["Value1"], 2],
		[["Value1"], -1],
		[[null], 0],
		[["Value1", "Value2"], 2],
	])(
		"Given %p and %p throws",
		(input1, input2) => {
			expect(() => new SmlAttribute("Test", input1).getStringArray(input2)).toThrow()
		}
	)
})

describe("SmlAttribute.getBool", () => {
	test.each([
		[["true"], 0, true],
		[["TRUE"], 0, true],
		[["true", "Value2"], 0, true],
		[["Value1", "True"], 1, true],
		[["false"], 0, false],
		[["FALSE"], 0, false],
	])(
		"Given %p and %p returns %p",
		(input1, input2, output) => {
			expect(new SmlAttribute("Test", input1).getBool(input2)).toEqual(output)
		}
	)

	test("No index", () => {
		expect(new SmlAttribute("Test", ["true", "Value2"]).getBool()).toEqual(true)
	})

	test.each([
		[[null], 0],
		[["Test"], 0],
	])(
		"Given %p and %p throws",
		(input1, input2) => {
			expect(() => new SmlAttribute("Test", input1).getBool(input2)).toThrow()
		}
	)
})

describe("SmlAttribute.getInt", () => {
	test.each([
		[["0"], 0, 0],
		[["1"], 0, 1],
		[["10"], 0, 10],
		[["+10"], 0, 10],
		[["-10"], 0, -10],
		[["10", "Value2"], 0, 10],
		[["Value1", "10"], 1, 10],
	])(
		"Given %p and %p returns %p",
		(input1, input2, output) => {
			expect(new SmlAttribute("Test", input1).getInt(input2)).toEqual(output)
		}
	)

	test("No index", () => {
		expect(new SmlAttribute("Test", ["10", "Value2"]).getInt()).toEqual(10)
	})

	test.each([
		[[null], 0],
		[["Test"], 0],
		[["10.1"], 0],
	])(
		"Given %p and %p throws",
		(input1, input2) => {
			expect(() => new SmlAttribute("Test", input1).getInt(input2)).toThrow()
		}
	)
})

describe("SmlAttribute.getFloat", () => {
	test.each([
		[["0"], 0, 0],
		[["1"], 0, 1],
		[["10"], 0, 10],
		[["+10"], 0, 10],
		[["-10"], 0, -10],
		[["0.1"], 0, 0.1],
		[["0.1234"], 0, 0.1234],
		[["-123.1234"], 0, -123.1234],
		[["0.0"], 0, 0],
		[["1.2E+3"], 0, 1200],
		[["1.2e3"], 0, 1200],
		[["1.2e-2"], 0, 0.012],
		[["10", "Value2"], 0, 10],
		[["Value1", "10"], 1, 10],
	])(
		"Given %p and %p returns %p",
		(input1, input2, output) => {
			expect(new SmlAttribute("Test", input1).getFloat(input2)).toEqual(output)
		}
	)

	test("No index", () => {
		expect(new SmlAttribute("Test", ["10.0", "Value2"]).getFloat()).toEqual(10)
	})

	test.each([
		[[null], 0],
		[["Test"], 0],
		[["10."], 0],
		[["10.1."], 0],
		[[".1"], 0],
	])(
		"Given %p and %p throws",
		(input1, input2) => {
			expect(() => new SmlAttribute("Test", input1).getFloat(input2)).toThrow()
		}
	)
})

describe("SmlAttribute.getEnum", () => {
	test.each([
		[["Value1"], 0, 0],
		[["Value1", "Value2"], 0, 0],
		[["Value1", "Value2"], 1, 1],
		[["VALUE1", "Value2"], 0, 0],
		[["Value1", "VALUE2"], 1, 1],
	])(
		"Given %p and %p returns %p",
		(input1, input2, output) => {
			expect(new SmlAttribute("Test", input1).getEnum(["Value1", "Value2"], input2)).toEqual(output)
		}
	)

	test("No index", () => {
		expect(new SmlAttribute("Test", ["Value1", "Value2"]).getEnum(["Value1", "Value2"])).toEqual(0)
	})

	test.each([
		[[null], 0],
		[["Test"], 0],
	])(
		"Given %p and %p throws",
		(input1, input2) => {
			expect(() => new SmlAttribute("Test", input1).getEnum(["Value1", "Value2"], input2)).toThrow()
		}
	)
})

describe("SmlAttribute.getBytes", () => {
	test.each([
		[["Base64||"], 0, []],
		[["Base64|TWFuTQ|"], 0, [0x4d, 0x61, 0x6e, 0x4d]],
	])(
		"Given %p and %p returns %p",
		(input1, input2, output) => {
			expect(new SmlAttribute("Test", input1).getBytes(input2)).toEqual(new Uint8Array(output))
		}
	)

	test("No index", () => {
		expect(new SmlAttribute("Test", ["Base64||"]).getBytes()).toEqual(new Uint8Array([]))
	})

	test.each([
		[[null]],
		[["Test"]],
	])(
		"Given %p and %p throws",
		(input1) => {
			expect(() => new SmlAttribute("Test", input1).getBytes()).toThrow()
		}
	)
})

describe("SmlAttribute.asNullableString", () => {
	test.each([
		[["Value1"], "Value1"],
		[[null], null],
	])(
		"Given %p returns %p",
		(input, output) => {
			expect(new SmlAttribute("Test", input).asNullableString()).toEqual(output)
		}
	)

	test.each([
		[["Value1", "Value2"]],
	])(
		"Given %p throws",
		(input) => {
			expect(() => new SmlAttribute("Test", input).asNullableString()).toThrow()
		}
	)
})

describe("SmlAttribute.asString", () => {
	test.each([
		[["Value1"], "Value1"],
	])(
		"Given %p returns %p",
		(input, output) => {
			expect(new SmlAttribute("Test", input).asString()).toEqual(output)
		}
	)

	test.each([
		[[null]],
		[["Value1", "Value2"]],
	])(
		"Given %p throws",
		(input) => {
			expect(() => new SmlAttribute("Test", input).asString()).toThrow()
		}
	)
})

describe("SmlAttribute.asNullableStringArray", () => {
	test.each([
		[["Value1"], null, null],
		[[null], null, null],
		[["Value1", "Value2"], null, null],
		[["Value1"], 1, null],
		[[null], 1, null],
		[["Value1", "Value2"], 2, null],
		[["Value1"], 1, 1],
		[[null], 1, 1],
		[["Value1", "Value2"], 2, 2],
	])(
		"Given %p, %p and %p",
		(input1, input2, input3) => {
			expect(new SmlAttribute("Test", input1).asNullableStringArray(input2, input3)).toEqual(input1)
		}
	)

	test("No arguments", () => {
		expect(new SmlAttribute("Test", ["Value1", "Value2"]).asNullableStringArray()).toEqual(["Value1", "Value2"])
	})

	test.each([
		[["Value1", "Value2"], 3, 3],
	])(
		"Given %p throws",
		(input1, input2, input3) => {
			expect(() => new SmlAttribute("Test", input1).asNullableStringArray(input2, input3)).toThrow()
		}
	)
})

describe("SmlAttribute.asStringArray", () => {
	test.each([
		[["Value1"], null, null],
		[["Value1", "Value2"], null, null],
		[["Value1"], 1, null],
		[["Value1", "Value2"], 2, null],
		[["Value1"], 1, 1],
		[["Value1", "Value2"], 2, 2],
	])(
		"Given %p, %p and %p",
		(input1, input2, input3) => {
			expect(new SmlAttribute("Test", input1).asStringArray(input2, input3)).toEqual(input1)
		}
	)

	test("No arguments", () => {
		expect(new SmlAttribute("Test", ["Value1", "Value2"]).asStringArray()).toEqual(["Value1", "Value2"])
	})

	test.each([
		[[null], null, null],
		[[null], 1, null],
		[[null], 1, 1],
		[["Value1", "Value2"], 3, 3],
	])(
		"Given %p throws",
		(input1, input2, input3) => {
			expect(() => new SmlAttribute("Test", input1).asStringArray(input2, input3)).toThrow()
		}
	)
})

describe("SmlAttribute.asBool", () => {
	test.each([
		[["True"], true],
		[["false"], false],
	])(
		"Given %p returns %p",
		(input, output) => {
			expect(new SmlAttribute("Test", input).asBool()).toEqual(output)
		}
	)

	test.each([
		[[null]],
		[["1"]],
		[["0"]],
		[["Value1", "Value2"]],
	])(
		"Given %p throws",
		(input) => {
			expect(() => new SmlAttribute("Test", input).asBool()).toThrow()
		}
	)
})

describe("SmlAttribute.asInt", () => {
	test.each([
		[["0"], 0],
		[["1"], 1],
		[["+10"], 10],
		[["-10"], -10],
	])(
		"Given %p returns %p",
		(input, output) => {
			expect(new SmlAttribute("Test", input).asInt()).toEqual(output)
		}
	)

	test.each([
		[[null]],
		[["10.2"]],
		[["true"]],
		[["false"]],
		[["Value1", "Value2"]],
	])(
		"Given %p throws",
		(input) => {
			expect(() => new SmlAttribute("Test", input).asInt()).toThrow()
		}
	)
})

describe("SmlAttribute.asFloat", () => {
	test.each([
		[["0"], 0],
		[["1"], 1],
		[["+10"], 10],
		[["-10"], -10],
		[["1.2"], 1.2],
		[["-1.2e-2"], -0.012],
	])(
		"Given %p returns %p",
		(input, output) => {
			expect(new SmlAttribute("Test", input).asFloat()).toEqual(output)
		}
	)

	test.each([
		[[null]],
		[["true"]],
		[["false"]],
		[["Value1", "Value2"]],
	])(
		"Given %p throws",
		(input) => {
			expect(() => new SmlAttribute("Test", input).asFloat()).toThrow()
		}
	)
})

describe("SmlAttribute.asEnum", () => {
	test.each([
		[["Value1"], 0],
		[["Value2"], 1],
	])(
		"Given %p returns %p",
		(input, output) => {
			expect(new SmlAttribute("Test", input).asEnum(["Value1", "Value2"])).toEqual(output)
		}
	)

	test.each([
		[[null]],
		[["true"]],
		[["Value1", "Value2"]],
	])(
		"Given %p throws",
		(input) => {
			expect(() => new SmlAttribute("Test", input).asEnum(["Value1", "Value2"])).toThrow()
		}
	)
})

describe("SmlAttribute.asBytes", () => {
	test.each([
		[["Base64||"], []],
		[["Base64|TWFuTQ|"], [0x4d, 0x61, 0x6e, 0x4d]],
	])(
		"Given %p returns %p",
		(input, output) => {
			expect(new SmlAttribute("Test", input).asBytes()).toEqual(new Uint8Array(output))
		}
	)

	test.each([
		[[null]],
		[["Test"]],
		[["Value1", "Value2"]],
	])(
		"Given %p throws",
		(input) => {
			expect(() => new SmlAttribute("Test", input).asBytes()).toThrow()
		}
	)
})

describe("SmlAttribute.asIntArray", () => {
	test.each([
		[["10"], null, null, [10]],
		[["10", "20"], null, null, [10, 20]],
		[["10"], 1, null, [10]],
		[["10", "20"], 2, null, [10, 20]],
		[["10"], 1, 1, [10]],
		[["10", "20"], 2, 2, [10, 20]],
	])(
		"Given %p, %p and %p returns %p",
		(input1, input2, input3, output) => {
			expect(new SmlAttribute("Test", input1).asIntArray(input2, input3)).toEqual(output)
		}
	)

	test("No arguments", () => {
		expect(new SmlAttribute("Test", ["10", "20"]).asIntArray()).toEqual([10, 20])
	})

	test.each([
		[[null], null, null],
		[["ten"], null, null],
		[["10.2"], null, null],
		[[null], 1, null],
		[[null], 1, 1],
		[["10", "20"], 3, 3],
	])(
		"Given %p throws",
		(input1, input2, input3) => {
			expect(() => new SmlAttribute("Test", input1).asIntArray(input2, input3)).toThrow()
		}
	)
})

describe("SmlAttribute.asFloatArray", () => {
	test.each([
		[["10"], null, null, [10]],
		[["10", "20.0"], null, null, [10, 20]],
		[["10"], 1, null, [10]],
		[["10", "20.0"], 2, null, [10, 20]],
		[["10"], 1, 1, [10]],
		[["10", "20.0"], 2, 2, [10, 20]],
	])(
		"Given %p, %p and %p returns %p",
		(input1, input2, input3, output) => {
			expect(new SmlAttribute("Test", input1).asFloatArray(input2, input3)).toEqual(output)
		}
	)

	test("No arguments", () => {
		expect(new SmlAttribute("Test", ["10", "20.0"]).asFloatArray()).toEqual([10, 20])
	})

	test.each([
		[[null], null, null],
		[["ten"], null, null],
		[[null], 1, null],
		[[null], 1, 1],
		[["10", "20"], 3, 3],
	])(
		"Given %p throws",
		(input1, input2, input3) => {
			expect(() => new SmlAttribute("Test", input1).asFloatArray(input2, input3)).toThrow()
		}
	)
})

describe("SmlAttribute.isNullValue", () => {
	test.each([
		[[null], true],
		[["Value1"], false],
		[["Value1", "Value2"], false],
		[[null, "Value2"], false],
		[["Value1", null], false],
	])(
		"Given %p returns %p",
		(input, output) => {
			expect(new SmlAttribute("Test", input).isNullValue()).toEqual(output)
		}
	)
})

describe("SmlAttribute.setNullableString", () => {
	test.each([
		[null],
		[""],
		["Value"],
	])(
		"Given %p",
		(input) => {
			expect(new SmlAttribute("Test").setNullableString(input).values).toEqual([input])
			expect(new SmlAttribute("Test").setNullableString(input, 0).values).toEqual([input])
			expect(new SmlAttribute("Test", [null, null]).setNullableString(input, 1).values).toEqual([null, input])
		}
	)

	test("Throws", () => {
		expect(() => new SmlAttribute("Test").setNullableString("Value", 1)).toThrowError()
	})
})

describe("SmlAttribute.setString", () => {
	test.each([
		[""],
		["Value"],
	])(
		"Given %p",
		(input) => {
			expect(new SmlAttribute("Test").setString(input).values).toEqual([input])
		}
	)
})

describe("SmlAttribute.setBool", () => {
	test.each([
		[true, "true"],
		[false, "false"],
	])(
		"Given %p returns %p",
		(input, output) => {
			expect(new SmlAttribute("Test").setBool(input).values).toEqual([output])
		}
	)
})

describe("SmlAttribute.setInt", () => {
	test.each([
		[0, "0"],
		[1, "1"],
		[1.0, "1"],
		[-0.0, "0"],
		[12345, "12345"],
	])(
		"Given %p returns %p",
		(input, output) => {
			expect(new SmlAttribute("Test").setInt(input).values).toEqual([output])
		}
	)

	test.each([
		[0.1],
		[NaN],
		[+Infinity],
		[-Infinity],
	])(
		"Given %p throws",
		(input) => {
			expect(() => new SmlAttribute("Test").setInt(input)).toThrowError()
		}
	)
})

describe("SmlAttribute.setFloat", () => {
	test.each([
		[0, "0"],
		[1, "1"],
		[1.0, "1"],
		[-0.0, "0"],
		[12345, "12345"],
		[1.234, "1.234"],
		[-123.4, "-123.4"],
	])(
		"Given %p returns %p",
		(input, output) => {
			expect(new SmlAttribute("Test").setFloat(input).values).toEqual([output])
		}
	)

	test.each([
		[NaN],
		[+Infinity],
		[-Infinity],
	])(
		"Given %p throws",
		(input) => {
			expect(() => new SmlAttribute("Test").setFloat(input)).toThrowError()
		}
	)
})

describe("SmlAttribute.setEnum", () => {
	test.each([
		[0, "Value1"],
		[1, "Value2"],
	])(
		"Given %p returns %p",
		(input, output) => {
			expect(new SmlAttribute("Test").setEnum(input, ["Value1", "Value2"]).values).toEqual([output])
		}
	)

	test.each([
		[-1],
		[2],
	])(
		"Given %p throws",
		(input) => {
			expect(() => new SmlAttribute("Test").setEnum(input, ["Value1", "Value2"])).toThrowError()
		}
	)
})

describe("SmlAttribute.setBytes", () => {
	test.each([
		[[], "Base64||"],
		[[0x4d, 0x61, 0x6e, 0x4d], "Base64|TWFuTQ|"],
	])(
		"Given %p returns %p",
		(input, output) => {
			expect(new SmlAttribute("Test").setBytes(new Uint8Array(input)).values).toEqual([output])
		}
	)
})

describe("SmlAttribute.setIntArray", () => {
	test.each([
		[[0], ["0"]],
		[[0, 1], ["0", "1"]],
	])(
		"Given %p returns %p",
		(input, output) => {
			expect(new SmlAttribute("Test").setIntArray(input).values).toEqual(output)
		}
	)

	test.each([
		[[]],
		[[0.1]],
		[[NaN]],
		[[+Infinity]],
		[[-Infinity]],
	])(
		"Given %p throws",
		(input) => {
			expect(() => new SmlAttribute("Test").setIntArray(input)).toThrowError()
		}
	)
})

describe("SmlAttribute.setFloatArray", () => {
	test.each([
		[[0], ["0"]],
		[[0, 1.23], ["0", "1.23"]],
	])(
		"Given %p returns %p",
		(input, output) => {
			expect(new SmlAttribute("Test").setFloatArray(input).values).toEqual(output)
		}
	)

	test.each([
		[[]],
		[[NaN]],
		[[+Infinity]],
		[[-Infinity]],
	])(
		"Given %p throws",
		(input) => {
			expect(() => new SmlAttribute("Test").setFloatArray(input)).toThrowError()
		}
	)
})

test("SmlAttribute.setNull", () => {
	expect(new SmlAttribute("Test", ["Value"]).setNull().values).toEqual([null])
	expect(new SmlAttribute("Test", ["Value1", "Value2", "Value3"]).setNull(1).values).toEqual(["Value1", null, "Value3"])
})

describe("SmlAttribute.parse", () => {
	test.each([
		["Attribute1 -"],
		["  Attribute2  10 12  #comment"],
	])(
		"Given %p",
		(input) => {
			expect(SmlAttribute.parse(input).toString()).toEqual(input)
		}
	)

	test.each([
		["Attribute1"],
		[""],
		["  "],
		["  -  10 12  #comment"],
	])(
		"Given %p throws",
		(input) => {
			expect(() => SmlAttribute.parse(input)).toThrowError()
		}
	)
})

// ----------------------------------------------------------------------

test("SmlElement.endWhitespaces + hasEndWhitespaces", () => {
	const element = new SmlElement("Test")
	expect(element.hasEndWhitespaces).toEqual(false)
	expect(element.toString()).toEqual("Test\nEnd")
	element.endWhitespaces = [" ", "\t"]
	expect(element.hasEndWhitespaces).toEqual(true)
	expect(element.endWhitespaces).toEqual([" ", "\t"])
	expect(element.toString()).toEqual("Test\n End\t")
	const endWhitespaces = element.endWhitespaces
	if (endWhitespaces === null) { throw new Error()}
	endWhitespaces[0] = "a"
	expect(element.endWhitespaces).toEqual([" ", "\t"])
	expect(() => { element.endWhitespaces = endWhitespaces }).toThrow()
	element.endWhitespaces = null
	expect(element.endWhitespaces).toEqual(null)
	expect(element.hasEndWhitespaces).toEqual(false)
})

test("SmlElement.endComment + hasEndComment", () => {
	const element = new SmlElement("Test")
	expect(element.hasEndComment).toEqual(false)
	expect(element.toString()).toEqual("Test\nEnd")
	element.endComment = "c"
	expect(element.hasEndComment).toEqual(true)
	expect(element.endComment).toEqual("c")
	expect(element.toString()).toEqual("Test\nEnd #c")
	element.endWhitespaces = ["", null]
	expect(element.toString()).toEqual("Test\nEnd#c")
	expect(() => { element.endComment = "\n" }).toThrow()
	element.endComment = null
	expect(element.endComment).toEqual(null)
	expect(element.hasEndComment).toEqual(false)
})

describe("SmlElement.addNode", () => {
	test.each([
		[new SmlElement("Sub"), "Test\n\tSub\n\tEnd\nEnd"],
		[new SmlAttribute("Sub", [null]), "Test\n\tSub -\nEnd"],
		[new SmlEmptyNode(), "Test\n\t\nEnd"],
		[new SmlEmptyNode(null, "c"), "Test\n\t#c\nEnd"],
	])(
		"Given %p returns %p",
		(input, output) => {
			const element = new SmlElement("Test")
			element.addNode(input)
			expect(element.toString()).toEqual(output)
			expect(element.nodes[0]).toEqual(input)
		}
	)
})

test("SmlElement.addAttribute + addElement + addEmptyNode", () => {
	const element = new SmlElement("Test")
	const sub1 = element.addAttribute("Sub")
	const sub2 = element.addAttribute("Sub", [null])
	const sub3 = element.addElement("Sub")
	const sub4 = element.addEmptyNode()
	const sub5 = element.addEmptyNode(null, "c")
	const sub6 = element.addEmptyNode(["  "], "c")
	expect(element.toString()).toEqual("Test\n\tSub -\n\tSub -\n\tSub\n\tEnd\n\t\n\t#c\n  #c\nEnd")
	expect(element.nodes).toEqual([sub1, sub2, sub3, sub4, sub5, sub6])
})

test("SmlElement.hasNamedNodes + namedNodes + ...", () => {
	const emptyElement = new SmlElement("Test")
	expect(emptyElement.hasNamedNodes()).toEqual(false)
	expect(emptyElement.namedNodes()).toEqual([])
	expect(emptyElement.hasElements()).toEqual(false)
	expect(emptyElement.elements()).toEqual([])
	expect(emptyElement.hasAttributes()).toEqual(false)
	expect(emptyElement.attributes()).toEqual([])
	expect(emptyElement.hasEmptyNodes()).toEqual(false)
	expect(emptyElement.emptyNodes()).toEqual([])

	const element = new SmlElement("Test")
	const attribute1 = element.addAttribute("Sub")
	const attribute2 = element.addAttribute("Sub")
	const attribute3 = element.addAttribute("Sub2")
	const element1 = element.addElement("Sub")
	const element2 = element.addElement("Sub")
	const element3 = element.addElement("Sub2")
	const empty1 = element.addEmptyNode()
	const empty2 = element.addEmptyNode(null, "c")
	expect(element.hasNamedNodes()).toEqual(true)
	expect(element.hasNamedNodes("Sub")).toEqual(true)
	expect(element.hasNamedNodes("Sub3")).toEqual(false)
	expect(element.namedNodes()).toEqual([attribute1, attribute2, attribute3, element1, element2, element3])
	expect(element.namedNodes("Sub")).toEqual([attribute1, attribute2, element1, element2])
	expect(element.namedNodes("SUB")).toEqual([attribute1, attribute2, element1, element2])
	expect(element.namedNodes("Sub2")).toEqual([attribute3, element3])
	expect(element.namedNodes("Sub3")).toEqual([])
	expect(element.hasNamedNode("Sub")).toEqual(true)
	expect(element.hasNamedNode("Sub3")).toEqual(false)
	expect(element.namedNode("Sub")).toEqual(attribute1)
	expect(() => element.namedNode("Sub3")).toThrowError()
	expect(element.namedNodeOrNull("Sub")).toEqual(attribute1)
	expect(element.namedNodeOrNull("Sub3")).toEqual(null)
	
	expect(element.hasElements()).toEqual(true)
	expect(element.hasElements("Sub")).toEqual(true)
	expect(element.hasElements("Sub3")).toEqual(false)
	expect(element.elements()).toEqual([element1, element2, element3])
	expect(element.elements("Sub")).toEqual([element1, element2])
	expect(element.elements("SUB")).toEqual([element1, element2])
	expect(element.elements("Sub2")).toEqual([element3])
	expect(element.elements("Sub3")).toEqual([])
	expect(element.hasElement("Sub")).toEqual(true)
	expect(element.hasElement("Sub3")).toEqual(false)
	expect(element.element("Sub")).toEqual(element1)
	expect(() => element.element("Sub3")).toThrowError()
	expect(element.elementOrNull("Sub")).toEqual(element1)
	expect(element.elementOrNull("Sub3")).toEqual(null)

	expect(element.hasAttributes()).toEqual(true)
	expect(element.hasAttributes("Sub")).toEqual(true)
	expect(element.hasAttributes("Sub3")).toEqual(false)
	expect(element.attributes()).toEqual([attribute1, attribute2, attribute3])
	expect(element.attributes("Sub")).toEqual([attribute1, attribute2])
	expect(element.attributes("SUB")).toEqual([attribute1, attribute2])
	expect(element.attributes("Sub2")).toEqual([attribute3])
	expect(element.attributes("Sub3")).toEqual([])
	expect(element.hasAttribute("Sub")).toEqual(true)
	expect(element.hasAttribute("Sub3")).toEqual(false)
	expect(element.attribute("Sub")).toEqual(attribute1)
	expect(() => element.attribute("Sub3")).toThrowError()
	expect(element.attributeOrNull("Sub")).toEqual(attribute1)
	expect(element.attributeOrNull("Sub3")).toEqual(null)

	expect(element.hasEmptyNodes()).toEqual(true)
	expect(element.emptyNodes()).toEqual([empty1, empty2])
})

test("SmlElement.isEmpty", () => {
	const emptyElement = new SmlElement("Test")
	expect(emptyElement.isEmpty()).toEqual(true)

	const elementWithEmptyNode = new SmlElement("Test")
	elementWithEmptyNode.addEmptyNode(null, "c")
	expect(elementWithEmptyNode.isEmpty()).toEqual(true)

	const elementWithElement = new SmlElement("Test")
	elementWithElement.addElement("Sub")
	expect(elementWithElement.isEmpty()).toEqual(false)

	const elementWithAttribute = new SmlElement("Test")
	elementWithAttribute.addAttribute("Sub")
	expect(elementWithAttribute.isEmpty()).toEqual(false)
})

test("SmlElement.toMinifiedString + minify", () => {
	const element = SmlDocument.parse(`Element #comment\n\t  Sub\n\tEnd\n\t#comment\nEnd #comment`).root
	expect(element.toMinifiedString()).toEqual("Element\nSub\n-\n-")

	expect(element.hasEmptyNodes()).toEqual(true)
	expect(element.hasEndComment).toEqual(true)
	expect(element.hasEndWhitespaces).toEqual(true)
	element.minify()
	expect(element.toString()).toEqual("Element\n\tSub\n\tEnd\nEnd")
	expect(element.hasEmptyNodes()).toEqual(false)
	expect(element.hasEndComment).toEqual(false)
	expect(element.hasEndWhitespaces).toEqual(false)
})

test("SmlElement.toMinifiedBytes", () => {
	const document = SmlDocument.parse(` A  \n End  `)
	expect(document.toMinifiedBytes()).toEqual(new Uint8Array([0xEF, 0xBB, 0xBF, 0x41, 0x0A, 0x2D]))
})

describe("SmlElement.alignAttributes", () => {
	test.each([
		[" ", null, null, `Test\n\tA1            Va2       Val3 Value4 "Value 5" -\n\tAttibute2     "Value 2" Va3  -\n\t"Attribute 3" Value2    V3   V4     V5\nEnd`],
		["  ", null, null, `Test\n\tA1             Va2        Val3  Value4  "Value 5"  -\n\tAttibute2      "Value 2"  Va3   -\n\t"Attribute 3"  Value2     V3    V4      V5\nEnd`],
		["  ", 2, null, `Test\n\tA1             Va2        Val3 Value4 "Value 5" -\n\tAttibute2      "Value 2"  Va3 -\n\t"Attribute 3"  Value2     V3 V4 V5\nEnd`],
		["  ", 1, null, `Test\n\tA1             Va2 Val3 Value4 "Value 5" -\n\tAttibute2      "Value 2" Va3 -\n\t"Attribute 3"  Value2 V3 V4 V5\nEnd`],
		["  ", null, [false, false, true], `Test\n\tA1             Va2        Val3  Value4  "Value 5"  -\n\tAttibute2      "Value 2"   Va3  -\n\t"Attribute 3"  Value2       V3  V4      V5\nEnd`],
		["  ", null, [false, true, true], `Test\n\tA1                   Va2  Val3  Value4  "Value 5"  -\n\tAttibute2      "Value 2"   Va3  -\n\t"Attribute 3"     Value2    V3  V4      V5\nEnd`],
		["  ", null, [true], `Test\n           A1  Va2        Val3  Value4  "Value 5"  -\n    Attibute2  "Value 2"  Va3   -\n"Attribute 3"  Value2     V3    V4      V5\nEnd`],
		["  ", null, [false, true, true, true, true, true], `Test\n\tA1                   Va2  Val3  Value4  "Value 5"  -\n\tAttibute2      "Value 2"   Va3       -\n\t"Attribute 3"     Value2    V3      V4         V5\nEnd`],
	])(
		"Given %p returns %p",
		(input1, input2, input3, output) => {
			const element = new SmlElement("Test")
			element.addAttribute("A1", ["Va2", "Val3", "Value4", "Value 5", null])
			element.addAttribute("Attibute2", ["Value 2", "Va3", null])
			element.addAttribute("Attribute 3", ["Value2", "V3", "V4", "V5"])
			element.alignAttributes(input1, input2, input3)
			expect(element.toString()).toEqual(output)
		}
	)

	test("Supplementary characters", () => {
		const element = new SmlElement("Test")
		element.addAttribute("A1", ["Va2", "Val3", "Value4", "Value 5", null])
		element.addAttribute("Attibute2", ["𝄞𝄞", "𝄞𝄞𝄞𝄞", "𝄞𝄞𝄞𝄞𝄞𝄞𝄞"])
		element.alignAttributes()
		expect(element.toString()).toEqual(`Test\n\tA1        Va2 Val3 Value4  "Value 5" -\n\tAttibute2 𝄞𝄞  𝄞𝄞𝄞𝄞 𝄞𝄞𝄞𝄞𝄞𝄞𝄞\nEnd`)
	})

	test("Without arguments", () => {
		const element = new SmlElement("Test")
		element.addAttribute("A1", ["Va2", "Val3", "Value4", "Value 5", null])
		element.addAttribute("Attibute2", ["Value 2", "Va3", null])
		element.addAttribute("Attribute 3", ["Value2", "V3", "V4", "V5"])
		element.alignAttributes()
		expect(element.toString()).toEqual(`Test\n\tA1            Va2       Val3 Value4 "Value 5" -\n\tAttibute2     "Value 2" Va3  -\n\t"Attribute 3" Value2    V3   V4     V5\nEnd`)
	})
})

test("SmlElement.assureName", () => {
	const element = new SmlElement("Test")
	element.assureName("Test")
	element.assureName("TEST")
	expect(() => element.assureName("Test2")).toThrowError()
})

test("SmlElement.assureElementNames + ...", () => {
	const emptyElement = new SmlElement("Test")
	emptyElement.assureNoElements()
	emptyElement.assureNoAttributes()
	emptyElement.assureElementCount(0)
	emptyElement.assureAttributeCount(0)
	emptyElement.assureElementNames([])
	emptyElement.assureAttributeNames([])
	emptyElement.assureElementNames(["Sub"])
	emptyElement.assureAttributeNames(["Sub"])

	const element = new SmlElement("Test")
	element.addAttribute("Sub")
	element.addAttribute("Sub")
	element.addAttribute("Sub2")
	element.addElement("Sub")
	element.addElement("Sub")
	element.addElement("Sub2")
	element.addEmptyNode()
	element.addEmptyNode(null, "c")
	expect(() => element.assureNoElements()).toThrowError()
	expect(() => element.assureNoAttributes()).toThrowError()
	expect(() => element.assureElementCount(0)).toThrowError()
	expect(() => element.assureAttributeCount(0)).toThrowError()
	element.assureElementCount(3)
	element.assureElementCount(2, "Sub")
	element.assureElementCount(1, "Sub2")
	element.assureAttributeCount(3)
	element.assureAttributeCount(2, "Sub")
	element.assureAttributeCount(1, "Sub2")
	element.assureElementNames(["Sub", "Sub2"])
	element.assureAttributeNames(["Sub", "Sub2"])
	expect(() => element.assureElementNames(["Sub"])).toThrowError()
	expect(() => element.assureAttributeNames(["Sub"])).toThrowError()
	expect(() => element.assureElementNames([])).toThrowError()
	expect(() => element.assureAttributeNames([])).toThrowError()
	expect(() => element.assureElementCount(2, "Sub2")).toThrowError()
	expect(() => element.assureAttributeCount(2, "Sub2")).toThrowError()
})

describe("SmlElement.assureElementCountMinMax", () => {
	test.each([
		[null, null, undefined],
		[1, null, undefined],
		[null, 3, undefined],
		[1, 2, "Sub"],
	])(
		"Given %p",
		(input1, input2, input3) => {
			const element = new SmlElement("Test")
			element.addElement("Sub")
			element.addElement("Sub")
			element.addElement("Sub2")
			element.assureElementCountMinMax(input1, input2, input3)
		}
	)

	test.each([
		[0, 0, undefined],
		[-1, null, undefined],
		[null, -1, undefined],
		[5, null, undefined],
		[3, 4, "Sub"],
		[-1, null, "Sub"],
		[null, -1, "Sub"],
		[4, null, "Sub"],
		[null, 1, "Sub"],
	])(
		"Given %p throws",
		(input1, input2, input3) => {
			const element = new SmlElement("Test")
			element.addElement("Sub")
			element.addElement("Sub")
			element.addElement("Sub2")
			expect(() => element.assureElementCountMinMax(input1, input2, input3)).toThrowError()
		}
	)

	test("Without optional arguments", () => {
		const element = new SmlElement("Test")
		element.addElement("Sub")
		element.addElement("Sub")
		element.assureElementCountMinMax(1)
	})
})

describe("SmlElement.assureAttributeCountMinMax", () => {
	test.each([
		[null, null, undefined],
		[1, null, undefined],
		[null, 3, undefined],
		[1, 2, "Sub"],
	])(
		"Given %p",
		(input1, input2, input3) => {
			const element = new SmlElement("Test")
			element.addAttribute("Sub")
			element.addAttribute("Sub")
			element.addAttribute("Sub2")
			element.assureAttributeCountMinMax(input1, input2, input3)
		}
	)

	test.each([
		[0, 0, undefined],
		[-1, null, undefined],
		[null, -1, undefined],
		[5, null, undefined],
		[3, 4, "Sub"],
		[-1, null, "Sub"],
		[null, -1, "Sub"],
		[4, null, "Sub"],
		[null, 1, "Sub"],
	])(
		"Given %p throws",
		(input1, input2, input3) => {
			const element = new SmlElement("Test")
			element.addAttribute("Sub")
			element.addAttribute("Sub")
			element.addAttribute("Sub2")
			expect(() => element.assureAttributeCountMinMax(input1, input2, input3)).toThrowError()
		}
	)

	test("Without optional arguments", () => {
		const element = new SmlElement("Test")
		element.addAttribute("Sub")
		element.addAttribute("Sub")
		element.assureAttributeCountMinMax(1)
	})
})

test("SmlElement.optionalElement + ...", () => {
	const emptyElement = new SmlElement("Test")
	expect(emptyElement.optionalElement("Sub")).toEqual(null)
	expect(() => emptyElement.requiredElement("Sub")).toThrowError()
	expect(emptyElement.optionalAttribute("Sub")).toEqual(null)
	expect(() => emptyElement.requiredAttribute("Sub")).toThrowError()

	const element = new SmlElement("Test")
	const attribute1 = element.addAttribute("Sub")
	const attribute2 = element.addAttribute("Sub")
	const attribute3 = element.addAttribute("Sub2")
	const element1 = element.addElement("Sub")
	const element2 = element.addElement("Sub")
	const element3 = element.addElement("Sub2")

	expect(element.optionalElement("Sub2")).toEqual(element3)
	expect(element.optionalElement("Sub3")).toEqual(null)
	expect(() => element.optionalElement("Sub")).toThrowError()
	expect(element.requiredElement("Sub2")).toEqual(element3)
	expect(() => element.requiredElement("Sub")).toThrowError()
	expect(element.oneOrMoreElements("Sub")).toEqual([element1, element2])
	expect(element.oneOrMoreElements("Sub2")).toEqual([element3])
	expect(() => element.oneOrMoreElements("Sub3")).toThrowError()

	expect(element.optionalAttribute("Sub2")).toEqual(attribute3)
	expect(element.optionalAttribute("Sub3")).toEqual(null)
	expect(() => element.optionalAttribute("Sub")).toThrowError()
	expect(element.requiredAttribute("Sub2")).toEqual(attribute3)
	expect(() => element.requiredAttribute("Sub")).toThrowError()
	expect(element.oneOrMoreAttributes("Sub")).toEqual([attribute1, attribute2])
	expect(element.oneOrMoreAttributes("Sub2")).toEqual([attribute3])
	expect(() => element.oneOrMoreAttributes("Sub3")).toThrowError()
})

test("SmlElement.assureEmpty", () => {
	const element1 = new SmlElement("Test")
	element1.assureEmpty()

	const element2 = new SmlElement("Test")
	element2.addElement("Sub1")
	expect(() => element2.assureEmpty()).toThrowError()
})

test("SmlElement.assureChoice", () => {
	const element1 = new SmlElement("Test")
	element1.addAttribute("Sub1")
	element1.assureChoice(["Sub1", "Sub2"], ["Sub1", "Sub2"])

	const element2 = new SmlElement("Test")
	element2.addElement("Sub1")
	element2.assureChoice(["Sub1", "Sub2"], ["Sub1", "Sub2"])
	
	const element3 = new SmlElement("Test")
	element3.assureChoice(["Sub1", "Sub2"], ["Sub1", "Sub2"], true)

	const element4 = new SmlElement("Test")
	element4.addElement("Sub1")
	element4.addElement("Sub1")
	expect(() => element4.assureChoice(["Sub1", "Sub2"], ["Sub1", "Sub2"])).toThrowError()

	const element5 = new SmlElement("Test")
	expect(() => element5.assureChoice([], [])).toThrowError()
	expect(() => element5.assureChoice(["Sub1"], [])).toThrowError()
	expect(() => element5.assureChoice([], ["Sub1"])).toThrowError()
	expect(() => element5.assureChoice(["Sub1"], ["Sub1"])).toThrowError()

	const element6 = new SmlElement("Test")
	element6.addElement("Sub1")
	element6.addElement("Sub2")
	expect(() => element6.assureChoice(["Sub1", "Sub2"], ["Sub1", "Sub2"])).toThrowError()

	const element7 = new SmlElement("Test")
	element7.addElement("Sub1")
	element7.addAttribute("Sub1")
	expect(() => element7.assureChoice(["Sub1", "Sub2"], ["Sub1", "Sub2"])).toThrowError()

	const element8 = new SmlElement("Test")
	element8.addAttribute("Sub1")
	element8.assureChoice(["Sub1", "Sub2"], ["Sub1", "Sub2"])

	const element9 = new SmlElement("Test")
	element9.addAttribute("Sub1")
	element9.addAttribute("Sub2")
	expect(() => element9.assureChoice(["Sub1", "Sub2"], ["Sub1", "Sub2"])).toThrowError()

	const element10 = new SmlElement("Test")
	element10.addAttribute("Sub1")
	element10.addAttribute("Sub2")
	expect(() => element10.assureChoice(["Sub1", "Sub2"], ["Sub1", "Sub2"])).toThrowError()
})

test("SmlElement.parse", () => {
	const element = SmlElement.parse("\n#test\nTest\nAttribute1 10\nEnd\n\n")
	expect(element.toString()).toEqual("Test\nAttribute1 10\nEnd")
})

test("SmlElement.toJaggedArray", () => {
	const element = SmlElement.parse(`Root\n Attribute 1 2\n\n  SubElement\n  End\nEnd`, false)
	const jaggedArray = element.toJaggedArray()
	expect(jaggedArray).toEqual([["Root"], ["Attribute", "1", "2"], ["SubElement"], ["End"], ["End"]])
})

test("SmlDocument.toJaggedArray (minified)", () => {
	const element = SmlElement.parse(`Root\n Attribute 1 2\nEnd`, false)
	const jaggedArray = element.toJaggedArray(true)
	expect(jaggedArray).toEqual([["Root"], ["Attribute", "1", "2"], [null]])
})

// ----------------------------------------------------------------------

describe("SmlDocument Constructor", () => {
	test.each([
		["End", ReliableTxtEncoding.Utf8, "Root\nEnd"],
		["end", ReliableTxtEncoding.Utf8, "Root\nend"],
		[null, ReliableTxtEncoding.Utf8, "Root\n-"],
		["End", ReliableTxtEncoding.Utf16, "Root\nEnd"],
	])(
		"Given %p and %p returns %p",
		(input1, input2, output) => {
			const rootElement = new SmlElement("Root")
			const document = new SmlDocument(rootElement, input1, input2)
			expect(document.encoding).toEqual(input2)
			expect(document.toString()).toEqual(output)
		}
	)
})

describe("SmlDocument.defaultIndentation", () => {
	test.each([
		[null, "Root\n\tSub\n\tEnd\nEnd"],
		["\t", "Root\n\tSub\n\tEnd\nEnd"],
		["", "Root\nSub\nEnd\nEnd"],
		[" ", "Root\n Sub\n End\nEnd"],
		["  ", "Root\n  Sub\n  End\nEnd"],
	])(
		"Given %p",
		(input, output) => {
			const rootElement = new SmlElement("Root")
			rootElement.addElement("Sub")
			const document = new SmlDocument(rootElement)
			document.defaultIndentation = input
			expect(document.toString()).toEqual(output)
		}
	)
})

test("SmlDocument.minify", () => {
	const content = "\n \n  \n#comment \n Root  \n  Attribute  10  20 #c  \n\n\n Sub\n  Attr 1 2 3#c\n\n   End\n  End #c\n#comment\n \n  \n"
	const document = SmlDocument.parse(content)
	expect(document.toString()).toEqual(content)
	expect(document.toString(false)).toEqual(`Root\n\tAttribute 10 20\n\tSub\n\t\tAttr 1 2 3\n\tEnd\nEnd`)
	expect(document.toMinifiedString()).toEqual(`Root\nAttribute 10 20\nSub\nAttr 1 2 3\n-\n-`)
	document.minify()
	expect(document.toString()).toEqual(`Root\nAttribute 10 20\nSub\nAttr 1 2 3\n-\n-`)

	const minifiedContent = document.toMinifiedString()
	const document2 = SmlDocument.parse(minifiedContent)
	expect(document2.toString()).toEqual(minifiedContent)
})

describe("SmlDocument.getBytes + fromBytes", () => {
	test.each([
		[ReliableTxtEncoding.Utf8, [0xEF, 0xBB, 0xBF, 0x41, 0x0A, 0x45, 0x6E, 0x64]],
		[ReliableTxtEncoding.Utf16, [0xFE, 0xFF, 0x0, 0x41, 0x0, 0x0A, 0x0, 0x45, 0x0, 0x6E, 0x0, 0x64]],
		[ReliableTxtEncoding.Utf16Reverse, [0xFF, 0xFE, 0x41, 0x0, 0x0A, 0x0, 0x45, 0x0, 0x6E, 0x0, 0x64, 0x0]],
		[ReliableTxtEncoding.Utf32, [0x0, 0x0, 0xFE, 0xFF, 0x0, 0x0, 0x0, 0x41, 0x0, 0x0, 0x0, 0x0A, 0x0, 0x0, 0x0, 0x45, 0x0, 0x0, 0x0, 0x6E, 0x0, 0x0, 0x0, 0x64]],
	])(
		"Given %p returns %p",
		(encoding, output) => {
			const document = new SmlDocument(new SmlElement("A"))
			document.encoding = encoding
			const bytes = document.toBytes()
			expect(bytes).toEqual(new Uint8Array(output))
			expect(document.toString()).toEqual("A\nEnd")

			const document2 = SmlDocument.fromBytes(bytes)
			expect(document2.encoding).toEqual(encoding)
			expect(document2.toString()).toEqual("A\nEnd")
		}
	)
})

describe("SmlDocument.toBase64String + fromBase64String", () => {
	test.each([
		[ReliableTxtEncoding.Utf8, "Base64|77u/QQpFbmQ|"],
		[ReliableTxtEncoding.Utf16, "Base64|/v8AQQAKAEUAbgBk|"],
	])(
		"Given %p returns %p",
		(encoding, output) => {
			const document = new SmlDocument(new SmlElement("A"))
			document.encoding = encoding
			const base64Str = document.toBase64String()
			expect(base64Str).toEqual(output)
			expect(document.toString()).toEqual("A\nEnd")

			const document2 = SmlDocument.fromBase64String(base64Str)
			expect(document2.encoding).toEqual(encoding)
			expect(document2.toString()).toEqual("A\nEnd")
		}
	)
})

describe("SmlDocument.parse", () => {
	test.each([
		["  Root  \n  End  ", true, "  Root  \n  End  ", "Root\nEnd"],
		["  Root  \n  End  ", false, "Root\nEnd", "Root\nEnd"],
		[`MyRootElement\n  MyFirstAttribute "123"\n  MySecondAttribute "10" "20" "30" "40" "50"\nEnd`, true, `MyRootElement\n  MyFirstAttribute 123\n  MySecondAttribute 10 20 30 40 50\nEnd`, `MyRootElement\n\tMyFirstAttribute 123\n\tMySecondAttribute 10 20 30 40 50\nEnd`],
	])(
		"Given %p and %p",
		(input1, input2, output1, output2) => {
			const document = SmlDocument.parse(input1, input2)
			expect(document.toString()).toEqual(output1)
			expect(document.toString(false)).toEqual(output2)
		}
	)

	test.each([
		["MyRootElement\nEnd"],
		["myrootelement\nend"],
		["MYROOTELEMENT\nEND"],
		["MyRootElement\n  MyFirstAttribute 123\nEnd"],
		["MyRootElement\n  MyFirstAttribute 123\n  MySecondAttribute 10 20 30 40 50\nEnd"],
		[`MyRootElement\n  MyFirstAttribute 123\n  MySecondAttribute 10 20 30 40 50\n  MyThirdAttribute "Hello world"\nEnd`],
		[`MyRootElement\n  Group1\n    MyFirstAttribute 123\n    MySecondAttribute 10 20 30 40 50\n  End\n  MyThirdAttribute "Hello world"\nEnd`],
		[`MyRootElement\nGroup1\nMyFirstAttribute 123\nMySecondAttribute 10 20 30 40 50\nEnd\nMyThirdAttribute "Hello world"\nEnd`],
		[`# My first SML document\nMyRootElement\n  #Group1\n  #  MyFirstAttribute 123\n  #  MySecondAttribute 10 20 30 40 50\n  #End\n  MyThirdAttribute "Hello world"   # Comment\nEnd`],
		[`MyRootElement\n  MyFirstAttribute "Hello ""world""!"\n  MySecondAttribute c:\\Temp\\Readme.txt\nEnd`],
		[`MyRootElement\n  MyFirstAttribute "# This is not a comment"\nEnd`],
		[`MyRootElement\n  MyFirstAttribute "-"\n  MySecondAttribute -\n  MyThirdAttribute ""\n  MyFourthAttribute My-Value-123\nEnd`],
		[`MyRootElement\n  MyFirstAttribute "Line1"/"Line2"/"Line3"\nEnd`],
		[`MyRootElement\n  MyFirstAttribute 123\n  MyFirstAttribute 3456\n  MyFirstAttribute 67\n  Element1\n  End\n  Element1\n  End\nEnd`],
		[`RecentFiles\n  File c:\\Temp\\Readme.txt\n  File "c:\\My Files\\Todo.txt"\n  File c:\\Games\\Racer\\Config.sml\n  File d:\\Untitled.txt\nEnd`],
		[`契約\n　　個人情報\n　　　　名字　田中\n　　　　名前　蓮\n　　エンド\n　　日付　２０２１－０１－０２\nエンド`],
		[`Vertragsdaten\n  Personendaten\n    Nachname Meier\n    Vorname Hans\n  Ende\n  Datum 2021-01-02\nEnde`],
		[`"My Root Element"\n  "My First Attribute" 123\nEnd`],
		[`Actors\n  Name          Age  PlaceOfBirth  FavoriteColor  JobTitle\n  "John Smith"  33   Vancouver     -\n  "Mary Smith"  27   Toronto       Green          Lawyer\nEnd`],
		[`Root\n  End 12 13\nEnd`],
		[`Root\n-`],
	])(
		"Given %p",
		(input) => {
			const document = SmlDocument.parse(input)
			expect(document.toString()).toEqual(input)
			expect(SmlDocument.parse(input, false).toString()).toEqual(document.toString(false))
		}
	)

	test.each([
		[""],
		["Root"],
		[`Root\n  FirstAttribute "hello world\nEnd`],
		[`Root\n  FirstAttribute ab"c\nEnd`],
		[`Root\n  FirstAttribute "hello world"a b c\nEnd`],
		[`Root\n  FirstAttribute "Line1"/ "Line2"\nEnd`],
		[`# Only\n# Comments`],
		[`Root abc\nEnd`],
		[`-\nEnd`],
		[`Root\n  -\n  End\nEnd`],
		[`Root\n  - 123\nEnd`],
		[`Root\n  Element\n  End`],
		[`Root\nEnd\nRoot2\nEnd`],
		[`End\nEnd`],
		[`Root\n  Attribute 1 2`],
		[`End`],
	])(
		"Given %p throws",
		(input) => {
			expect(() => SmlDocument.parse(input)).toThrowError()
			expect(() => SmlDocument.parse(input, false)).toThrowError()
		}
	)
})

test("SmlDocument.toString throws", () => {
	const document = new SmlDocument(new SmlElement("End"))
	expect(() => document.toString()).toThrowError()

	const document2 = new SmlDocument(new SmlElement("Test"), "test")
	expect(() => document2.toString()).toThrowError()
})

test("SmlDocument.toJaggedArray + fromJaggedArray", () => {
	const document = SmlDocument.parse(`Root\n Attribute 1 2\nEnd`, false)
	const jaggedArray = document.toJaggedArray()
	expect(jaggedArray).toEqual([["Root"], ["Attribute", "1", "2"], ["End"]])

	const document2 = SmlDocument.fromJaggedArray(jaggedArray)
	expect(document2.toString()).toEqual(document.toString())
})

test("SmlDocument.toJaggedArray (minified)", () => {
	const document = SmlDocument.parse(`Root\n Attribute 1 2\nEnd`, false)
	const jaggedArray = document.toJaggedArray(true)
	expect(jaggedArray).toEqual([["Root"], ["Attribute", "1", "2"], [null]])
})

describe("SmlDocument.toBinarySml + fromBinarySml", () => {
	test.each([
		["A\nEnd"],
		["A\nB\nEnd\nEnd"],
		[`MyRootElement\n  MyFirstAttribute "123"\n  MySecondAttribute "10" "20" "30" "40" "50"\nEnd`],
		[`""\n""\nEnd\nEnd`],
		[`""\n"" 1\n"" ""\n"" -\n"" "" - a\n"" - "" a\n"" - a ""\n""\n"" ""\n""\nEnd\n"" ""\nEnd\nEnd`],
		[`E\nA 1\nA ""\nA -\nA "" - a\nA - "" a\nA - a ""\nE\nA ""\nE\nEnd\nA ""\nEnd\nEnd`],
	])(
		"Given %p",
		(input) => {
			const document = SmlDocument.parse(input)
			const bytes = document.toBinarySml()

			const decodedDocument = SmlDocument.fromBinarySml(bytes)
			expect(document.toString(false)).toEqual(decodedDocument.toString(false))
		}
	)
})

test("SmlDocument.toBinarySml + fromBinarySml", () => {
	const document = SmlDocument.parse("A\nEnd")
	const bytes = document.toBinarySml()
	expect(bytes).toEqual(new Uint8Array([0x42, 0x53, 0x31, aByte, elementStartByte]))

	const decodedDocument = SmlDocument.fromBinarySml(bytes)
	expect(document.toString()).toEqual(decodedDocument.toString())
})

// ----------------------------------------------------------------------

test("SmlParserError.constructor", () => {
	const error = new SmlParserError(10, "Test")
	expect(error.message).toEqual("Test (11)")
	expect(error.lineIndex).toEqual(10)
})

// ----------------------------------------------------------------------

test("WsvDocumentLineIterator", () => {
	const wsvDocument = WsvDocument.parse(`Root\nEnd`)
	const iterator = new SyncWsvDocumentLineIterator(wsvDocument, "End")
	const lineArray = iterator.getLineAsArray()
	expect(lineArray).toEqual(["Root"])
	expect(iterator.toString()).toEqual("(2): End")
})

// ----------------------------------------------------------------------

test("WsvJaggedArrayLineIterator", () => {
	const jaggedArray = [["Root"], ["Attribute", "1", "2"], ["End"]]
	const iterator = new SyncWsvJaggedArrayLineIterator(jaggedArray, "End")
	expect(iterator.getLineAsArray()).toEqual(["Root"])
	expect(iterator.getLine()).toEqual(new WsvLine(["Attribute", "1", "2"]))
	expect(iterator.toString()).toEqual("(3): End")
})

// ----------------------------------------------------------------------

class TestWsvDocumentLineIterator implements WsvLineIterator {
	private wsvDocument: WsvDocument
	private endKeyword: string | null

	private index: number = 0

	constructor(wsvDocument: WsvDocument, endKeyword: string | null) {
		this.wsvDocument = wsvDocument
		this.endKeyword = endKeyword
	}

	getEndKeyword(): string | null {
		return this.endKeyword
	}

	async hasLine(): Promise<boolean> {
		return this.index < this.wsvDocument.lines.length
	}

	async isEmptyLine(): Promise<boolean> {
		return await this.hasLine() && !this.wsvDocument.lines[this.index].hasValues
	}

	async getLineAsArray(): Promise<(string | null)[]> {
		return (await this.getLine()).values
	}

	async getLine(): Promise<WsvLine> {
		const line: WsvLine = this.wsvDocument.lines[this.index]
		this.index++
		return line
	}

	toString(): string {
		let result: string = "(" + (this.index + 1) + "): "
		if (this.index < this.wsvDocument.lines.length) {
			result += this.wsvDocument.lines[this.index].toString()
		}
		return result
	}

	getLineIndex(): number {
		return this.index
	}
}

// ----------------------------------------------------------------------

test("SmlParser", () => {
	const document1 = SmlParser.parseDocumentSync(` Root \nEnd`)
	expect(document1.encoding).toEqual(ReliableTxtEncoding.Utf8)
	expect(document1.toString()).toEqual(` Root \nEnd`)

	const document2 = SmlParser.parseDocumentNonPreservingSync(` Root \nEnd`)
	expect(document2.encoding).toEqual(ReliableTxtEncoding.Utf8)
	expect(document2.toString()).toEqual(`Root\nEnd`)

	const document3 = SmlParser.parseJaggedArraySync([["Root"], ["End"]])
	expect(document3.encoding).toEqual(ReliableTxtEncoding.Utf8)
	expect(document3.toString()).toEqual(`Root\nEnd`)
})

describe("SmlParser Async", () => {
	test("Given", async () => {
		const document = WsvDocument.parse("Root\nAttribute1 10\nSub\nSubAttr -\nEnd\n#comment\nEnd")
		const iterator = new TestWsvDocumentLineIterator(document, "End")
		const emptyNodes: SmlEmptyNode[] = []
		const rootElement = await SmlParser.readRootElement(iterator, emptyNodes)
		expect(rootElement.name).toEqual("Root")

		const node1 = await SmlParser.readNode(iterator, rootElement) as SmlAttribute
		expect(node1.toString()).toEqual("Attribute1 10")

		const node2 = await SmlParser.readNode(iterator, rootElement) as SmlElement
		expect(node2.toString()).toEqual("Sub\nSubAttr -\nEnd")

		const node3 = await SmlParser.readNode(iterator, rootElement) as SmlEmptyNode
		expect(node3.toString()).toEqual("#comment")
	})

	test.each([
		[""],
		[`-`],
		[`End`],
	])(
		"Given %p throws",
		async (input) => {
			const document = WsvDocument.parse(input)
			const iterator = new TestWsvDocumentLineIterator(document, "End")
			const emptyNodes: SmlEmptyNode[] = []
			await expect(async () => await SmlParser.readRootElement(iterator, emptyNodes)).rejects.toThrowError()
		}
	)

	test.each([
		["Root\nSub"],
		["Root\n-"],
		["Root\n- 1"],
	])(
		"Given %p throws",
		async (input) => {
			const document = WsvDocument.parse(input)
			const iterator = new TestWsvDocumentLineIterator(document, "End")
			const emptyNodes: SmlEmptyNode[] = []
			const rootElement = await SmlParser.readRootElement(iterator, emptyNodes)

			await expect(async () => await SmlParser.readNode(iterator, rootElement)).rejects.toThrowError()
		}
	)
})

// ----------------------------------------------------------------------

const elementStartByte = 0b11111111
const elementEndByte = 0b11111110
const attributeEndByte = 0b11111101
const valueSeparatorByte = 0b11111100
const nullValueByte = 0b11111011
const aByte = 0x41
const eByte = 0x45

// ----------------------------------------------------------------------

describe("BinarySmlEncoder.encodeElement", () => {
	test.each([
		["A\nEnd", true, [0x42, 0x53, 0x31, aByte, elementStartByte]],
		[`""\nEnd`, true, [0x42, 0x53, 0x31, elementStartByte]],
		["A\nEnd", false, [aByte, elementStartByte, elementEndByte]],
		["A\nEnd123", false, [aByte, elementStartByte, elementEndByte]],
		[`""\nEnd`, false, [elementStartByte, elementEndByte]],
		[`""\n"" 1\nEnd`, false, [elementStartByte, valueSeparatorByte, 0x31, attributeEndByte, elementEndByte]],
		[`""\n"" 1 "" -\nEnd`, false, [elementStartByte, valueSeparatorByte, 0x31, valueSeparatorByte, valueSeparatorByte, nullValueByte, attributeEndByte, elementEndByte]],
		["E\nA 1\nEnd", false, [eByte, elementStartByte, aByte, valueSeparatorByte, 0x31, attributeEndByte, elementEndByte]],
		["E\nA 1 2\nEnd", false, [eByte, elementStartByte, aByte, valueSeparatorByte, 0x31, valueSeparatorByte, 0x32, attributeEndByte, elementEndByte]],
		["E\nA 1\nA 2\nEnd", false, [eByte, elementStartByte, aByte, valueSeparatorByte, 0x31, attributeEndByte, aByte, valueSeparatorByte, 0x32, attributeEndByte, elementEndByte]],
		["E\nA 1\nE\nEnd\nA 2\nEnd", false, [eByte, elementStartByte, aByte, valueSeparatorByte, 0x31, attributeEndByte, eByte, elementStartByte, elementEndByte, aByte, valueSeparatorByte, 0x32, attributeEndByte, elementEndByte]],
		["E\nA 1\nE\nA 2\nEnd\nA 3\nEnd", false, [eByte, elementStartByte, aByte, valueSeparatorByte, 0x31, attributeEndByte, eByte, elementStartByte, aByte, valueSeparatorByte, 0x32, attributeEndByte, elementEndByte, aByte, valueSeparatorByte, 0x33, attributeEndByte, elementEndByte]],
	])(
		"Given %p and %p returns %j",
		(input1, input2, output) => {
			const document = SmlDocument.parse(input1)
			const bytes = BinarySmlEncoder.encodeElement(document.root, input2)
			expect(bytes).toEqual(new Uint8Array(output))
		}
	)
})

test("BinarySmlEncoder.encodeAttribute", () => {
	const attribute = new SmlAttribute("A", [null])
	const bytes = BinarySmlEncoder.encodeAttribute(attribute)
	expect(bytes).toEqual(new Uint8Array([aByte, valueSeparatorByte, nullValueByte, attributeEndByte]))
})

test("BinarySmlEncoder.encodeElement", () => {
	const element = SmlElement.parse("A\nEnd")
	const bytes = BinarySmlEncoder.encodeElement(element)
	expect(bytes).toEqual(new Uint8Array([aByte, elementStartByte, elementEndByte]))
})

describe("BinarySmlEncoder.encodeNode + encodeNodes", () => {
	test.each([
		[new SmlElement("A"), [aByte, elementStartByte, elementEndByte]],
		[new SmlAttribute("A", [null]), [aByte, valueSeparatorByte, nullValueByte, attributeEndByte]],
		[new SmlEmptyNode(), []],
	])(
		"Given %p returns %j",
		(input, output) => {
			const bytes = BinarySmlEncoder.encodeNode(input)
			expect(bytes).toEqual(new Uint8Array(output))

			const bytes2 = BinarySmlEncoder.encodeNodes([input])
			expect(bytes2).toEqual(new Uint8Array(output))
		}
	)
})

test("BinarySmlEncoder.encode", () => {
	const document = SmlDocument.parse("A\nEnd")
	const bytes = BinarySmlEncoder.encode(document)
	expect(bytes).toEqual(new Uint8Array([0x42, 0x53, 0x31, aByte, elementStartByte]))
})

test("BinarySmlEncoder.internalEncodeNode", () => {
	const element = SmlElement.parse("E\nEnd")
	const attribute = SmlAttribute.parse("A -")
	const builder = new Uint8ArrayBuilder()
	BinarySmlEncoder.internalEncodeNode(element, builder)
	BinarySmlEncoder.internalEncodeNode(attribute, builder)
	const bytes = builder.toArray()
	expect(bytes).toEqual(new Uint8Array([eByte, elementStartByte, elementEndByte, aByte, valueSeparatorByte, nullValueByte, attributeEndByte]))
})

test("BinarySmlEncoder.internalEncodeNodes", () => {
	const element = SmlElement.parse("E\nEnd")
	const attribute = SmlAttribute.parse("A -")
	const builder = new Uint8ArrayBuilder()
	BinarySmlEncoder.internalEncodeNodes([element, attribute], builder)
	const bytes = builder.toArray()
	expect(bytes).toEqual(new Uint8Array([eByte, elementStartByte, elementEndByte, aByte, valueSeparatorByte, nullValueByte, attributeEndByte]))
})

// ----------------------------------------------------------------------

describe("BinarySmlDecoder.getVersion", () => {
	test.each([
		[[0x42, 0x53, 0x31], "1"],
		[[0x42, 0x53, 0x31], "1"],
		[[0x42, 0x53, 0x32], "2"],
		[[0x42, 0x53, 0x31, 0x00], "1"],
	])(
		"Given %p returns %p",
		(input, output) => {
			const version = BinarySmlDecoder.getVersion(new Uint8Array(input))
			expect(version).toEqual(output)
		}
	)

	test.each([
		[[0x43, 0x53, 0x31]],
		[[0x42, 0x54, 0x31]],
		[[0x42, 0x53]],
		[[0x42]],
		[[]],
	])(
		"Given %p throws",
		(input) => {
			expect(() => BinarySmlDecoder.getVersion(new Uint8Array(input))).toThrow()
		}
	)
})

describe("BinarySmlDecoder.getVersionOrNull", () => {
	test.each([
		[[0x42, 0x53, 0x31], "1"],
		[[0x42, 0x53, 0x31], "1"],
		[[0x42, 0x53, 0x32], "2"],
		[[0x42, 0x53, 0x31, 0x00], "1"],
		[[0x43, 0x53, 0x31], null],
		[[0x42, 0x54, 0x31], null],
		[[0x42, 0x53], null],
		[[0x42], null],
		[[], null],
	])(
		"Given %p returns %p",
		(input, output) => {
			const version = BinarySmlDecoder.getVersionOrNull(new Uint8Array(input))
			expect(version).toEqual(output)
		}
	)
})

describe("BinarySmlDecoder.decode", () => {
	test.each([
		[[eByte, elementStartByte], "E\n-"],
		[[elementStartByte], `""\n-`],
		[[aByte, elementStartByte, 0x42, elementStartByte, elementEndByte], "A\nB\n-\n-"],
		[[aByte, elementStartByte, valueSeparatorByte, nullValueByte, attributeEndByte], `A\n"" -\n-`],
	])(
		"Given %p returns %p",
		(input, output) => {
			const document = BinarySmlDecoder.decode(new Uint8Array([0x42, 0x53, 0x31, ...input]))
			expect(document.toMinifiedString()).toEqual(output)
		}
	)

	test.each([
		[[eByte]],
		[[eByte, 0b11111000, elementStartByte]],
		[[eByte, elementStartByte, aByte]],
		[[eByte, elementStartByte, aByte, valueSeparatorByte]],
		[[eByte, elementStartByte, aByte, valueSeparatorByte, 0x31]],
		[[eByte, elementStartByte, aByte, valueSeparatorByte, nullValueByte]],
		[[eByte, elementStartByte, aByte, valueSeparatorByte, nullValueByte, aByte]],
		[[eByte, elementStartByte, elementEndByte]],
		[[]],
	])(
		"Given %p throws",
		(input) => {
			expect(() => BinarySmlDecoder.decode(new Uint8Array([0x42, 0x53, 0x31, ...input]))).toThrowError()
		}
	)

	test("BinarySmlDecoder.decode throws", () => {
		expect(() => BinarySmlDecoder.decode(new Uint8Array([0x42, 0x53, 0x32]))).toThrowError()
	})
})

describe("BinarySmlDecoder.internalDecodeNode", () => {
	test("internalDecodeNode", () => {
		let reader = new Uint8ArrayReader(new Uint8Array([]), 0)
		let result = BinarySmlDecoder.internalDecodeNode(reader)
		expect(result).toEqual(null)

		reader = new Uint8ArrayReader(new Uint8Array([aByte, valueSeparatorByte, nullValueByte, attributeEndByte]), 0)
		result = BinarySmlDecoder.internalDecodeNode(reader)
		expect(result?.toString()).toEqual(`A -`)
	})

	test.each([
		[[eByte, elementStartByte]],
		[[aByte, valueSeparatorByte, nullValueByte, attributeEndByte, eByte]],
		[[elementEndByte]],
	])(
		"Given %p throws",
		(input) => {
			const reader = new Uint8ArrayReader(new Uint8Array(input), 0)
			expect(() => BinarySmlDecoder.internalDecodeNode(reader)).toThrowError()
		}
	)
})

describe("BinarySmlDecoder.internalGetNodeEndIndex", () => {
	test.each([
		[[eByte, elementStartByte, elementEndByte], 0, 2],
		[[eByte, elementStartByte, elementEndByte, eByte, elementStartByte, elementEndByte], 0, 2],
		[[eByte, elementStartByte, elementEndByte, eByte, elementStartByte, elementEndByte], 3, 5],
		[[aByte, valueSeparatorByte, 0x31, attributeEndByte], 0, 3],
		[[aByte, valueSeparatorByte, 0x31, attributeEndByte, eByte, elementStartByte, elementEndByte], 0, 3],
		[[aByte, valueSeparatorByte, 0x31, attributeEndByte, aByte, valueSeparatorByte, 0x31, attributeEndByte], 4, 7],
	])(
		"Given %p and %p returns %p",
		(input1, input2, output) => {
			const index = BinarySmlDecoder.internalGetNodeEndIndex(new Uint8Array(input1), input2)
			expect(index).toEqual(output)
		}
	)

	test.each([
		[[elementEndByte], 0],
	])(
		"Given %p throws",
		(input1, input2) => {
			expect(() => BinarySmlDecoder.internalGetNodeEndIndex(new Uint8Array(input1), input2)).toThrowError()
		}
	)
})

// ----------------------------------------------------------------------

describe("Uint8ArrayReader.readRootElementStart", () => {
	test("readRootElementStart", () => {
		const reader = new Uint8ArrayReader(new Uint8Array([aByte, elementStartByte]), 0)
		const result = reader.readRootElementStart()
		expect(result).toEqual("A")
	})

	test("throws", () => {
		const reader = new Uint8ArrayReader(new Uint8Array([aByte]), 0)
		expect(() =>reader.readRootElementStart()).toThrowError()
	})
})

test("Uint8ArrayReader.reset", () => {
	const originalBuffer = new Uint8Array([aByte, elementStartByte])
	const reader = new Uint8ArrayReader(originalBuffer, 0)
	expect(reader.buffer).toEqual(originalBuffer)
	expect(reader.offset).toEqual(0)

	const newBuffer = new Uint8Array([eByte, elementStartByte])
	reader.reset(newBuffer, 1)
	expect(reader.buffer).toEqual(newBuffer)
	expect(reader.offset).toEqual(1)
})

test("Uint8ArrayReader.read throws", () => {
	const reader = new Uint8ArrayReader(new Uint8Array([aByte, valueSeparatorByte, nullValueByte, attributeEndByte]), 0)
	expect(() =>reader.read(true)).toThrowError()
})