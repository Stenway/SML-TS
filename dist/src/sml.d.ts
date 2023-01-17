import { ReliableTxtEncoding } from "@stenway/reliabletxt";
import { WsvDocument, WsvLine } from "@stenway/wsv";
export declare abstract class SmlNode {
    protected _whitespaces: (string | null)[] | null;
    protected _comment: string | null;
    get whitespaces(): (string | null)[] | null;
    set whitespaces(values: (string | null)[] | null);
    get hasWhitespaces(): boolean;
    get comment(): string | null;
    set comment(value: string | null);
    get hasComment(): boolean;
    isElement(): boolean;
    isAttribute(): boolean;
    isEmptyNode(): boolean;
    isNamedNode(): boolean;
    isElementWithName(name: string): boolean;
    isAttributeWithName(name: string): boolean;
    abstract internalSerialize(lines: string[], level: number, defaultIndentation: string | null, endKeyword: string | null, preserveWhitespaceAndComment: boolean): void;
    minify(): void;
    static internalSetWhitespacesAndComment(node: SmlNode, whitespaces: (string | null)[] | null, comment: string | null): void;
}
export declare class SmlEmptyNode extends SmlNode {
    constructor(whitespaces?: (string | null)[] | null, comment?: string | null);
    toString(): string;
    internalSerialize(lines: string[], level: number, defaultIndentation: string | null, endKeyword: string | null, preserveWhitespaceAndComment: boolean): void;
}
export declare abstract class SmlNamedNode extends SmlNode {
    name: string;
    constructor(name: string);
    hasName(name: string): boolean;
}
export declare abstract class SmlValueUtil {
    static getBoolString(value: boolean): string;
    static getIntString(value: number): string;
    static getFloatString(value: number): string;
    static getEnumString(value: number, enumValues: string[]): string;
    static getBytesString(bytes: Uint8Array): string;
    static getBoolOrNull(str: string): boolean | null;
    static getIntOrNull(str: string): number | null;
    static getFloatOrNull(str: string): number | null;
    static getEnumOrNull(str: string, enumValues: string[]): number | null;
    static getBytesOrNull(str: string): Uint8Array | null;
}
export declare class SmlAttribute extends SmlNamedNode {
    private _values;
    get values(): (string | null)[];
    set values(array: (string | null)[]);
    get valueCount(): number;
    constructor(name: string, values?: (string | null)[]);
    toString(preserveWhitespaceAndComment?: boolean): string;
    internalSerialize(lines: string[], level: number, defaultIndentation: string | null, endKeyword: string | null, preserveWhitespaceAndComment: boolean): void;
    assureName(name: string): SmlAttribute;
    assureValueCount(count: number): SmlAttribute;
    assureValueCountMinMax(min: number | null, max?: number | null): SmlAttribute;
    getNullableString(index?: number): string | null;
    getString(index?: number): string;
    getNullableStringArray(startIndex?: number): (string | null)[];
    getStringArray(startIndex?: number): string[];
    getBool(index?: number): boolean;
    getInt(index?: number): number;
    getFloat(index?: number): number;
    getEnum(enumValues: string[], index?: number): number;
    getBytes(index?: number): Uint8Array;
    asNullableString(): string | null;
    asString(): string;
    asNullableStringArray(min?: number | null, max?: number | null): (string | null)[];
    asStringArray(min?: number | null, max?: number | null): string[];
    asBool(): boolean;
    asInt(): number;
    asFloat(): number;
    asEnum(enumValues: string[]): number;
    asBytes(): Uint8Array;
    asIntArray(min?: number | null, max?: number | null): number[];
    asFloatArray(min?: number | null, max?: number | null): number[];
    isNullValue(): boolean;
    setNullableString(value: string | null, index?: number | null): SmlAttribute;
    setString(value: string, index?: number | null): SmlAttribute;
    setBool(value: boolean, index?: number | null): SmlAttribute;
    setInt(value: number, index?: number | null): SmlAttribute;
    setFloat(value: number, index?: number | null): SmlAttribute;
    setEnum(value: number, enumValues: string[], index?: number | null): SmlAttribute;
    setBytes(bytes: Uint8Array, index?: number | null): SmlAttribute;
    setIntArray(values: number[]): SmlAttribute;
    setFloatArray(values: number[]): SmlAttribute;
    setNull(index?: number | null): SmlAttribute;
    static parse(content: string, preserveWhitespaceAndComments?: boolean): SmlAttribute;
}
export declare class SmlElement extends SmlNamedNode {
    nodes: SmlNode[];
    private _endWhitespaces;
    private _endComment;
    get endWhitespaces(): (string | null)[] | null;
    set endWhitespaces(values: (string | null)[] | null);
    get hasEndWhitespaces(): boolean;
    get endComment(): string | null;
    set endComment(value: string | null);
    get hasEndComment(): boolean;
    constructor(name: string);
    addNode(node: SmlNode): void;
    addAttribute(name: string, values?: (string | null)[]): SmlAttribute;
    addElement(name: string): SmlElement;
    addEmptyNode(whitespaces?: (string | null)[] | null, comment?: string | null): SmlEmptyNode;
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
    hasEmptyNodes(): boolean;
    emptyNodes(): SmlEmptyNode[];
    isEmpty(): boolean;
    toString(preserveWhitespaceAndComment?: boolean): string;
    internalSerialize(lines: string[], level: number, defaultIndentation: string | null, endKeyword: string | null, preserveWhitespaceAndComment: boolean): void;
    toMinifiedString(): string;
    minify(): void;
    alignAttributes(whitespaceBetween?: string, maxColumns?: number | null, rightAligned?: boolean[] | null): void;
    assureName(name: string): SmlElement;
    assureElementNames(names: string[]): SmlElement;
    assureAttributeNames(names: string[]): SmlElement;
    assureNoElements(): SmlElement;
    assureElementCount(count: number, name?: string): SmlElement;
    assureElementCountMinMax(min: number | null, max?: number | null, name?: string): SmlElement;
    assureNoAttributes(): SmlElement;
    assureAttributeCount(count: number, name?: string): SmlElement;
    assureAttributeCountMinMax(min: number | null, max?: number | null, name?: string): SmlElement;
    optionalElement(elementName: string): SmlElement | null;
    requiredElement(elementName: string): SmlElement;
    oneOrMoreElements(elementName: string): SmlElement[];
    optionalAttribute(attributeName: string): SmlAttribute | null;
    requiredAttribute(attributeName: string): SmlAttribute;
    oneOrMoreAttributes(attributeName: string): SmlAttribute[];
    assureEmpty(): SmlElement;
    assureChoice(elementNames: string[] | null, attributeNames: string[] | null, canBeEmpty?: boolean): SmlElement;
    static parse(content: string, preserveWhitespaceAndComments?: boolean): SmlElement;
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
    toBase64String(preserveWhitespacesAndComments?: boolean): string;
    toJaggedArray(): (string | null)[][];
    static parse(content: string, preserveWhitespaceAndComments?: boolean, encoding?: ReliableTxtEncoding): SmlDocument;
    static fromBytes(bytes: Uint8Array, preserveWhitespaceAndComments?: boolean): SmlDocument;
    static fromJaggedArray(jaggedArray: (string | null)[][], encoding?: ReliableTxtEncoding): SmlDocument;
    static fromBase64String(base64Str: string): SmlDocument;
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
    static internalSerializeValuesWhitespacesAndComment(values: (string | null)[], whitespaces: (string | null)[] | null, comment: string | null, lines: string[], level: number, defaultIndentation: string | null): void;
}
export declare class SmlParserError extends Error {
    readonly lineIndex: number;
    constructor(lineIndex: number, message: string);
}
export interface SyncWsvLineIterator {
    hasLine(): boolean;
    isEmptyLine(): boolean;
    getLine(): WsvLine;
    getLineAsArray(): (string | null)[];
    getEndKeyword(): string | null;
    getLineIndex(): number;
}
export interface WsvLineIterator {
    hasLine(): Promise<boolean>;
    isEmptyLine(): Promise<boolean>;
    getLine(): Promise<WsvLine>;
    getLineAsArray(): Promise<(string | null)[]>;
    getEndKeyword(): string | null;
    getLineIndex(): number;
}
export declare class SyncWsvDocumentLineIterator implements SyncWsvLineIterator {
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
export declare class SyncWsvJaggedArrayLineIterator implements SyncWsvLineIterator {
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
    static parseAttributeSync(content: string, preserveWhitespacesAndComments: boolean): SmlAttribute;
    static parseDocumentSync(content: string, encoding?: ReliableTxtEncoding): SmlDocument;
    private static equalIgnoreCase;
    static readRootElementSync(iterator: SyncWsvLineIterator, emptyNodesBefore: SmlEmptyNode[]): SmlElement;
    static readRootElement(iterator: WsvLineIterator, emptyNodesBefore: SmlEmptyNode[]): Promise<SmlElement>;
    private static getLineWhitespaces;
    static readNodeSync(iterator: SyncWsvLineIterator, parentElement: SmlElement): SmlNode | null;
    static readNode(iterator: WsvLineIterator, parentElement: SmlElement): Promise<SmlNode | null>;
    private static readElementContentSync;
    private static readElementContent;
    private static readEmptyNodesSync;
    private static readEmptyNodes;
    private static readEmptyNodeSync;
    private static readEmptyNode;
    private static determineEndKeywordSync;
    private static getErrorSync;
    private static getError;
    private static getLastLineExceptionSync;
    private static getLastLineException;
    static parseDocumentNonPreservingSync(content: string, encoding?: ReliableTxtEncoding): SmlDocument;
    static parseJaggedArraySync(wsvLines: (string | null)[][], encoding?: ReliableTxtEncoding): SmlDocument;
    private static parseDocumentNonPreservingInternalSync;
    private static skipEmptyLinesSync;
    private static readNodeNonPreservingSync;
    private static readElementContentNonPreservingSync;
    private static determineEndKeywordFromJaggedArraySync;
}
//# sourceMappingURL=sml.d.ts.map