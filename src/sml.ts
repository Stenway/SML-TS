/* (C) Stefan John / Stenway / SimpleML.com / 2023 */

import { Base64String, ReliableTxtDocument, ReliableTxtEncoding, ReliableTxtLines, Utf16String } from "@stenway/reliabletxt"
import { WsvStringUtil, WsvDocument, WsvLine, WsvSerializer, WsvValue, Uint8ArrayBuilder, Uint8ArrayReader, BinaryWsvDecoder } from "@stenway/wsv"

// ----------------------------------------------------------------------

export abstract class SmlNode {
	protected _whitespaces: (string | null)[] | null = null
	protected _comment: string | null = null

	get whitespaces(): (string | null)[] | null {
		if (this._whitespaces === null) { return null }
		return [...this._whitespaces]
	}

	set whitespaces(values: (string | null)[] | null) {
		WsvStringUtil.validateWhitespaceStrings(values)
		if (values !== null) { this._whitespaces = [...values] }
		else { this._whitespaces = null}
	}

	get hasWhitespaces(): boolean {
		return this._whitespaces !== null
	}

	get comment(): string | null {
		return this._comment
	}

	set comment(value: string | null) {
		WsvStringUtil.validateComment(value)
		this._comment = value
	}

	get hasComment(): boolean {
		return this._comment !== null
	}

	isElement(): boolean {
		return this instanceof SmlElement
	}
	
	isAttribute(): boolean {
		return this instanceof SmlAttribute
	}

	isEmptyNode(): boolean {
		return this instanceof SmlEmptyNode
	}

	isNamedNode(): boolean {
		return this instanceof SmlNamedNode
	}

	isElementWithName(name: string) {
		if (!(this instanceof SmlElement)) return false
		return this.hasName(name)
	}
	
	isAttributeWithName(name: string) {
		if (!(this instanceof SmlAttribute)) return false
		return this.hasName(name)
	}

	abstract internalSerialize(lines: string[], level: number, defaultIndentation: string | null, endKeyword: string | null, preserveWhitespaceAndComment: boolean): void

	minify() {
		this._whitespaces = null
		this._comment = null
	}

	static internalSetWhitespacesAndComment(node: SmlNode, whitespaces: (string | null)[] | null, comment: string | null) {
		node._whitespaces = whitespaces
		node._comment = comment
	}
}

// ----------------------------------------------------------------------

export class SmlEmptyNode extends SmlNode {
	constructor(whitespaces: (string | null)[] | null = null, comment: string | null = null) {
		super()
		this.whitespaces = whitespaces
		this.comment = comment
	}

	toString(): string {
		return SmlSerializer.serializeEmptyNode(this)
	}
	
	internalSerialize(lines: string[], level: number, defaultIndentation: string | null, endKeyword: string | null, preserveWhitespaceAndComment: boolean) {
		if (!preserveWhitespaceAndComment) { return }
		SmlSerializer.internalSerializeValuesWhitespacesAndComment([], this._whitespaces, this._comment, lines, level, defaultIndentation)
	}
}

// ----------------------------------------------------------------------

export abstract class SmlNamedNode extends SmlNode {
	name: string

	constructor(name: string) {
		super()
		this.name = name
	}

	hasName(name: string): boolean {
		return SmlStringUtil.equalsIgnoreCase(this.name, name)
	}
}

// ----------------------------------------------------------------------

export abstract class SmlValueUtil {
	static getBoolString(value: boolean): string {
		return value === true ? "true" : "false"
	}

	static getIntString(value: number): string {
		if (!Number.isInteger(value)) { throw new RangeError(`Value "${value}" is not a valid integer`) }
		return value.toString()
	}

	static getFloatString(value: number): string {
		if (!Number.isFinite(value)) { throw new RangeError(`Value "${value}" is not a valid float`) }
		return value.toString()
	}

	static getEnumString(value: number, enumValues: string[]): string {
		if (!Number.isInteger(value) || !(value >= 0 && value <enumValues.length)) { throw new RangeError(`Enum value "${value}" is out of range`) }
		return enumValues[value]
	}

	static getBytesString(bytes: Uint8Array): string {
		return Base64String.fromBytes(bytes)
	}
	
	static getBoolOrNull(str: string): boolean | null {
		str = str.toLowerCase()
		if (str === "true") { return true }
		else if (str === "false") { return false }
		else { return null }
	}

	static getIntOrNull(str: string): number | null {
		if (str.match(/^[-+]?[0-9]+$/)) {
			return parseInt(str)
		} else { return null }
	}

	static getFloatOrNull(str: string): number | null {
		if (str.match(/^[-+]?[0-9]+(\.[0-9]+([eE][-+]?[0-9]+)?)?$/)) {
			return parseFloat(str)
		} else { return null }
	}

	static getEnumOrNull(str: string, enumValues: string[]): number | null {
		for (let i=0; i<enumValues.length; i++) {
			const enumValue: string = enumValues[i]
			if (SmlStringUtil.equalsIgnoreCase(str, enumValue)) { return i }
		}
		return null
	}

	static getBytesOrNull(str: string): Uint8Array | null {
		try {
			return Base64String.toBytes(str)
		} catch (error) {
			return null
		}
	}
}

// ----------------------------------------------------------------------

export class SmlAttribute extends SmlNamedNode {
	private _values: (string | null)[]

	get values(): (string | null)[] {
		return [...this._values]
	}

	set values(array: (string | null)[]) {
		if (array.length === 0) { throw new TypeError(`Attribute "${this.name}" must contain at least one value`) }
		this._values = [...array]
	}

	get valueCount(): number {
		return this._values.length
	}

	constructor(name: string, values: (string | null)[] = [null]) {
		super(name)
		if (values.length === 0) { throw new TypeError(`Attribute "${name}" must contain at least one value`) }
		this._values = [...values]
	}

	toString(preserveWhitespaceAndComment: boolean = true): string {
		return SmlSerializer.serializeAttribute(this, preserveWhitespaceAndComment)
	}

	internalSerialize(lines: string[], level: number, defaultIndentation: string | null, endKeyword: string | null, preserveWhitespaceAndComment: boolean) {
		const combined: (string | null)[] = [this.name, ...this.values]
		if (preserveWhitespaceAndComment) { SmlSerializer.internalSerializeValuesWhitespacesAndComment(combined, this._whitespaces, this._comment, lines, level, defaultIndentation) }
		else { SmlSerializer.internalSerializeValuesWhitespacesAndComment(combined, null, null, lines, level, defaultIndentation) }
	}

	internalBinarySerialize(builder: Uint8ArrayBuilder) {
		for (const value of this._values) {
			if (value === null) {
				builder.pushByte(BinarySmlUtil.nullValueByte)
			} else {
				const strValueEncoded = Utf16String.toUtf8Bytes(value)
				builder.pushVarInt56(strValueEncoded.length + 2)
				builder.push(strValueEncoded)
			}
		}
		builder.pushByte(BinarySmlUtil.attributeEndByte)
	}

	assureName(name: string): SmlAttribute {
		if (!this.hasName(name)) { throw new Error(`Attribute with name "${name}" expected but has name "${this.name}"`) }
		return this
	}

	assureValueCount(count: number): SmlAttribute {
		if (this._values.length !== count) { throw new Error(`Attribute "${this.name}" must have a value count of ${count} but has ${this._values.length}`) }
		return this
	}

	assureValueCountMinMax(min: number | null, max: number | null = null): SmlAttribute {
		if (min !== null) {
			if (min < 1) { throw new RangeError(`Min value must be greater equal one`)}
			if (this._values.length < min) { throw new Error(`Attribute "${this.name}" must have a minimum value count of ${min} but has ${this._values.length}`) }
		}
		if (max !== null) {
			if (max < 1) { throw new RangeError(`Max value must be greater equal one`)}
			if (this._values.length > max) { throw new Error(`Attribute "${this.name}" must have a maximum value count of ${min} but has ${this._values.length}`) }
		}
		return this
	}

	getNullableString(index: number = 0): string | null {
		if (!(index >= 0 && index < this._values.length)) { throw new Error(`Index of ${index} for attribute "${this.name}" is out of range`) }
		const value: string | null = this._values[index]
		return value
	}

