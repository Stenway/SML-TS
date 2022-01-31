/* (C) Stefan John / Stenway / SimpleML.com / 2022 */

import { ReliableTxtDocument, ReliableTxtEncoding, ReliableTxtLines } from "./reliabletxt.js"
import { SyncWsvStreamReader } from "./wsv-io.js"
import { WsvStringUtil, WsvDocument, WsvLine, WsvSerializer } from "./wsv.js"

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

	abstract serialize(lines: string[], level: number, defaultIndentation: string | null, endKeyword: string | null, preserveWhitespaceAndComment: boolean): void

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
	
	serialize(lines: string[], level: number, defaultIndentation: string | null, endKeyword: string | null, preserveWhitespaceAndComment: boolean) {
		if (!preserveWhitespaceAndComment) { return }
		SmlSerializer.serializeValuesWhitespacesAndComment([], this._whitespaces, this._comment, lines, level, defaultIndentation)
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

	isElementWithName(name: string) {
		if (!(this instanceof SmlElement)) return false
		return this.hasName(name)
	}
	
	isAttributeWithName(name: string) {
		if (!(this instanceof SmlAttribute)) return false
		return this.hasName(name)
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

	constructor(name: string, values: (string | null)[]) {
		super(name)
		if (values.length === 0) { throw new TypeError(`Attribute "${name}" must contain at least one value`) }
		this._values = [...values]
	}

	toString(preserveWhitespaceAndComment: boolean = true): string {
		return SmlSerializer.serializeAttribute(this, preserveWhitespaceAndComment)
	}

	serialize(lines: string[], level: number, defaultIndentation: string | null, endKeyword: string | null, preserveWhitespaceAndComment: boolean) {
		let combined: (string | null)[] = [this.name, ...this.values]
		if (preserveWhitespaceAndComment) { SmlSerializer.serializeValuesWhitespacesAndComment(combined, this._whitespaces, this._comment, lines, level, defaultIndentation) }
		else { SmlSerializer.serializeValuesWhitespacesAndComment(combined, null, null, lines, level, defaultIndentation) }
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

	addAttribute(name: string, values: (string | null)[]): SmlAttribute {
		let attribute: SmlAttribute = new SmlAttribute(name, values)
		this.addNode(attribute)
		return attribute
	}

	addElement(name: string): SmlElement {
		let element: SmlElement = new SmlElement(name)
		this.addNode(element)
		return element
	}

	addEmptyNode(): SmlEmptyNode {
		let emptyNode: SmlEmptyNode = new SmlEmptyNode()
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
		let result: SmlNamedNode | undefined = this.nodes.
			filter(node => node instanceof SmlNamedNode).
			map(node => node as SmlNamedNode).
			find(namedNode => namedNode.hasName(name))
		if (result === undefined) { throw new Error(`Element "${this.name}" does not contain a "${name}" named node`) }
		return result
	}

	namedNodeOrNull(name: string): SmlNamedNode | null {
		let result: SmlNamedNode | undefined = this.nodes.
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
		let result: SmlElement | undefined = this.nodes.
			filter(node => node instanceof SmlElement).
			map(node => node as SmlElement).
			find(element => element.hasName(name))
		if (result === undefined) { throw new Error(`Element "${this.name}" does not contain a "${name}" element`) }
		return result
	}

	elementOrNull(name: string): SmlElement | null {
		let result: SmlElement | undefined = this.nodes.
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
		let result: SmlAttribute | undefined = this.nodes.
			filter(node => node instanceof SmlAttribute).
			map(node => node as SmlAttribute).
			find(attribute => attribute.hasName(name))
		if (result === undefined) { throw new Error(`Element "${this.name}" does not contain a "${name}" attribute`) }
		return result
	}

	attributeOrNull(name: string): SmlAttribute | null {
		let result: SmlAttribute | undefined = this.nodes.
			filter(node => node instanceof SmlAttribute).
			map(node => node as SmlAttribute).
			find(attribute => attribute.hasName(name))
		if (result === undefined) { return null }
		return result
	}

	toString(preserveWhitespaceAndComment: boolean = true): string {
		return SmlSerializer.serializeElement(this, preserveWhitespaceAndComment)
	}

	serialize(lines: string[], level: number, defaultIndentation: string | null, endKeyword: string | null, preserveWhitespaceAndComment: boolean) {
		if (endKeyword !== null && this.hasName(endKeyword)) {
			throw new Error(`Element name matches the end keyword "${endKeyword}"`)
		}
		if (preserveWhitespaceAndComment) {
			SmlSerializer.serializeValuesWhitespacesAndComment([this.name], this._whitespaces, this._comment, lines, level, defaultIndentation)
			let childLevel: number = level + 1
			for (let child of this.nodes) {
				child.serialize(lines, childLevel, defaultIndentation, endKeyword, preserveWhitespaceAndComment)
			}
			SmlSerializer.serializeValuesWhitespacesAndComment([endKeyword], this._endWhitespaces, this._endComment, lines, level, defaultIndentation)
		} else {
			SmlSerializer.serializeValuesWhitespacesAndComment([this.name], null, null, lines, level, defaultIndentation)
			let childLevel: number = level + 1
			for (let child of this.nodes) {
				child.serialize(lines, childLevel, defaultIndentation, endKeyword, preserveWhitespaceAndComment)
			}
			SmlSerializer.serializeValuesWhitespacesAndComment([endKeyword], null, null, lines, level, defaultIndentation)		
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
		for (let node of this.nodes) { node.minify() }
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
		let str: string = this.toString(preserveWhitespacesAndComments)
		return new ReliableTxtDocument(str, this.encoding).getBytes()
	}

	static parse(content: string, preserveWhitespaceAndComments: boolean = true): SmlDocument {
		if (preserveWhitespaceAndComments) { return SmlParser.parseDocument(content) }
		else { return SmlParser.parseDocumentNonPreserving(content) }
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
		let lines: string[] = []

		SmlSerializer.serialzeEmptyNodes(document.emptyNodesBefore, lines)
		document.root.serialize(lines, 0, document.defaultIndentation, document.endKeyword, preserveWhitespaceAndComment)
		SmlSerializer.serialzeEmptyNodes(document.emptyNodesAfter, lines)

		return ReliableTxtLines.join(lines)
	}

	static serializeElementMinified(element: SmlElement): string {
		let lines: string[] = []
		element.serialize(lines, 0, "", null, false)
		return ReliableTxtLines.join(lines)
	}

	static serializeEmptyNode(emptyNode: SmlEmptyNode): string {
		let lines: string[] = []
		emptyNode.serialize(lines, 0, null, null, true)
		return lines[0]
	}

	static serializeElement(element: SmlElement, preserveWhitespaceAndComment: boolean): string {
		let lines: string[] = []
		element.serialize(lines, 0, null, "End", preserveWhitespaceAndComment)
		return ReliableTxtLines.join(lines)
	}

	static serializeAttribute(attribute: SmlAttribute, preserveWhitespaceAndComment: boolean): string {
		let lines: string[] = []
		attribute.serialize(lines, 0, null, null, preserveWhitespaceAndComment)
		return lines[0]
	}

	private static serialzeEmptyNodes(emptyNodes: SmlEmptyNode[], lines: string[]) {
		for (let emptyNode of emptyNodes) {
			emptyNode.serialize(lines, 0, null, null, true)
		}
	}

	static getWhitespaces(whitespaces: (string | null)[] | null, level: number, defaultIndentation: string | null): (string | null)[] | null {
		if (whitespaces !== null && whitespaces.length > 0) { return whitespaces }
		if (defaultIndentation === null) {
			let indentStr: string = "\t".repeat(level)
			return [indentStr]
		} else {
			let indentStr: string = defaultIndentation.repeat(level)
			return [indentStr]
		}
	}

	static serializeValuesWhitespacesAndComment(values: (string | null)[], whitespaces: (string | null)[] | null, comment: string | null, lines: string[], level: number, defaultIndentation: string | null) {
		whitespaces = SmlSerializer.getWhitespaces(whitespaces, level, defaultIndentation)
		lines.push(WsvSerializer.serializeValuesWhitespacesAndComment(values, whitespaces, comment))
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

export interface WsvLineIterator {	
	hasLine(): boolean
	isEmptyLine(): boolean
	getLine(): WsvLine
	getLineAsArray(): (string | null)[]
	getEndKeyword(): string | null
	getLineIndex(): number
}

// ----------------------------------------------------------------------

export class WsvDocumentLineIterator implements WsvLineIterator {
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
		let line: WsvLine = this.wsvDocument.lines[this.index]
		this.index++
		return line
	}

	toString(): string {
		let result: string = "(" + this.index + "): "
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

export class WsvJaggedArrayLineIterator implements WsvLineIterator {
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
		let line: (string | null)[] = this.lines[this.index]
		this.index++;
		return line
	}

	toString(): string {
		let result: string = "(" + this.index + "): "
		if (this.hasLine()) {
			let line: (string | null)[] = this.lines[this.index]
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

export class SyncWsvStreamLineIterator implements WsvLineIterator {
	private reader: SyncWsvStreamReader
	private currentLine: WsvLine | null
	private endKeyword: string | null
	private index: number = 0

	constructor(reader: SyncWsvStreamReader, endKeyword: string | null) {
		this.reader = reader
		this.endKeyword = endKeyword
		this.currentLine = reader.readLine()
	}

	getEndKeyword(): string | null {
		return this.endKeyword
	}

	hasLine(): boolean {
		return this.currentLine !== null
	}

	isEmptyLine(): boolean {
		return this.hasLine() && !this.currentLine!.hasValues
	}

	getLine(): WsvLine {
		let result: WsvLine = this.currentLine!
		this.currentLine = this.reader.readLine()
		this.index++
		return result
	}

	getLineAsArray(): (string | null)[] {
		return this.getLine().values
	}

	toString(): string {
		let result: string = "(" + this.index + "): "
		if (this.hasLine()) {
			result += this.currentLine!.toString()
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
	
	static parseDocument(content: string): SmlDocument {
		let wsvDocument: WsvDocument = WsvDocument.parse(content)
		let endKeyword: string | null = SmlParser.determineEndKeyword(wsvDocument)
		let iterator: WsvLineIterator = new WsvDocumentLineIterator(wsvDocument, endKeyword)
		
		let emptyNodesBefore: SmlEmptyNode[] = []
		let rootElement: SmlElement = SmlParser.readRootElement(iterator, emptyNodesBefore)
		SmlParser.readElementContent(iterator, rootElement)
		
		let emptyNodesAfter: SmlEmptyNode[] = []
		SmlParser.readEmptyNodes(emptyNodesAfter, iterator)
		if (iterator.hasLine()) {
			throw SmlParser.getError(iterator, SmlParser.onlyOneRootElementAllowed);
		}

		let document: SmlDocument = new SmlDocument(rootElement)
		document.endKeyword = endKeyword
		document.emptyNodesBefore = emptyNodesBefore
		return document
	}
	
	private static equalIgnoreCase(name1: string | null, name2: string | null): boolean {
		if (name1 === null) {
			return name1 === name2;
		}
		if (name2 === null) { return false }
		return SmlStringUtil.equalsIgnoreCase(name1, name2)
	}
	
	static readRootElement(iterator: WsvLineIterator, emptyNodesBefore: SmlEmptyNode[]): SmlElement {
		SmlParser.readEmptyNodes(emptyNodesBefore, iterator)
		
		if (!iterator.hasLine()) {
			throw SmlParser.getError(iterator, SmlParser.rootElementExpected)
		}
		let rootStartLine: WsvLine = iterator.getLine()
		if (!rootStartLine.hasValues || rootStartLine.values.length !== 1 || SmlParser.equalIgnoreCase(iterator.getEndKeyword(), rootStartLine.values[0])) {
			throw SmlParser.getLastLineException(iterator, SmlParser.invalidRootElementStart);
		}
		let rootElementName: string | null = rootStartLine.values[0]
		if (rootElementName === null) {
			throw SmlParser.getLastLineException(iterator, SmlParser.nullValueAsElementNameIsNotAllowed)
		}
		let rootElement: SmlElement = new SmlElement(rootElementName)
		SmlNode.internalSetWhitespacesAndComment(rootElement, WsvLine.internalWhitespaces(rootStartLine), rootStartLine.comment)
		return rootElement
	}
	
	static readNode(iterator: WsvLineIterator, parentElement: SmlElement): SmlNode | null {
		let line: WsvLine = iterator.getLine()
		if (line.hasValues) {
			let name: string | null = line.values[0]
			if (line.values.length === 1) {
				if (SmlParser.equalIgnoreCase(iterator.getEndKeyword(), name)) {
					SmlElement.internalSetEndWhitespacesAndComment(parentElement, WsvLine.internalWhitespaces(line), line.comment)
					return null
				}
				if (name === null) {
					throw SmlParser.getLastLineException(iterator, SmlParser.nullValueAsElementNameIsNotAllowed)
				}
				let childElement: SmlElement = new SmlElement(name);
				SmlNode.internalSetWhitespacesAndComment(childElement, WsvLine.internalWhitespaces(line), line.comment)

				SmlParser.readElementContent(iterator, childElement)

				return childElement
			} else {
				if (name === null) {
					throw SmlParser.getLastLineException(iterator, SmlParser.nullValueAsAttributeNameIsNotAllowed)
				}
				let values: (string | null)[] = line.values.slice(1)
				let childAttribute: SmlAttribute = new SmlAttribute(name, values)
				SmlNode.internalSetWhitespacesAndComment(childAttribute, WsvLine.internalWhitespaces(line), line.comment)
				
				return childAttribute
			}
		} else {
			let emptyNode: SmlEmptyNode = new SmlEmptyNode()
			SmlNode.internalSetWhitespacesAndComment(emptyNode, WsvLine.internalWhitespaces(line), line.comment)

			return emptyNode
		}
	}
	
	private static readElementContent(iterator: WsvLineIterator, element: SmlElement) {
		while (true) {
			if (!iterator.hasLine()) {
				throw SmlParser.getLastLineException(iterator, `Element "${element.name}" not closed`)
			}
			let node: SmlNode | null = SmlParser.readNode(iterator, element)
			if (node === null) { break }
			element.addNode(node)
		}
	}
	
	private static readEmptyNodes(nodes: SmlEmptyNode[], iterator: WsvLineIterator) {
		while (iterator.isEmptyLine()) {
			let emptyNode: SmlEmptyNode = SmlParser.readEmptyNode(iterator)
			nodes.push(emptyNode)
		}
	}
	
	private static readEmptyNode(iterator: WsvLineIterator): SmlEmptyNode {
		let line: WsvLine = iterator.getLine()
		let emptyNode: SmlEmptyNode = new SmlEmptyNode()
		SmlNode.internalSetWhitespacesAndComment(emptyNode, WsvLine.internalWhitespaces(line), line.comment)
		return emptyNode
	}
	
	private static determineEndKeyword(wsvDocument: WsvDocument): string | null {
		for (let i=wsvDocument.lines.length-1; i>=0; i--) {
			let values: (string | null)[] = wsvDocument.lines[i].values
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
	
	private static getError(iterator: WsvLineIterator, message: string): SmlParserError {
		return new SmlParserError(iterator.getLineIndex(), message)
	}

	private static getLastLineException(iterator: WsvLineIterator, message: string): SmlParserError {
		return new SmlParserError(iterator.getLineIndex()-1, message);
	}
	
	static parseDocumentNonPreserving(content: string): SmlDocument {
		let wsvLines: (string | null)[][] = WsvDocument.parseAsJaggedArray(content)
		return SmlParser.parseJaggedArray(wsvLines)
	}
	
	static parseJaggedArray(wsvLines: (string | null)[][]): SmlDocument {
		let endKeyword: string | null = SmlParser.determineEndKeywordFromJaggedArray(wsvLines)
		let iterator: WsvLineIterator = new WsvJaggedArrayLineIterator(wsvLines, endKeyword)
		
		let rootElement: SmlElement = SmlParser.parseDocumentNonPreservingInternal(iterator)
		let document: SmlDocument = new SmlDocument(rootElement)
		document.endKeyword = endKeyword
		
		return document
	}
	
	private static parseDocumentNonPreservingInternal(iterator: WsvLineIterator): SmlElement {
		SmlParser.skipEmptyLines(iterator)
		if (!iterator.hasLine()) {
			throw SmlParser.getError(iterator, SmlParser.rootElementExpected)
		}
		
		let node: SmlNode | null = SmlParser.readNodeNonPreserving(iterator)
		if (!(node instanceof SmlElement)) {
			throw SmlParser.getLastLineException(iterator, SmlParser.invalidRootElementStart)
		}
		
		SmlParser.skipEmptyLines(iterator)
		if (iterator.hasLine()) {
			throw SmlParser.getError(iterator, SmlParser.onlyOneRootElementAllowed)
		}

		return node as SmlElement
	}
	
	private static skipEmptyLines(iterator: WsvLineIterator) {
		while (iterator.isEmptyLine()) {
			iterator.getLineAsArray()
		}
	}
	
	private static readNodeNonPreserving(iterator: WsvLineIterator): SmlNode | null {
		let line: (string | null)[] = iterator.getLineAsArray()
		
		let name: string | null = line[0]
		if (line.length === 1) {
			if (SmlParser.equalIgnoreCase(iterator.getEndKeyword(),name)) {
				return null
			}
			if (name === null) {
				throw SmlParser.getLastLineException(iterator, SmlParser.nullValueAsElementNameIsNotAllowed)
			}
			let element: SmlElement = new SmlElement(name)
			SmlParser.readElementContentNonPreserving(iterator, element)
			return element
		} else {
			if (name === null) {
				throw SmlParser.getLastLineException(iterator, SmlParser.nullValueAsAttributeNameIsNotAllowed)
			}
			let values: (string | null)[] = line.slice(1)
			let attribute: SmlAttribute = new SmlAttribute(name, values)
			return attribute
		}
	}
	
	private static readElementContentNonPreserving(iterator: WsvLineIterator, element: SmlElement) {
		while (true) {
			SmlParser.skipEmptyLines(iterator)
			if (!iterator.hasLine()) {
				throw SmlParser.getLastLineException(iterator, `Element "${element.name}" not closed`)
			}
			let node: SmlNode | null = SmlParser.readNodeNonPreserving(iterator)
			if (node === null) {
				break
			}
			element.addNode(node)
		}
	}
	
	private static determineEndKeywordFromJaggedArray(lines: (string | null)[][]): string | null {
		for (let i=lines.length-1; i>=0; i--) {
			let values: (string | null)[] = lines[i]
			if (values.length === 1) {
				return values[0]
			} else if (values.length > 1) {
				break
			}
		}
		throw new SmlParserError(lines.length-1, SmlParser.endKeywordCouldNotBeDetected)
	}
}