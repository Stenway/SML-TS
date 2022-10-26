import { ReliableTxtEncoding } from "@stenway/reliabletxt";
import { WsvDocument, WsvLine } from "@stenway/wsv";
export declare abstract class SmlNode {
    protected _whitespaces: (string | null)[] | null;
    protected _comment: string | null;
    get whitespaces(): (string | null)[] | null;
    set whitespaces(values: (string | null)[] | null);
    get comment(): string | null;
    set comment(value: string | null);
    get hasComment(): boolean;
    isElement(): boolean;
    isAttribute(): boolean;
    abstract serialize(lines: string[], level: number, defaultIndentation: string | null, endKeyword: string | null, preserveWhitespaceAndComment: boolean): void;
    minify(): void;
    static internalSetWhitespacesAndComment(node: SmlNode, whitespaces: (string | null)[] | null, comment: string | null): void;
}
export declare class SmlEmptyNode extends SmlNode {
    constructor(whitespaces?: (string | null)[] | null, comment?: string | null);
    toString(): string;
    serialize(lines: string[], level: number, defaultIndentation: string | null, endKeyword: string | null, preserveWhitespaceAndComment: boolean): void;
}
export declare abstract class SmlNamedNode extends SmlNode {
    name: string;
    constructor(name: string);
    hasName(name: string): boolean;
    isElementWithName(name: string): boolean;
    isAttributeWithName(name: string): boolean;
}
export declare class SmlAttribute extends SmlNamedNode {
    private _values;
    get values(): (string | null)[];
    set values(array: (string | null)[]);
    get valueCount(): number;
    constructor(name: string, values: (string | null)[]);
    toString(preserveWhitespaceAndComment?: boolean): string;
    serialize(lines: string[], level: number, defaultIndentation: string | null, endKeyword: string | null, preserveWhitespaceAndComment: boolean): void;
    assureName(name: string): SmlAttribute;
    assureValueCount(count: number): SmlAttribute;
    assureValueCountMinMax(min: number | null, max: number | null): SmlAttribute;
    getNullableString(index?: number): string | null;
    getString(index?: number): string;
    getNullableStringArray(startIndex?: number): (string | null)[];
    getStringArray(startIndex?: number): string[];
    getBool(index?: number): boolean;
    getInt(index?: number): number;
    getFloat(index?: number): number;
    getEnum(enumValues: string[], index?: number): number;
    asNullableString(): string | null;
    asString(): string;
    asNullableStringArray(min?: number | null, max?: number | null): (string | null)[];
    asStringArray(min?: number | null, max?: number | null): string[];
    asIntArray(min?: number | null, max?: number | null): number[];
    asFloatArray(min?: number | null, max?: number | null): number[];
    asBool(): boolean;
    asFloat(): number;
    asInt(): number;
    asDateTime(): Date;
    asEnum(enumValues: string[]): number;
}
export declare class SmlElement extends SmlNamedNode {
    nodes: SmlNode[];
    private _endWhitespaces;
    private _endComment;
    get endWhitespaces(): (string | null)[] | null;
    set endWhitespaces(values: (string | null)[] | null);
    get endComment(): string | null;
    set endComment(value: string | null);
    get hasEndComment(): boolean;
    constructor(name: string);
    addNode(node: SmlNode): void;
    addAttribute(name: string, values: (string | null)[]): SmlAttribute;
    addElement(name: string): SmlElement;
    addEmptyNode(): SmlEmptyNode;
    hasNamedNodes(name?: string): boolean;
    namedNodes(name?: string): SmlNamedNode[];
    hasNamedNode(name: string): boolean;
    namedNode(name: string): SmlNamedNode;
    namedNodeOrNull(name: string): SmlNamedNode | null;
    hasElements(name?: string): boolean;
    elements(name?: string): SmlElement[];
    hasElement(name: string): boolean;
    element(name: string): SmlElement;
    elementOrNull(name: string): SmlElement | null;
    hasAttributes(name?: string): boolean;
    attributes(name?: string): SmlAttribute[];
    hasAttribute(name: string): boolean;
    attribute(name: string): SmlAttribute;
    attributeOrNull(name: string): SmlAttribute | null;
    toString(preserveWhitespaceAndComment?: boolean): string;
    serialize(lines: string[], level: number, defaultIndentation: string | null, endKeyword: string | null, preserveWhitespaceAndComment: boolean): void;
    toMinifiedString(): string;
    minify(): void;
    alignAttributes(whitespaceBetween?: string, maxColumns?: number | null, rightAligned?: boolean[] | null): void;
    assureName(name: string): SmlElement;
    assureElementNames(names: string[]): void;
    assureAttributeNames(names: string[]): void;
    assureNoElements(): void;
    assureElementCount(count: number): void;
    assureNoAttributes(): void;
    optionalAttribute(attributeName: string): SmlAttribute | null;
    requiredAttribute(attributeName: string): SmlAttribute;
    oneOrMoreAttributes(attributeName: string): SmlAttribute[];
    optionalElement(elementName: string): SmlElement | null;
    requiredElement(elementName: string): SmlElement;
    oneOrMoreElements(elementName: string): SmlElement[];
    assureChoice(elementNames: string[] | null, attributeNames: string[] | null, optional?: boolean): void;
    static internalSetEndWhitespacesAndComment(element: SmlElement, endWhitespaces: (string | null)[] | null, endComment: string | null): void;
}
export declare class SmlDocument {
    root: SmlElement;
    endKeyword: string | null;
    encoding: ReliableTxtEncoding;
    private _defaultIndentation;
    emptyNodesBefore: SmlEmptyNode[];
    emptyNodesAfter: SmlEmptyNode[];
    get defaultIndentation(): string | null;
    set defaultIndentation(value: string | null);
    constructor(root: SmlElement, endKeyword?: string | null, encoding?: ReliableTxtEncoding);
    minify(): void;
    toString(preserveWhitespaceAndComment?: boolean): string;
    toMinifiedString(): string;
    getBytes(preserveWhitespacesAndComments?: boolean): Uint8Array;
    static parse(content: string, preserveWhitespaceAndComments?: boolean): SmlDocument;
}
export declare abstract class SmlStringUtil {
    static equalsIgnoreCase(str1: string, str2: string): boolean;
}
export declare abstract class SmlSerializer {
    static serializeDocument(document: SmlDocument, preserveWhitespaceAndComment: boolean): string;
    static serializeElementMinified(element: SmlElement): string;
    static serializeEmptyNode(emptyNode: SmlEmptyNode): string;
    static serializeElement(element: SmlElement, preserveWhitespaceAndComment: boolean): string;
    static serializeAttribute(attribute: SmlAttribute, preserveWhitespaceAndComment: boolean): string;
    private static serialzeEmptyNodes;
    static getWhitespaces(whitespaces: (string | null)[] | null, level: number, defaultIndentation: string | null): (string | null)[] | null;
    static serializeValuesWhitespacesAndComment(values: (string | null)[], whitespaces: (string | null)[] | null, comment: string | null, lines: string[], level: number, defaultIndentation: string | null): void;
}
export declare class SmlParserError extends Error {
    readonly lineIndex: number;
    constructor(lineIndex: number, message: string);
}
export interface WsvLineIterator {
    hasLine(): boolean;
    isEmptyLine(): boolean;
    getLine(): WsvLine;
    getLineAsArray(): (string | null)[];
    getEndKeyword(): string | null;
    getLineIndex(): number;
}
export declare class WsvDocumentLineIterator implements WsvLineIterator {
    private wsvDocument;
    private endKeyword;
    private index;
    constructor(wsvDocument: WsvDocument, endKeyword: string | null);
    getEndKeyword(): string | null;
    hasLine(): boolean;
    isEmptyLine(): boolean;
    getLineAsArray(): (string | null)[];
    getLine(): WsvLine;
    toString(): string;
    getLineIndex(): number;
}
export declare class WsvJaggedArrayLineIterator implements WsvLineIterator {
    private lines;
    private endKeyword;
    private index;
    constructor(lines: (string | null)[][], endKeyword: string | null);
    getEndKeyword(): string | null;
    hasLine(): boolean;
    isEmptyLine(): boolean;
    getLine(): WsvLine;
    getLineAsArray(): (string | null)[];
    toString(): string;
    getLineIndex(): number;
}
export declare abstract class SmlParser {
    private static readonly onlyOneRootElementAllowed;
    private static readonly rootElementExpected;
    private static readonly invalidRootElementStart;
    private static readonly nullValueAsElementNameIsNotAllowed;
    private static readonly nullValueAsAttributeNameIsNotAllowed;
    private static readonly endKeywordCouldNotBeDetected;
    static parseDocument(content: string): SmlDocument;
    private static equalIgnoreCase;
    static readRootElement(iterator: WsvLineIterator, emptyNodesBefore: SmlEmptyNode[]): SmlElement;
    static readNode(iterator: WsvLineIterator, parentElement: SmlElement): SmlNode | null;
    private static readElementContent;
    private static readEmptyNodes;
    private static readEmptyNode;
    private static determineEndKeyword;
    private static getError;
    private static getLastLineException;
    static parseDocumentNonPreserving(content: string): SmlDocument;
    static parseJaggedArray(wsvLines: (string | null)[][]): SmlDocument;
    private static parseDocumentNonPreservingInternal;
    private static skipEmptyLines;
    private static readNodeNonPreserving;
    private static readElementContentNonPreserving;
    private static determineEndKeywordFromJaggedArray;
}