	getString(index: number = 0): string {
		const value: string | null = this.getNullableString(index)
		if (value === null) { throw new Error(`Value of attribute "${this.name}" at index ${index} is null`) }
		return value
	}

	getNullableStringArray(startIndex: number = 0): (string | null)[] {
		if (!(startIndex >= 0 && startIndex < this._values.length)) { throw new Error(`Index of ${startIndex} for attribute "${this.name}" is out of range`) }
		return this._values.slice(startIndex)
	}

	getStringArray(startIndex: number = 0): string[] {
		const array: (string | null)[] = this.getNullableStringArray(startIndex)
		if (array.indexOf(null) >= 0) { throw new Error(`Attribute "${this.name}" has a null value`) }
		return array as string[]
	}

	getBool(index: number = 0): boolean {
		const strValue: string = this.getString(index)
		const value = SmlValueUtil.getBoolOrNull(strValue)
		if (value === null) {
			throw new Error(`Value of attribute "${this.name}" at index ${index} is not a bool`)
		}
		return value
	}

	getInt(index: number = 0): number {
		const strValue: string = this.getString(index)
		const value = SmlValueUtil.getIntOrNull(strValue)
		if (value === null) {
			throw new Error(`Value of attribute "${this.name}" at index ${index} is not an integer`)
		}
		return value
	}
	
	getFloat(index: number = 0): number {
		const strValue: string = this.getString(index)
		const value = SmlValueUtil.getFloatOrNull(strValue)
		if (value === null) {
			throw new Error(`Value of attribute "${this.name}" at index ${index} is not a float`)
		}
		return value
	}

	getEnum(enumValues: string[], index: number = 0): number {
		const strValue: string = this.getString(index)
		const value = SmlValueUtil.getEnumOrNull(strValue, enumValues)
		if (value === null) {
			throw new Error(`Value of attribute "${this.name}" at index ${index} is not a valid enum value`)
		}
		return value
	}

	getBytes(index: number = 0): Uint8Array {
		const strValue: string = this.getString(index)
		const bytes = SmlValueUtil.getBytesOrNull(strValue)
		if (bytes === null) {
			throw new Error(`Value of attribute "${this.name}" at index ${index} is not a Reliable Base64 string`)
		}
		return bytes
	}

	asNullableString(): string | null { 
		return this.assureValueCount(1).getNullableString() 
	}

	asString(): string { 
		return this.assureValueCount(1).getString() 
	}
	
	asNullableStringArray(min: number | null = null, max: number | null = null): (string | null)[] {
		this.assureValueCountMinMax(min, max)
		return this.values
	}

	asStringArray(min: number | null = null, max: number | null = null): string[] {
		this.assureValueCountMinMax(min, max)
		return this.getStringArray()
	}

	asBool(): boolean { 
		return this.assureValueCount(1).getBool()
	}

	asInt(): number { 
		return this.assureValueCount(1).getInt()
	}

	asFloat(): number { 
		return this.assureValueCount(1).getFloat()
	}

	asEnum(enumValues: string[]): number { 
		return this.assureValueCount(1).getEnum(enumValues) 
	}

	asBytes(): Uint8Array { 
		return this.assureValueCount(1).getBytes()
	}

	asIntArray(min: number | null = null, max: number | null = null): number[] {
		this.assureValueCountMinMax(min, max)
		return this._values.map((strValue, index) => {
			if (strValue === null) {
				throw new Error(`Value of attribute "${this.name}" at index ${index} is null`)
			}
			const value = SmlValueUtil.getIntOrNull(strValue)
			if (value === null) {
				throw new Error(`Value "${strValue}" of attribute "${this.name}" at index ${index} is not an integer`)
			}
			return value
		})
	}

	asFloatArray(min: number | null = null, max: number | null = null): number[] {
		this.assureValueCountMinMax(min, max)
		return this._values.map((strValue, index) => {
			if (strValue === null) {
				throw new Error(`Value of attribute "${this.name}" at index ${index} is null`)
			}
			const value = SmlValueUtil.getFloatOrNull(strValue)
			if (value === null) {
				throw new Error(`Value "${strValue}" of attribute "${this.name}" at index ${index} is not a float`)
			}
			return value
		})
	}

	isNullValue(): boolean {
		return this._values.length === 1 && this._values[0] === null
	}

	setNullableString(value: string | null, index: number | null = null): SmlAttribute {
		if (index === null) {
			this._values = [value]
		} else {
			if (!(index >= 0 && index < this._values.length)) { throw new RangeError(`Index ${index} is out of range`)}
			this._values[index] = value
		}
		return this
	}

	setString(value: string, index: number | null = null): SmlAttribute {
		this.setNullableString(value, index)
		return this
	}

	setBool(value: boolean, index: number | null = null): SmlAttribute {
		this.setNullableString(SmlValueUtil.getBoolString(value), index)
		return this
	}

	setInt(value: number, index: number | null = null): SmlAttribute {
		this.setNullableString(SmlValueUtil.getIntString(value), index)
		return this
	}

	setFloat(value: number, index: number | null = null): SmlAttribute {
		this.setNullableString(SmlValueUtil.getFloatString(value), index)
		return this
	}

	setEnum(value: number, enumValues: string[], index: number | null = null): SmlAttribute {
		this.setNullableString(SmlValueUtil.getEnumString(value, enumValues), index)
		return this
	}

	setBytes(bytes: Uint8Array, index: number | null = null): SmlAttribute {
		this.setNullableString(SmlValueUtil.getBytesString(bytes), index)
		return this
	}
	
	setIntArray(values: number[]): SmlAttribute {
		if (values.length === 0) { throw new TypeError(`Int array must contain at least one value`) }
		this._values = values.map((value) => {
			return SmlValueUtil.getIntString(value)
		})
		return this
	}

	setFloatArray(values: number[]): SmlAttribute {
		if (values.length === 0) { throw new TypeError(`Float array must contain at least one value`) }
		this._values = values.map((value) => {
			return SmlValueUtil.getFloatString(value)
		})
		return this
	}

	setNull(index: number | null = null): SmlAttribute {
		this.setNullableString(null, index)
		return this
	}

	static parse(content: string, preserveWhitespaceAndComments: boolean = true): SmlAttribute {
		return SmlParser.parseAttributeSync(content, preserveWhitespaceAndComments)
	}
}

// ----------------------------------------------------------------------

export class SmlElement extends SmlNamedNode {
	nodes: SmlNode[] = []

	private _endWhitespaces: (string | null)[] | null = null
	private _endComment: string | null = null

	get endWhitespaces(): (string | null)[] | null {
		if (this._endWhitespaces === null) { return null }
		return [...this._endWhitespaces]
	}

	set endWhitespaces(values: (string | null)[] | null) {
		WsvStringUtil.validateWhitespaceStrings(values)
		if (values !== null) { this._endWhitespaces = [...values] }
		else { this._endWhitespaces = null}
	}

	get hasEndWhitespaces(): boolean {
		return this._endWhitespaces !== null
	}

	get endComment(): string | null {
		return this._endComment
	}

	set endComment(value: string | null) {
		WsvStringUtil.validateComment(value)
		this._endComment = value
	}

	get hasEndComment(): boolean {
		return this._endComment !== null
	}

	constructor(name: string) {
		super(name)
	}

	addNode(node: SmlNode) {
		this.nodes.push(node)
	}

	addAttribute(name: string, values: (string | null)[] = [null]): SmlAttribute {
		const attribute: SmlAttribute = new SmlAttribute(name, values)
		this.addNode(attribute)
		return attribute
	}

	addElement(name: string): SmlElement {
		const element: SmlElement = new SmlElement(name)
		this.addNode(element)
		return element
	}

	addEmptyNode(whitespaces: (string | null)[] | null = null, comment: string | null = null): SmlEmptyNode {
		const emptyNode: SmlEmptyNode = new SmlEmptyNode(whitespaces, comment)
		this.addNode(emptyNode)
		return emptyNode
	}

	hasNamedNodes(name?: string): boolean {
		if (name === undefined) {
			return this.nodes.some(node => node instanceof SmlNamedNode)
		} else {
			return this.nodes.
				filter(node => node instanceof SmlNamedNode).
				map(node => node as SmlNamedNode).
				some(namedNode => namedNode.hasName(name))
		}
	}
	
