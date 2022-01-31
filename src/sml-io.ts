/* (C) Stefan John / Stenway / SimpleML.com / 2022 */

import * as fs from 'fs'
import { ReliableTxtFile, ReverseLineIterator, SyncReliableTxtStreamWriter } from "./reliabletxt-io.js"
import { ReliableTxtDocument, ReliableTxtEncoding, Utf16String } from "./reliabletxt.js"
import { SmlDocument, SmlElement, SmlEmptyNode, SmlNode, SmlParser, SmlParserError, SyncWsvStreamLineIterator } from "./sml.js"
import { SyncWsvStreamReader, SyncWsvStreamWriter } from "./wsv-io.js"
import { WsvLine, WsvSerializer } from "./wsv.js"

// ----------------------------------------------------------------------

export abstract class SmlFile {
	static loadSync(filePath: string, preserveWhitespacesAndComments: boolean = true): SmlDocument {
		let reliableTxtDocument: ReliableTxtDocument = ReliableTxtFile.loadSync(filePath)
		let smlDocument: SmlDocument = SmlDocument.parse(reliableTxtDocument.text, preserveWhitespacesAndComments)
		smlDocument.encoding = reliableTxtDocument.encoding
		return smlDocument
	}

	static saveSync(document: SmlDocument, filePath: string, preserveWhitespacesAndComments: boolean = true) {
		let text: string = document.toString(preserveWhitespacesAndComments)
		ReliableTxtFile.writeAllTextSync(text, filePath, document.encoding)
	}
}

// ----------------------------------------------------------------------

export class SyncSmlStreamReader {
	readonly encoding: ReliableTxtEncoding
	readonly root: SmlElement

	private reader: SyncWsvStreamReader
	private endKeyword: string | null
	private iterator: SyncWsvStreamLineIterator
	
	readonly emptyNodesBefore: SmlEmptyNode[] = []
	
	constructor(filePath: string, endKeyword: string | null = "End") {
		this.reader = new SyncWsvStreamReader(filePath)
		this.encoding = this.reader.encoding
		this.endKeyword = endKeyword
		
		this.iterator = new SyncWsvStreamLineIterator(this.reader, endKeyword)
		
		this.root = SmlParser.readRootElement(this.iterator, this.emptyNodesBefore)
	}
	
	readNode(): SmlNode | null {
		return SmlParser.readNode(this.iterator, this.root)
	}

	close() {
		this.reader.close()
	}
}

// ----------------------------------------------------------------------

abstract class SmlFileAppend {
	static removeEnd(filePath: string, encoding: ReliableTxtEncoding): string | null {
		let endKeyword: string | null
		let iterator: ReverseLineIterator = new ReverseLineIterator(filePath, encoding)
		while (true) {
			let lineStr: string = iterator.getLine()
			let line: WsvLine = WsvLine.parse(lineStr)
			if (line.hasValues) {
				if (line.values.length > 1) {
					throw new SmlParserError(-1, "Invalid end line")
				}
				endKeyword = line.values[0]
				break
			}
		}
		let remainingLength: number = iterator.getPosition() + 1
		iterator.close()
		fs.truncateSync(filePath, remainingLength)
		return endKeyword
	}
}

// ----------------------------------------------------------------------

export class SyncSmlStreamWriter {
	private writer: SyncReliableTxtStreamWriter
	private endKeyword: string | null = "End"
	private defaultIndentation: string | null
	private preserveWhitespacesAndComment: boolean
	
	get encoding(): ReliableTxtEncoding {
		return this.writer.encoding
	}

	constructor(templateDocument: SmlDocument, filePath: string, encoding: ReliableTxtEncoding = ReliableTxtEncoding.Utf8, preserveWhitespacesAndComment: boolean = true, append: boolean = false) {
		if (append) {
			if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0) {
				append = false
			}
		}
		this.writer = new SyncReliableTxtStreamWriter(filePath, encoding, append)
		
		this.preserveWhitespacesAndComment = preserveWhitespacesAndComment
		this.endKeyword = templateDocument.endKeyword
		this.defaultIndentation = templateDocument.defaultIndentation
		if (append) {
			this.endKeyword = SmlFileAppend.removeEnd(filePath, this.writer.encoding)
		} else {
			let rootElementName: string = templateDocument.root.name
			this.writer.writeLine(WsvSerializer.serializeValue(rootElementName))
		}
	}
	
	writeNode(node: SmlNode) {
		let lines: string[] = []
		node.serialize(lines, 1, this.defaultIndentation, this.endKeyword, this.preserveWhitespacesAndComment)
		this.writer.writeLines(lines)
	}

	close() {
		if (this.writer.isClosed) { return }
		this.writer.writeLine(WsvSerializer.serializeValue(this.endKeyword))
		this.writer.close()
	}
}