	namedNodes(name?: string): SmlNamedNode[] {
		if (name === undefined) {
			return this.nodes.filter(node => node instanceof SmlNamedNode) as SmlNamedNode[]
		} else {
			return this.nodes.
				filter(node => node instanceof SmlNamedNode).
				map(node => node as SmlNamedNode).
				filter(namedNode => namedNode.hasName(name))
		}
	}

	hasNamedNode(name: string): boolean {
		return this.nodes.
			filter(node => node instanceof SmlNamedNode).
			map(node => node as SmlNamedNode).
			some(namedNode => namedNode.hasName(name))
	}
	
	namedNode(name: string): SmlNamedNode {
		const result: SmlNamedNode | undefined = this.nodes.
			filter(node => node instanceof SmlNamedNode).
			map(node => node as SmlNamedNode).
			find(namedNode => namedNode.hasName(name))
		if (result === undefined) { throw new Error(`Element "${this.name}" does not contain a "${name}" named node`) }
		return result
	}

	namedNodeOrNull(name: string): SmlNamedNode | null {
		const result: SmlNamedNode | undefined = this.nodes.
			filter(node => node instanceof SmlNamedNode).
			map(node => node as SmlNamedNode).
			find(namedNode => namedNode.hasName(name))
		if (result === undefined) { return null }
		return result
	}

	hasElements(name?: string): boolean {
		if (name === undefined) {
			return this.nodes.some(node => node instanceof SmlElement)
		} else {
			return this.nodes.
				filter(node => node instanceof SmlElement).
				map(node => node as SmlElement).
				some(element => element.hasName(name))
		}
	}
	
	elements(name?: string): SmlElement[] {
		if (name === undefined) {
			return this.nodes.filter(node => node instanceof SmlElement) as SmlElement[]
		} else {
			return this.nodes.
				filter(node => node instanceof SmlElement).
				map(node => node as SmlElement).
				filter(element => element.hasName(name))
		}
	}

	hasElement(name: string): boolean {
		return this.nodes.
			filter(node => node instanceof SmlElement).
			map(node => node as SmlElement).
			some(element => element.hasName(name))
	}
	
	element(name: string): SmlElement {
		const result: SmlElement | undefined = this.nodes.
			filter(node => node instanceof SmlElement).
			map(node => node as SmlElement).
			find(element => element.hasName(name))
		if (result === undefined) { throw new Error(`Element "${this.name}" does not contain a "${name}" element`) }
		return result
	}

	elementOrNull(name: string): SmlElement | null {
		const result: SmlElement | undefined = this.nodes.
			filter(node => node instanceof SmlElement).
			map(node => node as SmlElement).
			find(element => element.hasName(name))
		if (result === undefined) { return null }
		return result
	}

	hasAttributes(name?: string): boolean {
		if (name === undefined) {
			return this.nodes.some(node => node instanceof SmlAttribute)
		} else {
			return this.nodes.
				filter(node => node instanceof SmlAttribute).
				map(node => node as SmlAttribute).
				some(attribute => attribute.hasName(name))
		}
	}
	
	attributes(name?: string): SmlAttribute[] {
		if (name === undefined) {
			return this.nodes.filter(node => node instanceof SmlAttribute) as SmlAttribute[]
		} else {
			return this.nodes.
				filter(node => node instanceof SmlAttribute).
				map(node => node as SmlAttribute).
				filter(attribute => attribute.hasName(name))
		}
	}

	hasAttribute(name: string): boolean {
		return this.nodes.
			filter(node => node instanceof SmlAttribute).
			map(node => node as SmlAttribute).
			some(attribute => attribute.hasName(name))
	}
	
	attribute(name: string): SmlAttribute {
		const result: SmlAttribute | undefined = this.nodes.
			filter(node => node instanceof SmlAttribute).
			map(node => node as SmlAttribute).
			find(attribute => attribute.hasName(name))
		if (result === undefined) { throw new Error(`Element "${this.name}" does not contain a "${name}" attribute`) }
		return result
	}

	attributeOrNull(name: string): SmlAttribute | null {
		const result: SmlAttribute | undefined = this.nodes.
			filter(node => node instanceof SmlAttribute).
			map(node => node as SmlAttribute).
			find(attribute => attribute.hasName(name))
		if (result === undefined) { return null }
		return result
	}

	hasEmptyNodes(): boolean {
		return this.nodes.
			some(node => node instanceof SmlEmptyNode)
	}
	
	emptyNodes(): SmlEmptyNode[] {
		return this.nodes.
			filter(node => node instanceof SmlEmptyNode).
			map(node => node as SmlEmptyNode)
	}

	isEmpty(): boolean {
		return !this.hasNamedNodes()
	}

	toString(preserveWhitespaceAndComment: boolean = true): string {
		return SmlSerializer.serializeElement(this, preserveWhitespaceAndComment)
	}

	internalSerialize(lines: string[], level: number, defaultIndentation: string | null, endKeyword: string | null, preserveWhitespaceAndComment: boolean) {
		if (endKeyword !== null && this.hasName(endKeyword)) {
			throw new Error(`Element name matches the end keyword "${endKeyword}"`)
		}
		if (preserveWhitespaceAndComment) {
			SmlSerializer.internalSerializeValuesWhitespacesAndComment([this.name], this._whitespaces, this._comment, lines, level, defaultIndentation)
			const childLevel: number = level + 1
			for (const child of this.nodes) {
				child.internalSerialize(lines, childLevel, defaultIndentation, endKeyword, preserveWhitespaceAndComment)
			}
			SmlSerializer.internalSerializeValuesWhitespacesAndComment([endKeyword], this._endWhitespaces, this._endComment, lines, level, defaultIndentation)
		} else {
			SmlSerializer.internalSerializeValuesWhitespacesAndComment([this.name], null, null, lines, level, defaultIndentation)
			const childLevel: number = level + 1
			for (const child of this.nodes) {
				child.internalSerialize(lines, childLevel, defaultIndentation, endKeyword, preserveWhitespaceAndComment)
			}
			SmlSerializer.internalSerializeValuesWhitespacesAndComment([endKeyword], null, null, lines, level, defaultIndentation)		
		}
	}

	toMinifiedString(): string {
		return SmlSerializer.serializeElementMinified(this)
	}

	minify() {
		super.minify()
		this.nodes = this.nodes.filter(node => !(node instanceof SmlEmptyNode))
		this._endWhitespaces = null
		this._endComment = null
		for (const node of this.nodes) { node.minify() }
	}

	alignAttributes(whitespaceBetween: string = " ", maxColumns: number | null = null, rightAligned: boolean[] | null = null) {
		const attributes: SmlAttribute[] = this.attributes()
		const whitespacesArray: (string | null)[][] = []
		const valuesArray: (string | null)[][] = []
		let numColumns: number = 0
		WsvStringUtil.validateWhitespaceString(whitespaceBetween, false)
		for (const attribute of attributes) {
			whitespacesArray.push([null])
			const values: (string | null)[] = [attribute.name, ...attribute.values]
			numColumns = Math.max(numColumns, values.length)
			valuesArray.push(values)
		}
		if (maxColumns !== null) {
			numColumns = maxColumns
		}
		for (let curColumnIndex=0; curColumnIndex<numColumns; curColumnIndex++) {
			let maxLength: number = 0
			for (let i=0; i<attributes.length; i++) {
				const values: (string | null)[] = valuesArray[i]
				if (curColumnIndex >= values.length) { continue }
				const value: string | null = values[curColumnIndex]
				const serializedValue: string = WsvValue.serialize(value)
				maxLength = Math.max(maxLength, Utf16String.getCodePointCount(serializedValue))
			}
			for (let i=0; i<attributes.length; i++) {
				const values: (string | null)[] = valuesArray[i]
				if (curColumnIndex >= values.length) { continue }
				const value: string | null = valuesArray[i][curColumnIndex]
				const serializedValue: string = WsvValue.serialize(value)
				const lengthDif: number = maxLength - Utf16String.getCodePointCount(serializedValue)
				const fillingWhitespace: string = " ".repeat(lengthDif)
				if (rightAligned !== null && rightAligned[curColumnIndex]) {
					const last: string | null = whitespacesArray[i][whitespacesArray[i].length-1] ?? ""
					whitespacesArray[i][whitespacesArray[i].length-1] = last + fillingWhitespace
					if (curColumnIndex >= values.length-1) { continue }
					whitespacesArray[i].push(whitespaceBetween)
				} else {
					if (curColumnIndex >= values.length-1) { continue }
					whitespacesArray[i].push(fillingWhitespace+whitespaceBetween)
				}
			}
		}
		for (let i=0; i<attributes.length; i++) {
			attributes[i].whitespaces = whitespacesArray[i]
		}
	}

	assureName(name: string): SmlElement {
		if (!this.hasName(name)) { throw new Error(`Element with name "${name}" expected but found "${this.name}"`) }
		return this
	}

	assureElementNames(names: string[]): SmlElement {
		elementLoop: for (const element of this.elements()) {
			for (const name of names) {
				if (element.hasName(name)) { continue elementLoop }
			}
			throw new Error(`Not allowed element with name "${element.name}" found in element "${this.name}"`)
		}
		return this
	}

	assureAttributeNames(names: string[]): SmlElement {
		attributeLoop: for (const attribute of this.attributes()) {
			for (const name of names) {
				if (attribute.hasName(name)) { continue attributeLoop }
			}
			throw new Error(`Not allowed attribute with name "${attribute.name}" found in element "${this.name}"`)
		}
		return this
	}

	assureNoElements(): SmlElement {
		if (this.elements().length > 0) { throw new Error(`Element with name "${this.name}" cannot have elements`) }
		return this
	}

	assureElementCount(count: number, name?: string): SmlElement {
		if (name === undefined) {
			if (this.elements().length !== count) { throw new Error(`Element with name "${this.name}" must have ${count} element(s)`) }
		} else {
			if (this.elements(name).length !== count) { throw new Error(`Element with name "${this.name}" must have ${count} element(s) with name "${name}"`) }
		}
		return this
	}

	assureElementCountMinMax(min: number | null, max: number | null = null, name?: string): SmlElement {
		if (name === undefined) {
			const elementCount = this.elements().length
			if (min !== null) {
				if (min < 0) { throw new RangeError(`Min value must be greater equal zero`)}
				if (elementCount < min) { throw new Error(`Element "${this.name}" must have a minimum element count of ${min} but has ${elementCount}`) }
			}
			if (max !== null) {
				if (max < 0) { throw new RangeError(`Max value must be greater equal zero`)}
				if (elementCount > max) { throw new Error(`Element "${this.name}" must have a maximum element count of ${min} but has ${elementCount}`) }
			}
		} else {
			const elementCount = this.elements(name).length
			if (min !== null) {
				if (min < 0) { throw new RangeError(`Min value must be greater equal zero`)}
				if (elementCount < min) { throw new Error(`Element "${this.name}" must have a minimum element count of ${min} with name "${name}" but has ${elementCount}`) }
			}
			if (max !== null) {
				if (max < 0) { throw new RangeError(`Max value must be greater equal zero`)}
				if (elementCount > max) { throw new Error(`Element "${this.name}" must have a maximum element count of ${min} with name "${name}" but has ${elementCount}`) }
			}
		}
		return this
	}

	assureNoAttributes(): SmlElement {
		if (this.attributes().length > 0) { throw new Error(`Element with name "${this.name}" cannot have attributes`) }
		return this
	}

	assureAttributeCount(count: number, name?: string): SmlElement {
		if (name === undefined) {
			if (this.attributes().length !== count) { throw new Error(`Element with name "${this.name}" must have ${count} attribute(s)`) }
		} else {
			if (this.attributes(name).length !== count) { throw new Error(`Element with name "${this.name}" must have ${count} attribute(s) with name "${name}"`) }
		}
		return this
	}

	assureAttributeCountMinMax(min: number | null, max: number | null = null, name?: string): SmlElement {
		if (name === undefined) {
			const attributeCount = this.attributes().length
			if (min !== null) {
				if (min < 0) { throw new RangeError(`Min value must be greater equal zero`)}
				if (attributeCount < min) { throw new Error(`Element "${this.name}" must have a minimum attribute count of ${min} but has ${attributeCount}`) }
			}
			if (max !== null) {
				if (max < 0) { throw new RangeError(`Max value must be greater equal zero`)}
				if (attributeCount > max) { throw new Error(`Element "${this.name}" must have a maximum attribute count of ${min} but has ${attributeCount}`) }
			}
		} else {
			const attributeCount = this.attributes(name).length
			if (min !== null) {
				if (min < 0) { throw new RangeError(`Min value must be greater equal zero`)}
				if (attributeCount < min) { throw new Error(`Element "${this.name}" must have a minimum attribute count of ${min} with name "${name}" but has ${attributeCount}`) }
			}
			if (max !== null) {
				if (max < 0) { throw new RangeError(`Max value must be greater equal zero`)}
				if (attributeCount > max) { throw new Error(`Element "${this.name}" must have a maximum attribute count of ${min} with name "${name}" but has ${attributeCount}`) }
			}
		}
		return this
	}

	optionalElement(elementName: string): SmlElement | null {
		const elements: SmlElement[] = this.elements(elementName)
		if (elements.length > 1) { throw new Error(`Element "${this.name}" must contain one or no element "${elementName}" but contains ${elements.length}`) }
		if (elements.length === 0) { return null }
		else { return elements[0] }
	}

	requiredElement(elementName: string): SmlElement {
		const elements: SmlElement[] = this.elements(elementName)
		if (elements.length !== 1) { throw new Error(`Element "${this.name}" must contain one element "${elementName}" but contains ${elements.length}`) }
		return elements[0]
	}

	oneOrMoreElements(elementName: string): SmlElement[] {
		const elements: SmlElement[] = this.elements(elementName)
		if (elements.length < 1) { throw new Error(`Element "${this.name}" must contain at least one element "${elementName}" but contains 0`) }
		return elements
	}

	optionalAttribute(attributeName: string): SmlAttribute | null {
		const attributes: SmlAttribute[] = this.attributes(attributeName)
		if (attributes.length > 1) { throw new Error(`Element "${this.name}" must contain one or no attribute "${attributeName}" but contains ${attributes.length}`) }
		if (attributes.length === 0) { return null }
		else { return attributes[0] }
	}

	requiredAttribute(attributeName: string): SmlAttribute {
		const attributes: SmlAttribute[] = this.attributes(attributeName)
		if (attributes.length !== 1) { throw new Error(`Element "${this.name}" must contain one attribute "${attributeName}" but contains ${attributes.length}`) }
		return attributes[0]
	}

	oneOrMoreAttributes(attributeName: string): SmlAttribute[] {
		const attributes: SmlAttribute[] = this.attributes(attributeName)
		if (attributes.length < 1) { throw new Error(`Element "${this.name}" must contain at least one attribute "${attributeName}" but contains 0`) }
		return attributes
	}

	assureEmpty(): SmlElement {
		if (!this.isEmpty()) { throw new Error(`Element with name "${this.name}" must be empty`) }
		return this
	}

	assureChoice(elementNames: string[] | null, attributeNames: string[] | null, canBeEmpty: boolean = false): SmlElement {
		const hasElementNames = elementNames !== null && elementNames.length > 0
		const hasAttributeNames = attributeNames !== null && attributeNames.length > 0
		if (!hasElementNames && !hasAttributeNames) { throw new RangeError(`No element or attribute names specified`) }
		let foundNodeName: string | null = null
		let wasAttribute: boolean = false
		if (elementNames !== null) {
			for (const elementName of elementNames) {
				if (this.hasElement(elementName)) {
					if (foundNodeName !== null) { throw new Error(`Element "${this.name}" cannot contain an element "${foundNodeName}" and an element "${elementName}"`) }
					foundNodeName = elementName
					this.assureElementCount(1, elementName)
				}
			}
		}
		if (attributeNames !== null) {
			for (const attributeName of attributeNames) {
				if (this.hasAttribute(attributeName)) {
					if (foundNodeName !== null) { throw new Error(`Element "${this.name}" cannot contain an ${wasAttribute ? "attribute" : "element"} "${foundNodeName}" and an attribute "${attributeName}"`) }
					foundNodeName = attributeName
					wasAttribute = true
					this.assureAttributeCount(1, attributeName)
				}
			}
		}
		if (foundNodeName === null && !canBeEmpty) {
			if (hasElementNames && !hasAttributeNames) {
				throw new Error(`Element "${this.name}" must contain one of the following elements: ${elementNames.join(", ")}`)
			} else if (!hasElementNames && hasAttributeNames) {
				throw new Error(`Element "${this.name}" must contain one of the following attributes: ${attributeNames.join(", ")}`)
			} else {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				throw new Error(`Element "${this.name}" must contain one of the following elements: ${elementNames!.join(", ")} or attributes: ${attributeNames!.join(", ")}`)
			}
		}
		return this
	}

	toJaggedArray(minified: boolean = false): (string | null)[][] {
		const endKeyword = minified ? null : "End"
		return SmlJaggedArraySerializer.serialzeElement(this, endKeyword)
	}

	static parse(content: string, preserveWhitespaceAndComments: boolean = true): SmlElement {
		// TODO optimize
		return SmlDocument.parse(content, preserveWhitespaceAndComments).root
	}

	static internalSetEndWhitespacesAndComment(element: SmlElement, endWhitespaces: (string | null)[] | null, endComment: string | null) {
		element._endWhitespaces = endWhitespaces
		element._endComment = endComment
	}
}

// ----------------------------------------------------------------------

export class SmlDocument {
	root: SmlElement
	endKeyword: string | null
	encoding: ReliableTxtEncoding

	private _defaultIndentation: string | null = null

	emptyNodesBefore: SmlEmptyNode[] = []
	emptyNodesAfter: SmlEmptyNode[] = []

	get defaultIndentation(): string | null {
		return this._defaultIndentation
	}

	set defaultIndentation(value: string | null) {
		if (value !== null && value.length !== 0) { WsvStringUtil.validateWhitespaceString(value, true) }
		this._defaultIndentation = value
	}

	constructor(root: SmlElement, endKeyword: string | null = "End", encoding: ReliableTxtEncoding = ReliableTxtEncoding.Utf8) {
		this.root = root
		this.endKeyword = endKeyword
		this.encoding = encoding
	}

	minify() {
		this.emptyNodesBefore = []
		this.emptyNodesAfter = []
		this.defaultIndentation = ""
		this.endKeyword = null
		this.root.minify()
	}

	toString(preserveWhitespaceAndComment: boolean = true): string {
		return SmlSerializer.serializeDocument(this, preserveWhitespaceAndComment)
	}

	toMinifiedString(): string {
		return this.root.toMinifiedString()
	}

	getBytes(preserveWhitespacesAndComments: boolean = true): Uint8Array {
		const str: string = this.toString(preserveWhitespacesAndComments)
		return new ReliableTxtDocument(str, this.encoding).getBytes()
	}

	toBase64String(preserveWhitespacesAndComments: boolean = true): string {
		const str: string = this.toString(preserveWhitespacesAndComments)
		return Base64String.fromText(str, this.encoding)
	}

	toJaggedArray(minified: boolean = false): (string | null)[][] {
		const endKeyword = minified ? null : this.endKeyword
		return SmlJaggedArraySerializer.serialzeElement(this.root, endKeyword)
	}

	toBinarySml(): Uint8Array {
		return BinarySmlEncoder.encode(this)
	}

	static parse(content: string, preserveWhitespaceAndComments: boolean = true, encoding: ReliableTxtEncoding = ReliableTxtEncoding.Utf8): SmlDocument {
		if (preserveWhitespaceAndComments) { return SmlParser.parseDocumentSync(content, encoding) }
		else { return SmlParser.parseDocumentNonPreservingSync(content, encoding) }
	}

	static fromBytes(bytes: Uint8Array, preserveWhitespaceAndComments: boolean = true): SmlDocument {
		const txtDocument = ReliableTxtDocument.fromBytes(bytes)
		return SmlDocument.parse(txtDocument.text, preserveWhitespaceAndComments, txtDocument.encoding)
	}

	static fromJaggedArray(jaggedArray: (string | null)[][], encoding: ReliableTxtEncoding = ReliableTxtEncoding.Utf8): SmlDocument {
		return SmlParser.parseJaggedArraySync(jaggedArray, encoding)
	}

	static fromBase64String(base64Str: string): SmlDocument {
		const bytes = Base64String.toBytes(base64Str)
		return this.fromBytes(bytes)
	}

	static fromBinarySml(bytes: Uint8Array): SmlDocument {
		return BinarySmlDecoder.decode(bytes)
	}
}

// ----------------------------------------------------------------------

export abstract class SmlStringUtil {
	static equalsIgnoreCase(str1: string, str2: string): boolean {
		return str1.localeCompare(str2, undefined, {sensitivity: 'accent'}) === 0 
	}
}

// ----------------------------------------------------------------------

export abstract class SmlSerializer {
	static serializeDocument(document: SmlDocument, preserveWhitespaceAndComment: boolean): string {
		const lines: string[] = []

		if (preserveWhitespaceAndComment) { SmlSerializer.serialzeEmptyNodes(document.emptyNodesBefore, lines) }
		document.root.internalSerialize(lines, 0, document.defaultIndentation, document.endKeyword, preserveWhitespaceAndComment)
		if (preserveWhitespaceAndComment) { SmlSerializer.serialzeEmptyNodes(document.emptyNodesAfter, lines) }

		return ReliableTxtLines.join(lines)
	}

	static serializeElementMinified(element: SmlElement): string {
		const lines: string[] = []
		element.internalSerialize(lines, 0, "", null, false)
		return ReliableTxtLines.join(lines)
	}

	static serializeEmptyNode(emptyNode: SmlEmptyNode): string {
		const lines: string[] = []
		emptyNode.internalSerialize(lines, 0, null, null, true)
		return lines[0]
	}

	static serializeElement(element: SmlElement, preserveWhitespaceAndComment: boolean): string {
		const lines: string[] = []
		element.internalSerialize(lines, 0, null, "End", preserveWhitespaceAndComment)
		return ReliableTxtLines.join(lines)
	}

	static serializeAttribute(attribute: SmlAttribute, preserveWhitespaceAndComment: boolean): string {
		const lines: string[] = []
		attribute.internalSerialize(lines, 0, null, null, preserveWhitespaceAndComment)
		return lines[0]
	}

	private static serialzeEmptyNodes(emptyNodes: SmlEmptyNode[], lines: string[]) {
		for (const emptyNode of emptyNodes) {
			emptyNode.internalSerialize(lines, 0, null, null, true)
		}
	}

	static getWhitespaces(whitespaces: (string | null)[] | null, level: number, defaultIndentation: string | null): (string | null)[] | null {
		if (whitespaces !== null && whitespaces.length > 0) {
			if (whitespaces[0] === null) {
				if (defaultIndentation === null) { defaultIndentation = "\t" }
				const indentStr: string = defaultIndentation.repeat(level)
				return [indentStr, ...whitespaces.slice(1)]
			}
			return whitespaces 
		}
		if (defaultIndentation === null) { defaultIndentation = "\t" }
		const indentStr: string = defaultIndentation.repeat(level)
		return [indentStr]
	}

	static internalSerializeValuesWhitespacesAndComment(values: (string | null)[], whitespaces: (string | null)[] | null, comment: string | null, lines: string[], level: number, defaultIndentation: string | null) {
		whitespaces = SmlSerializer.getWhitespaces(whitespaces, level, defaultIndentation)
		lines.push(WsvSerializer.internalSerializeValuesWhitespacesAndComment(values, whitespaces, comment))
	}
}

// ----------------------------------------------------------------------

export abstract class SmlJaggedArraySerializer {
	private static _serializeElement(element: SmlElement, endKeyword: string | null, jaggedArray: (string | null)[][]) {
		jaggedArray.push([element.name])
		for (const node of element.nodes) {
			if (node.isAttribute()) {
				const attribute = node as SmlAttribute
				jaggedArray.push([attribute.name, ...attribute.values])
			} else if (node.isElement()) {
				this._serializeElement(node as SmlElement, endKeyword, jaggedArray)
			}
		}
		jaggedArray.push([endKeyword])
	}

	static serialzeElement(element: SmlElement, endKeyword: string | null): (string | null)[][] {
		const result: (string | null)[][] = []
		this._serializeElement(element, endKeyword, result)
		return result
	}
}

// ----------------------------------------------------------------------

export class SmlParserError extends Error {
	readonly lineIndex: number
	
	constructor(lineIndex: number, message: string) {
		super(`${message} (${lineIndex+1})`)
		this.lineIndex = lineIndex
	}
}

// ----------------------------------------------------------------------

export interface SyncWsvLineIterator {	
	hasLine(): boolean
	isEmptyLine(): boolean
	getLine(): WsvLine
	getLineAsArray(): (string | null)[]
	getEndKeyword(): string | null
	getLineIndex(): number
}

// ----------------------------------------------------------------------

export interface WsvLineIterator {	
	hasLine(): Promise<boolean>
	isEmptyLine(): Promise<boolean>
	getLine(): Promise<WsvLine>
	getLineAsArray(): Promise<(string | null)[]>
	getEndKeyword(): string | null
	getLineIndex(): number
}

// ----------------------------------------------------------------------

export class SyncWsvDocumentLineIterator implements SyncWsvLineIterator {
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

	hasLine(): boolean {
		return this.index < this.wsvDocument.lines.length
	}

	isEmptyLine(): boolean {
		return this.hasLine() && !this.wsvDocument.lines[this.index].hasValues
	}

	getLineAsArray(): (string | null)[] {
		return this.getLine().values
	}

	getLine(): WsvLine {
		const line: WsvLine = this.wsvDocument.lines[this.index]
		this.index++
		return line
	}

	toString(): string {
		let result: string = "(" + (this.index + 1) + "): "
		if (this.hasLine()) {
			result += this.wsvDocument.lines[this.index].toString()
		}
		return result
	}

	getLineIndex(): number {
		return this.index
	}
}

// ----------------------------------------------------------------------

export class SyncWsvJaggedArrayLineIterator implements SyncWsvLineIterator {
	private lines: (string | null)[][]
	private endKeyword: string | null
	private index: number = 0

	constructor(lines: (string | null)[][], endKeyword: string | null) {
		this.lines = lines
		this.endKeyword = endKeyword
	}

	getEndKeyword(): string | null {
		return this.endKeyword
	}

	hasLine(): boolean {
		return this.index < this.lines.length
	}

	isEmptyLine(): boolean {
		return this.hasLine() && (this.lines[this.index].length === 0)
	}

	getLine(): WsvLine {
		return new WsvLine(this.getLineAsArray())
	}

	getLineAsArray(): (string | null)[] {
		const line: (string | null)[] = this.lines[this.index]
		this.index++
		return line
	}

	toString(): string {
		let result: string = "(" + (this.index+1) + "): "
		if (this.hasLine()) {
			const line: (string | null)[] = this.lines[this.index]
			if (line !== null) {
				result += WsvSerializer.serializeValues(line)
			}
		}
		return result
	}

	getLineIndex(): number {
		return this.index
	}
}

// ----------------------------------------------------------------------

export abstract class SmlParser {
	private static readonly onlyOneRootElementAllowed: string				= "Only one root element allowed"
	private static readonly rootElementExpected: string						= "Root element expected"
	private static readonly invalidRootElementStart: string					= "Invalid root element start"
	private static readonly nullValueAsElementNameIsNotAllowed: string		= "Null value as element name is not allowed"
	private static readonly nullValueAsAttributeNameIsNotAllowed: string	= "Null value as attribute name is not allowed"
	private static readonly endKeywordCouldNotBeDetected: string			= "End keyword could not be detected"
	
	static parseAttributeSync(content: string, preserveWhitespacesAndComments: boolean): SmlAttribute {
		const line = WsvLine.parse(content, preserveWhitespacesAndComments)
		if (line.values.length < 2) { throw new SmlParserError(0, "Attribute line must have at least two values") }
		const name = line.values[0]
		if (name === null) {
			throw new SmlParserError(0, SmlParser.nullValueAsAttributeNameIsNotAllowed)
		}
		const values: (string | null)[] = line.values.slice(1)
		const childAttribute: SmlAttribute = new SmlAttribute(name, values)
		if (preserveWhitespacesAndComments) {
			SmlNode.internalSetWhitespacesAndComment(childAttribute, this.getLineWhitespaces(line), line.comment)
		}
		return childAttribute
	}

	static parseDocumentSync(content: string, encoding: ReliableTxtEncoding = ReliableTxtEncoding.Utf8): SmlDocument {
		const wsvDocument: WsvDocument = WsvDocument.parse(content)
		const endKeyword: string | null = SmlParser.determineEndKeywordSync(wsvDocument)
		const iterator: SyncWsvLineIterator = new SyncWsvDocumentLineIterator(wsvDocument, endKeyword)
		
		const emptyNodesBefore: SmlEmptyNode[] = []
		const rootElement: SmlElement = SmlParser.readRootElementSync(iterator, emptyNodesBefore)
		SmlParser.readElementContentSync(iterator, rootElement)
		
		const emptyNodesAfter: SmlEmptyNode[] = []
		SmlParser.readEmptyNodesSync(emptyNodesAfter, iterator)
		if (iterator.hasLine()) {
			throw SmlParser.getErrorSync(iterator, SmlParser.onlyOneRootElementAllowed)
		}

		const document: SmlDocument = new SmlDocument(rootElement)
		document.encoding = encoding
		document.endKeyword = endKeyword
		document.emptyNodesBefore = emptyNodesBefore
		document.emptyNodesAfter = emptyNodesAfter
		return document
	}
	
	private static equalIgnoreCase(name1: string | null, name2: string | null): boolean {
		if (name1 === null) {
			return name1 === name2
		}
		if (name2 === null) { return false }
		return SmlStringUtil.equalsIgnoreCase(name1, name2)
	}
	
	static readRootElementSync(iterator: SyncWsvLineIterator, emptyNodesBefore: SmlEmptyNode[]): SmlElement {
		SmlParser.readEmptyNodesSync(emptyNodesBefore, iterator)
		
		if (!iterator.hasLine()) {
			throw SmlParser.getErrorSync(iterator, SmlParser.rootElementExpected)
		}
		const rootStartLine: WsvLine = iterator.getLine()
		if (!rootStartLine.hasValues || rootStartLine.values.length !== 1 || SmlParser.equalIgnoreCase(iterator.getEndKeyword(), rootStartLine.values[0])) {
			throw SmlParser.getLastLineExceptionSync(iterator, SmlParser.invalidRootElementStart)
		}
		const rootElementName: string | null = rootStartLine.values[0]
		if (rootElementName === null) {
			throw SmlParser.getLastLineExceptionSync(iterator, SmlParser.nullValueAsElementNameIsNotAllowed)
		}
		const rootElement: SmlElement = new SmlElement(rootElementName)
		SmlNode.internalSetWhitespacesAndComment(rootElement, this.getLineWhitespaces(rootStartLine), rootStartLine.comment)
		return rootElement
	}

	static async readRootElement(iterator: WsvLineIterator, emptyNodesBefore: SmlEmptyNode[]): Promise<SmlElement> {
		await SmlParser.readEmptyNodes(emptyNodesBefore, iterator)
		if (!await iterator.hasLine()) {
			throw SmlParser.getError(iterator, SmlParser.rootElementExpected)
		}
		const rootStartLine: WsvLine = await iterator.getLine()
		if (!rootStartLine.hasValues || rootStartLine.values.length !== 1 || SmlParser.equalIgnoreCase(iterator.getEndKeyword(), rootStartLine.values[0])) {
			throw SmlParser.getLastLineException(iterator, SmlParser.invalidRootElementStart)
		}
		const rootElementName: string | null = rootStartLine.values[0]
		if (rootElementName === null) {
			throw SmlParser.getLastLineException(iterator, SmlParser.nullValueAsElementNameIsNotAllowed)
		}
		const rootElement: SmlElement = new SmlElement(rootElementName)
		SmlNode.internalSetWhitespacesAndComment(rootElement, this.getLineWhitespaces(rootStartLine), rootStartLine.comment)
		return rootElement
	}
	
	private static getLineWhitespaces(line: WsvLine): (string | null)[] | null {
		const lineWhitespaces = WsvLine.internalWhitespaces(line)
		if (lineWhitespaces !== null && lineWhitespaces.length > 0 && lineWhitespaces[0] === null) {
			lineWhitespaces[0] = ""
		}
		return lineWhitespaces
	}

	static readNodeSync(iterator: SyncWsvLineIterator, parentElement: SmlElement): SmlNode | null {
		const line: WsvLine = iterator.getLine()
		if (line.hasValues) {
			const name: string | null = line.values[0]
			if (line.values.length === 1) {
				if (SmlParser.equalIgnoreCase(iterator.getEndKeyword(), name)) {
					SmlElement.internalSetEndWhitespacesAndComment(parentElement, this.getLineWhitespaces(line), line.comment)
					return null
				}
				if (name === null) {
					throw SmlParser.getLastLineExceptionSync(iterator, SmlParser.nullValueAsElementNameIsNotAllowed)
				}
				const childElement: SmlElement = new SmlElement(name)
				SmlNode.internalSetWhitespacesAndComment(childElement, this.getLineWhitespaces(line), line.comment)

				SmlParser.readElementContentSync(iterator, childElement)

				return childElement
			} else {
				if (name === null) {
					throw SmlParser.getLastLineExceptionSync(iterator, SmlParser.nullValueAsAttributeNameIsNotAllowed)
				}
				const values: (string | null)[] = line.values.slice(1)
				const childAttribute: SmlAttribute = new SmlAttribute(name, values)
				SmlNode.internalSetWhitespacesAndComment(childAttribute, this.getLineWhitespaces(line), line.comment)
				
				return childAttribute
			}
		} else {
			const emptyNode: SmlEmptyNode = new SmlEmptyNode()
			SmlNode.internalSetWhitespacesAndComment(emptyNode, this.getLineWhitespaces(line), line.comment)

			return emptyNode
		}
	}

	static async readNode(iterator: WsvLineIterator, parentElement: SmlElement): Promise<SmlNode | null> {
		const line: WsvLine = await iterator.getLine()
		if (line.hasValues) {
			const name: string | null = line.values[0]
			if (line.values.length === 1) {
				if (SmlParser.equalIgnoreCase(iterator.getEndKeyword(), name)) {
					SmlElement.internalSetEndWhitespacesAndComment(parentElement, this.getLineWhitespaces(line), line.comment)
					return null
				}
				if (name === null) {
					throw SmlParser.getLastLineException(iterator, SmlParser.nullValueAsElementNameIsNotAllowed)
				}
				const childElement: SmlElement = new SmlElement(name)
				SmlNode.internalSetWhitespacesAndComment(childElement, this.getLineWhitespaces(line), line.comment)

				await SmlParser.readElementContent(iterator, childElement)

				return childElement
			} else {
				if (name === null) {
					throw SmlParser.getLastLineException(iterator, SmlParser.nullValueAsAttributeNameIsNotAllowed)
				}
				const values: (string | null)[] = line.values.slice(1)
				const childAttribute: SmlAttribute = new SmlAttribute(name, values)
				SmlNode.internalSetWhitespacesAndComment(childAttribute, this.getLineWhitespaces(line), line.comment)
				
				return childAttribute
			}
		} else {
			const emptyNode: SmlEmptyNode = new SmlEmptyNode()
			SmlNode.internalSetWhitespacesAndComment(emptyNode, this.getLineWhitespaces(line), line.comment)

			return emptyNode
		}
	}
	
	private static readElementContentSync(iterator: SyncWsvLineIterator, element: SmlElement) {
		for (;;) {
			if (!iterator.hasLine()) {
				throw SmlParser.getLastLineExceptionSync(iterator, `Element "${element.name}" not closed`)
			}
			const node: SmlNode | null = SmlParser.readNodeSync(iterator, element)
			if (node === null) { break }
			element.addNode(node)
		}
	}

	private static async readElementContent(iterator: WsvLineIterator, element: SmlElement) {
		for (;;) {
			if (!await iterator.hasLine()) {
				throw SmlParser.getLastLineException(iterator, `Element "${element.name}" not closed`)
			}
			const node: SmlNode | null = await SmlParser.readNode(iterator, element)
			if (node === null) { break }
			element.addNode(node)
		}
	}
	
	private static readEmptyNodesSync(nodes: SmlEmptyNode[], iterator: SyncWsvLineIterator) {
		while (iterator.isEmptyLine()) {
			const emptyNode: SmlEmptyNode = SmlParser.readEmptyNodeSync(iterator)
			nodes.push(emptyNode)
		}
	}

	private static async readEmptyNodes(nodes: SmlEmptyNode[], iterator: WsvLineIterator) {
		while (await iterator.isEmptyLine()) {
			const emptyNode: SmlEmptyNode = await SmlParser.readEmptyNode(iterator)
			nodes.push(emptyNode)
		}
	}
	
	private static readEmptyNodeSync(iterator: SyncWsvLineIterator): SmlEmptyNode {
		const line: WsvLine = iterator.getLine()
		const emptyNode: SmlEmptyNode = new SmlEmptyNode()
		SmlNode.internalSetWhitespacesAndComment(emptyNode, this.getLineWhitespaces(line), line.comment)
		return emptyNode
	}

	private static async readEmptyNode(iterator: WsvLineIterator): Promise<SmlEmptyNode> {
		const line: WsvLine = await iterator.getLine()
		const emptyNode: SmlEmptyNode = new SmlEmptyNode()
		SmlNode.internalSetWhitespacesAndComment(emptyNode, this.getLineWhitespaces(line), line.comment)
		return emptyNode
	}
	
	private static determineEndKeywordSync(wsvDocument: WsvDocument): string | null {
		for (let i=wsvDocument.lines.length-1; i>=0; i--) {
			const values: (string | null)[] = wsvDocument.lines[i].values
			if (values != null) {
				if (values.length === 1) {
					return values[0]
				} else if (values.length > 1) {
					break
				}
			}
		}
		throw new SmlParserError(wsvDocument.lines.length-1, SmlParser.endKeywordCouldNotBeDetected)
	}
	
	private static getErrorSync(iterator: SyncWsvLineIterator, message: string): SmlParserError {
		return new SmlParserError(iterator.getLineIndex(), message)
	}

	private static getError(iterator: WsvLineIterator, message: string): SmlParserError {
		return new SmlParserError(iterator.getLineIndex(), message)
	}

	private static getLastLineExceptionSync(iterator: SyncWsvLineIterator, message: string): SmlParserError {
		return new SmlParserError(iterator.getLineIndex()-1, message)
	}
	
	private static getLastLineException(iterator: WsvLineIterator, message: string): SmlParserError {
		return new SmlParserError(iterator.getLineIndex()-1, message)
	}

	static parseDocumentNonPreservingSync(content: string, encoding: ReliableTxtEncoding = ReliableTxtEncoding.Utf8): SmlDocument {
		const wsvLines: (string | null)[][] = WsvDocument.parseAsJaggedArray(content)
		return SmlParser.parseJaggedArraySync(wsvLines, encoding)
	}
	
	static parseJaggedArraySync(wsvLines: (string | null)[][], encoding: ReliableTxtEncoding = ReliableTxtEncoding.Utf8): SmlDocument {
		const endKeyword: string | null = SmlParser.determineEndKeywordFromJaggedArraySync(wsvLines)
		const iterator: SyncWsvLineIterator = new SyncWsvJaggedArrayLineIterator(wsvLines, endKeyword)
		
		const rootElement: SmlElement = SmlParser.parseDocumentNonPreservingInternalSync(iterator)
		const document: SmlDocument = new SmlDocument(rootElement)
		document.encoding = encoding
		document.endKeyword = endKeyword
		
		return document
	}
	
	private static parseDocumentNonPreservingInternalSync(iterator: SyncWsvLineIterator): SmlElement {
		SmlParser.skipEmptyLinesSync(iterator)
		if (!iterator.hasLine()) {
			throw SmlParser.getErrorSync(iterator, SmlParser.rootElementExpected)
		}
		
		const node: SmlNode | null = SmlParser.readNodeNonPreservingSync(iterator)
		if (!(node instanceof SmlElement)) {
			throw SmlParser.getLastLineExceptionSync(iterator, SmlParser.invalidRootElementStart)
		}
		
		SmlParser.skipEmptyLinesSync(iterator)
		if (iterator.hasLine()) {
			throw SmlParser.getErrorSync(iterator, SmlParser.onlyOneRootElementAllowed)
		}

		return node as SmlElement
	}
	
	private static skipEmptyLinesSync(iterator: SyncWsvLineIterator) {
		while (iterator.isEmptyLine()) {
			iterator.getLineAsArray()
		}
	}
	
	private static readNodeNonPreservingSync(iterator: SyncWsvLineIterator): SmlNode | null {
		const line: (string | null)[] = iterator.getLineAsArray()
		
		const name: string | null = line[0]
		if (line.length === 1) {
			if (SmlParser.equalIgnoreCase(iterator.getEndKeyword(),name)) {
				return null
			}
			if (name === null) {
				throw SmlParser.getLastLineExceptionSync(iterator, SmlParser.nullValueAsElementNameIsNotAllowed)
			}
			const element: SmlElement = new SmlElement(name)
			SmlParser.readElementContentNonPreservingSync(iterator, element)
			return element
		} else {
			if (name === null) {
				throw SmlParser.getLastLineExceptionSync(iterator, SmlParser.nullValueAsAttributeNameIsNotAllowed)
			}
			const values: (string | null)[] = line.slice(1)
			const attribute: SmlAttribute = new SmlAttribute(name, values)
			return attribute
		}
	}
	
	private static readElementContentNonPreservingSync(iterator: SyncWsvLineIterator, element: SmlElement) {
		for (;;) {
			SmlParser.skipEmptyLinesSync(iterator)
			if (!iterator.hasLine()) {
				throw SmlParser.getLastLineExceptionSync(iterator, `Element "${element.name}" not closed`)
			}
			const node: SmlNode | null = SmlParser.readNodeNonPreservingSync(iterator)
			if (node === null) {
				break
			}
			element.addNode(node)
		}
	}
	
	private static determineEndKeywordFromJaggedArraySync(lines: (string | null)[][]): string | null {
		for (let i=lines.length-1; i>=0; i--) {
			const values: (string | null)[] = lines[i]
			if (values.length === 1) {
				return values[0]
			} else if (values.length > 1) {
				break
			}
		}
		throw new SmlParserError(lines.length-1, SmlParser.endKeywordCouldNotBeDetected)
	}
}

// ----------------------------------------------------------------------

export abstract class BinarySmlUtil {
	static getPreambleVersion1(): Uint8Array {
		return new Uint8Array([0x42, 0x53, 0x4D, 0x4C, 0x31])
	}

	static readonly elementEndByte = 0b00000001
	static readonly emptyElementNameByte = 0b00000101
	static readonly emptyAttributeNameByte = 0b00000011

	static readonly attributeEndByte = 0b00000001
	static readonly nullValueByte = 0b00000011
}

// ----------------------------------------------------------------------

export abstract class BinarySmlEncoder {
	private static _encodeAttribute(attribute: SmlAttribute, builder: Uint8ArrayBuilder) {
		if (attribute.name.length === 0) {
			builder.pushByte(BinarySmlUtil.emptyAttributeNameByte)
		} else {
			const attributeNameEncoded = Utf16String.toUtf8Bytes(attribute.name)
			builder.pushVarInt56((attributeNameEncoded.length << 1) | 1)
			builder.push(attributeNameEncoded)
		}
		attribute.internalBinarySerialize(builder)
	}

	private static _encodeElement(element: SmlElement, builder: Uint8ArrayBuilder, isRootElement: boolean) {
		if (element.name.length === 0) {
			builder.pushByte(BinarySmlUtil.emptyElementNameByte)
		} else {
			const elementNameEncoded = Utf16String.toUtf8Bytes(element.name)
			builder.pushVarInt56((elementNameEncoded.length + 1) << 1)
			builder.push(elementNameEncoded)
		}

		for (const node of element.nodes) {
			if (node.isAttribute()) {
				this._encodeAttribute(node as SmlAttribute, builder)
			} else if (node.isElement()) {
				this._encodeElement(node as SmlElement, builder, false)
			}
		}

		if (isRootElement === false) {
			builder.pushByte(BinarySmlUtil.elementEndByte)
		}
	}

	static encodeElement(element: SmlElement, isRootElement: boolean = false): Uint8Array {
		const builder: Uint8ArrayBuilder = new Uint8ArrayBuilder()
		if (isRootElement === true) {
			const preamble = BinarySmlUtil.getPreambleVersion1()
			builder.push(preamble)	
		}
		this._encodeElement(element, builder, isRootElement)
		return builder.getArray()
	}

	static encodeAttribute(attribute: SmlAttribute): Uint8Array {
		const builder: Uint8ArrayBuilder = new Uint8ArrayBuilder()
		this._encodeAttribute(attribute, builder)
		return builder.getArray()
	}

	static encodeNode(node: SmlNode): Uint8Array {
		if (node.isAttribute()) { return this.encodeAttribute(node as SmlAttribute) }
		else if (node.isElement()) { return this.encodeElement(node as SmlElement) }
		else return new Uint8Array(0)
	}

	static encodeNodes(nodes: SmlNode[]): Uint8Array {
		const builder: Uint8ArrayBuilder = new Uint8ArrayBuilder()
		for (const node of nodes) {
			if (node.isAttribute()) {
				this._encodeAttribute(node as SmlAttribute, builder)
			} else if (node.isElement()) {
				this._encodeElement(node as SmlElement, builder, false)
			}
		}
		return builder.getArray()
	}

	static encode(document: SmlDocument): Uint8Array {
		return this.encodeElement(document.root, true)
	}
}

// ----------------------------------------------------------------------

export class NoBinarySmlPreambleError extends Error {
	constructor() {
		super("Document does not have a BinarySML preamble")
	}
}

// ----------------------------------------------------------------------

export class InvalidBinarySmlError extends Error {
	constructor() {
		super("Invalid BinarySML")
	}
}

// ----------------------------------------------------------------------

export abstract class BinarySmlDecoder {
	static getVersion(bytes: Uint8Array): string {
		const version = this.getVersionOrNull(bytes)
		if (version === null) {
			throw new NoBinarySmlPreambleError()
		}
		return version
	}

	static getVersionOrNull(bytes: Uint8Array): string | null {
		if (bytes.length < 5 ||
			bytes[0] !== 0x42 ||
			bytes[1] !== 0x53 ||
			bytes[2] !== 0x4D ||
			bytes[3] !== 0x4C) {
			return null
		}
		return String.fromCharCode(bytes[4])
	}

	private static _decodeAttribute(reader: Uint8ArrayReader, attributeVarInt: number): SmlAttribute {
		const attributeName = attributeVarInt === 0b1 ? "" : reader.readString(attributeVarInt >> 1)

		const values: (string | null)[] = []
		while (reader.hasBytes) {
			const wasAttributeEnd = BinaryWsvDecoder.decodeValue(reader, values)
			if (wasAttributeEnd === true) {
				return new SmlAttribute(attributeName, values)
			}
		}
		throw new InvalidBinarySmlError() 
	}

	private static _decodeElement(reader: Uint8ArrayReader, isRootElement: boolean, elementVarInt: number): SmlElement {
		const elementName = elementVarInt === 0b10 ? "" : reader.readString((elementVarInt >> 1) - 1)
		const element = new SmlElement(elementName)
		
		while (reader.hasBytes) {
			const varInt = reader.readVarInt56()
			if (varInt === 0) {
				if (isRootElement === true) { throw new InvalidBinarySmlError() }
				return element
			} else if ((varInt & 0b1) === 0) {
				const childElement = this._decodeElement(reader, false, varInt)
				element.addNode(childElement)
			} else {
				const childAttribute = this._decodeAttribute(reader, varInt)
				element.addNode(childAttribute)
			}
		}
		if (isRootElement === false) { throw new InvalidBinarySmlError() }
		return element
	}

	static decode(bytes: Uint8Array): SmlDocument {
		const version = this.getVersion(bytes)
		if (version !== "1") {
			throw new Error(`Not supported BinarySML version '${version}'`)
		}
		const reader = new Uint8ArrayReader(bytes, 5)
		const varInt = reader.readVarInt56()
		if ((varInt & 0b1) === 1) { throw new InvalidBinarySmlError() }
		const rootElement = this._decodeElement(reader, true, varInt)
		
		if (reader.hasBytes) { throw new InvalidBinarySmlError() }
		return new SmlDocument(rootElement)
	}
}