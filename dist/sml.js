"use strict";
/* (C) Stefan John / Stenway / SimpleML.com / 2022 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmlParser = exports.WsvJaggedArrayLineIterator = exports.WsvDocumentLineIterator = exports.SmlParserError = exports.SmlSerializer = exports.SmlStringUtil = exports.SmlDocument = exports.SmlElement = exports.SmlAttribute = exports.SmlNamedNode = exports.SmlEmptyNode = exports.SmlNode = void 0;
const reliabletxt_1 = require("@stenway/reliabletxt");
const wsv_1 = require("@stenway/wsv");
// ----------------------------------------------------------------------
class SmlNode {
    constructor() {
        this._whitespaces = null;
        this._comment = null;
    }
    get whitespaces() {
        if (this._whitespaces === null) {
            return null;
        }
        return [...this._whitespaces];
    }
    set whitespaces(values) {
        wsv_1.WsvStringUtil.validateWhitespaceStrings(values);
        if (values !== null) {
            this._whitespaces = [...values];
        }
        else {
            this._whitespaces = null;
        }
    }
    get comment() {
        return this._comment;
    }
    set comment(value) {
        wsv_1.WsvStringUtil.validateComment(value);
        this._comment = value;
    }
    get hasComment() {
        return this._comment !== null;
    }
    isElement() {
        return this instanceof SmlElement;
    }
    isAttribute() {
        return this instanceof SmlAttribute;
    }
    minify() {
        this._whitespaces = null;
        this._comment = null;
    }
    static internalSetWhitespacesAndComment(node, whitespaces, comment) {
        node._whitespaces = whitespaces;
        node._comment = comment;
    }
}
exports.SmlNode = SmlNode;
// ----------------------------------------------------------------------
class SmlEmptyNode extends SmlNode {
    constructor(whitespaces = null, comment = null) {
        super();
        this.whitespaces = whitespaces;
        this.comment = comment;
    }
    toString() {
        return SmlSerializer.serializeEmptyNode(this);
    }
    serialize(lines, level, defaultIndentation, endKeyword, preserveWhitespaceAndComment) {
        if (!preserveWhitespaceAndComment) {
            return;
        }
        SmlSerializer.serializeValuesWhitespacesAndComment([], this._whitespaces, this._comment, lines, level, defaultIndentation);
    }
}
exports.SmlEmptyNode = SmlEmptyNode;
// ----------------------------------------------------------------------
class SmlNamedNode extends SmlNode {
    constructor(name) {
        super();
        this.name = name;
    }
    hasName(name) {
        return SmlStringUtil.equalsIgnoreCase(this.name, name);
    }
    isElementWithName(name) {
        if (!(this instanceof SmlElement))
            return false;
        return this.hasName(name);
    }
    isAttributeWithName(name) {
        if (!(this instanceof SmlAttribute))
            return false;
        return this.hasName(name);
    }
}
exports.SmlNamedNode = SmlNamedNode;
// ----------------------------------------------------------------------
class SmlAttribute extends SmlNamedNode {
    constructor(name, values) {
        super(name);
        if (values.length === 0) {
            throw new TypeError(`Attribute "${name}" must contain at least one value`);
        }
        this._values = [...values];
    }
    get values() {
        return [...this._values];
    }
    set values(array) {
        if (array.length === 0) {
            throw new TypeError(`Attribute "${this.name}" must contain at least one value`);
        }
        this._values = [...array];
    }
    get valueCount() {
        return this._values.length;
    }
    toString(preserveWhitespaceAndComment = true) {
        return SmlSerializer.serializeAttribute(this, preserveWhitespaceAndComment);
    }
    serialize(lines, level, defaultIndentation, endKeyword, preserveWhitespaceAndComment) {
        let combined = [this.name, ...this.values];
        if (preserveWhitespaceAndComment) {
            SmlSerializer.serializeValuesWhitespacesAndComment(combined, this._whitespaces, this._comment, lines, level, defaultIndentation);
        }
        else {
            SmlSerializer.serializeValuesWhitespacesAndComment(combined, null, null, lines, level, defaultIndentation);
        }
    }
    assureName(name) {
        if (!this.hasName(name)) {
            throw new Error(`Attribute with name "${name}" expected but has name "${this.name}"`);
        }
        return this;
    }
    assureValueCount(count) {
        if (this._values.length !== count) {
            throw new Error(`Attribute "${this.name}" must have a value count of ${count} but has ${this._values.length}`);
        }
        return this;
    }
    assureValueCountMinMax(min, max) {
        if (min !== null && this._values.length < min) {
            throw new Error(`Attribute "${this.name}" must have a minimum value count of ${min} but has ${this._values.length}`);
        }
        if (max !== null && this._values.length > max) {
            throw new Error(`Attribute "${this.name}" must have a maximum value count of ${min} but has ${this._values.length}`);
        }
        return this;
    }
    getNullableString(index = 0) {
        if (index >= this._values.length) {
            throw new Error(`Index of ${index} for attribute "${this.name}" exceeds maximum index of ${this._values.length - 1}`);
        }
        let value = this._values[index];
        return value;
    }
    getString(index = 0) {
        let value = this.getNullableString(index);
        if (value === null) {
            throw new Error(`Value of attribute "${this.name}" at index ${index} is null`);
        }
        return value;
    }
    getNullableStringArray(startIndex = 0) {
        if (startIndex > this._values.length) {
            throw new Error(`Index of ${startIndex} for attribute "${this.name}" exceeds maximum index of ${this._values.length - 1}`);
        }
        return this._values.slice(startIndex);
    }
    getStringArray(startIndex = 0) {
        let array = this.getNullableStringArray(startIndex);
        if (array.indexOf(null) >= 0) {
            throw new Error(`Attribute "${this.name}" has a null value`);
        }
        return array;
    }
    getBool(index = 0) {
        let value = this.getNullableString(index);
        if (value === null) {
            throw new Error(`Value of attribute "${this.name}" at index ${index} is null`);
        }
        value = value.toLowerCase();
        if (value === "true") {
            return true;
        }
        else if (value === "false") {
            return false;
        }
        throw new Error(`Value of attribute "${this.name}" at index ${index} is not a bool`);
    }
    getInt(index = 0) {
        let value = this.getNullableString(index);
        if (value === null) {
            throw new Error(`Value of attribute "${this.name}" at index ${index} is null`);
        }
        if (value.match(/^[-+]?[0-9]+$/)) {
            return parseInt(value);
        }
        throw new Error(`Value of attribute "${this.name}" at index ${index} is not an integer`);
    }
    getFloat(index = 0) {
        let value = this.getNullableString(index);
        if (value === null) {
            throw new Error(`Value of attribute "${this.name}" at index ${index} is null`);
        }
        if (value.match(/^[-+]?[0-9]+(\.[0-9]+([eE][-+]?[0-9]+)?)?$/)) {
            return parseFloat(value);
        }
        throw new Error(`Value of attribute "${this.name}" at index ${index} is not a float`);
    }
    getEnum(enumValues, index = 0) {
        let value = this.getString(index);
        for (let i = 0; i < enumValues.length; i++) {
            let enumValue = enumValues[i];
            if (SmlStringUtil.equalsIgnoreCase(value, enumValue)) {
                return i;
            }
        }
        throw new Error(`Value "${value}" of attribute "${this.name}" at index ${index} is not a valid enum value`);
    }
    asNullableString() {
        return this.assureValueCount(1).getNullableString();
    }
    asString() {
        return this.assureValueCount(1).getString();
    }
    asNullableStringArray(min = null, max = null) {
        this.assureValueCountMinMax(min, max);
        return this.values;
    }
    asStringArray(min = null, max = null) {
        this.assureValueCountMinMax(min, max);
        return this.getStringArray();
    }
    asIntArray(min = null, max = null) {
        this.assureValueCountMinMax(min, max);
        let values = [];
        for (let i = 0; i < this._values.length; i++) {
            values.push(this.getInt(i));
        }
        return values;
    }
    asFloatArray(min = null, max = null) {
        this.assureValueCountMinMax(min, max);
        let values = [];
        for (let i = 0; i < this._values.length; i++) {
            values.push(this.getFloat(i));
        }
        return values;
    }
    asBool() {
        return this.assureValueCount(1).getBool();
    }
    asFloat() {
        return this.assureValueCount(1).getFloat();
    }
    asInt() {
        return this.assureValueCount(1).getInt();
    }
    asDateTime() {
        this.assureValueCountMinMax(2, 3);
        let dateStr = this.getString(0);
        let timeStr = this.getString(1);
        let zoneStr = "";
        if (this._values.length > 2) {
            zoneStr = this.getString(2);
        }
        let dateTimeStr = `${dateStr}T${timeStr}${zoneStr}`;
        return new Date(dateTimeStr);
    }
    asEnum(enumValues) {
        return this.assureValueCount(1).getEnum(enumValues);
    }
}
exports.SmlAttribute = SmlAttribute;
// ----------------------------------------------------------------------
class SmlElement extends SmlNamedNode {
    constructor(name) {
        super(name);
        this.nodes = [];
        this._endWhitespaces = null;
        this._endComment = null;
    }
    get endWhitespaces() {
        if (this._endWhitespaces === null) {
            return null;
        }
        return [...this._endWhitespaces];
    }
    set endWhitespaces(values) {
        wsv_1.WsvStringUtil.validateWhitespaceStrings(values);
        if (values !== null) {
            this._endWhitespaces = [...values];
        }
        else {
            this._endWhitespaces = null;
        }
    }
    get endComment() {
        return this._endComment;
    }
    set endComment(value) {
        wsv_1.WsvStringUtil.validateComment(value);
        this._endComment = value;
    }
    get hasEndComment() {
        return this._endComment !== null;
    }
    addNode(node) {
        this.nodes.push(node);
    }
    addAttribute(name, values) {
        let attribute = new SmlAttribute(name, values);
        this.addNode(attribute);
        return attribute;
    }
    addElement(name) {
        let element = new SmlElement(name);
        this.addNode(element);
        return element;
    }
    addEmptyNode() {
        let emptyNode = new SmlEmptyNode();
        this.addNode(emptyNode);
        return emptyNode;
    }
    hasNamedNodes(name) {
        if (name === undefined) {
            return this.nodes.some(node => node instanceof SmlNamedNode);
        }
        else {
            return this.nodes.
                filter(node => node instanceof SmlNamedNode).
                map(node => node).
                some(namedNode => namedNode.hasName(name));
        }
    }
    namedNodes(name) {
        if (name === undefined) {
            return this.nodes.filter(node => node instanceof SmlNamedNode);
        }
        else {
            return this.nodes.
                filter(node => node instanceof SmlNamedNode).
                map(node => node).
                filter(namedNode => namedNode.hasName(name));
        }
    }
    hasNamedNode(name) {
        return this.nodes.
            filter(node => node instanceof SmlNamedNode).
            map(node => node).
            some(namedNode => namedNode.hasName(name));
    }
    namedNode(name) {
        let result = this.nodes.
            filter(node => node instanceof SmlNamedNode).
            map(node => node).
            find(namedNode => namedNode.hasName(name));
        if (result === undefined) {
            throw new Error(`Element "${this.name}" does not contain a "${name}" named node`);
        }
        return result;
    }
    namedNodeOrNull(name) {
        let result = this.nodes.
            filter(node => node instanceof SmlNamedNode).
            map(node => node).
            find(namedNode => namedNode.hasName(name));
        if (result === undefined) {
            return null;
        }
        return result;
    }
    hasElements(name) {
        if (name === undefined) {
            return this.nodes.some(node => node instanceof SmlElement);
        }
        else {
            return this.nodes.
                filter(node => node instanceof SmlElement).
                map(node => node).
                some(element => element.hasName(name));
        }
    }
    elements(name) {
        if (name === undefined) {
            return this.nodes.filter(node => node instanceof SmlElement);
        }
        else {
            return this.nodes.
                filter(node => node instanceof SmlElement).
                map(node => node).
                filter(element => element.hasName(name));
        }
    }
    hasElement(name) {
        return this.nodes.
            filter(node => node instanceof SmlElement).
            map(node => node).
            some(element => element.hasName(name));
    }
    element(name) {
        let result = this.nodes.
            filter(node => node instanceof SmlElement).
            map(node => node).
            find(element => element.hasName(name));
        if (result === undefined) {
            throw new Error(`Element "${this.name}" does not contain a "${name}" element`);
        }
        return result;
    }
    elementOrNull(name) {
        let result = this.nodes.
            filter(node => node instanceof SmlElement).
            map(node => node).
            find(element => element.hasName(name));
        if (result === undefined) {
            return null;
        }
        return result;
    }
    hasAttributes(name) {
        if (name === undefined) {
            return this.nodes.some(node => node instanceof SmlAttribute);
        }
        else {
            return this.nodes.
                filter(node => node instanceof SmlAttribute).
                map(node => node).
                some(attribute => attribute.hasName(name));
        }
    }
    attributes(name) {
        if (name === undefined) {
            return this.nodes.filter(node => node instanceof SmlAttribute);
        }
        else {
            return this.nodes.
                filter(node => node instanceof SmlAttribute).
                map(node => node).
                filter(attribute => attribute.hasName(name));
        }
    }
    hasAttribute(name) {
        return this.nodes.
            filter(node => node instanceof SmlAttribute).
            map(node => node).
            some(attribute => attribute.hasName(name));
    }
    attribute(name) {
        let result = this.nodes.
            filter(node => node instanceof SmlAttribute).
            map(node => node).
            find(attribute => attribute.hasName(name));
        if (result === undefined) {
            throw new Error(`Element "${this.name}" does not contain a "${name}" attribute`);
        }
        return result;
    }
    attributeOrNull(name) {
        let result = this.nodes.
            filter(node => node instanceof SmlAttribute).
            map(node => node).
            find(attribute => attribute.hasName(name));
        if (result === undefined) {
            return null;
        }
        return result;
    }
    toString(preserveWhitespaceAndComment = true) {
        return SmlSerializer.serializeElement(this, preserveWhitespaceAndComment);
    }
    serialize(lines, level, defaultIndentation, endKeyword, preserveWhitespaceAndComment) {
        if (endKeyword !== null && this.hasName(endKeyword)) {
            throw new Error(`Element name matches the end keyword "${endKeyword}"`);
        }
        if (preserveWhitespaceAndComment) {
            SmlSerializer.serializeValuesWhitespacesAndComment([this.name], this._whitespaces, this._comment, lines, level, defaultIndentation);
            let childLevel = level + 1;
            for (let child of this.nodes) {
                child.serialize(lines, childLevel, defaultIndentation, endKeyword, preserveWhitespaceAndComment);
            }
            SmlSerializer.serializeValuesWhitespacesAndComment([endKeyword], this._endWhitespaces, this._endComment, lines, level, defaultIndentation);
        }
        else {
            SmlSerializer.serializeValuesWhitespacesAndComment([this.name], null, null, lines, level, defaultIndentation);
            let childLevel = level + 1;
            for (let child of this.nodes) {
                child.serialize(lines, childLevel, defaultIndentation, endKeyword, preserveWhitespaceAndComment);
            }
            SmlSerializer.serializeValuesWhitespacesAndComment([endKeyword], null, null, lines, level, defaultIndentation);
        }
    }
    toMinifiedString() {
        return SmlSerializer.serializeElementMinified(this);
    }
    minify() {
        super.minify();
        this.nodes = this.nodes.filter(node => !(node instanceof SmlEmptyNode));
        this._endWhitespaces = null;
        this._endComment = null;
        for (let node of this.nodes) {
            node.minify();
        }
    }
    alignAttributes(whitespaceBetween = " ", maxColumns = null, rightAligned = null) {
        var _a;
        let attributes = this.attributes();
        let whitespacesArray = [];
        let valuesArray = [];
        let numColumns = 0;
        wsv_1.WsvStringUtil.validateWhitespaceString(whitespaceBetween, false);
        for (let attribute of attributes) {
            whitespacesArray.push([null]);
            let values = [attribute.name, ...attribute.values];
            numColumns = Math.max(numColumns, values.length);
            valuesArray.push(values);
        }
        if (maxColumns !== null) {
            numColumns = maxColumns;
        }
        for (let c = 0; c < numColumns; c++) {
            let maxLength = 0;
            for (let i = 0; i < attributes.length; i++) {
                let values = valuesArray[i];
                if (c >= values.length) {
                    continue;
                }
                let value = values[c];
                let serializedValue = wsv_1.WsvSerializer.serializeValue(value);
                maxLength = Math.max(maxLength, serializedValue.length);
            }
            for (let i = 0; i < attributes.length; i++) {
                let values = valuesArray[i];
                if (c >= values.length) {
                    continue;
                }
                let value = valuesArray[i][c];
                let serializedValue = wsv_1.WsvSerializer.serializeValue(value);
                let lengthDif = maxLength - serializedValue.length;
                let whitespace = " ".repeat(lengthDif) + whitespaceBetween;
                if (rightAligned !== null && rightAligned[c]) {
                    let last = (_a = whitespacesArray[i][whitespacesArray[i].length - 1]) !== null && _a !== void 0 ? _a : "";
                    whitespacesArray[i][whitespacesArray[i].length - 1] = last + whitespace;
                    if (c >= values.length - 1) {
                        continue;
                    }
                    whitespacesArray[i].push(whitespaceBetween);
                }
                else {
                    if (c >= values.length - 1) {
                        continue;
                    }
                    whitespacesArray[i].push(whitespace);
                }
            }
        }
        for (let i = 0; i < attributes.length; i++) {
            attributes[i].whitespaces = whitespacesArray[i];
        }
    }
    assureName(name) {
        if (!this.hasName(name)) {
            throw new Error(`Element with name "${name}" expected but found "${this.name}"`);
        }
        return this;
    }
    assureElementNames(names) {
        elementLoop: for (let element of this.elements()) {
            for (let name of names) {
                if (element.hasName(name)) {
                    continue elementLoop;
                }
            }
            throw new Error(`Not allowed element with name "${element.name}" found in element "${this.name}"`);
        }
    }
    assureAttributeNames(names) {
        attributeLoop: for (let attribute of this.attributes()) {
            for (let name of names) {
                if (attribute.hasName(name)) {
                    continue attributeLoop;
                }
            }
            throw new Error(`Not allowed attribute with name "${attribute.name}" found in element "${this.name}"`);
        }
    }
    assureNoElements() {
        if (this.elements().length > 0) {
            throw new Error(`Element with name "${this.name}" cannot have elements`);
        }
    }
    assureElementCount(count) {
        if (this.elements().length !== count) {
            throw new Error(`Element with name "${this.name}" must have ${count} element(s)`);
        }
    }
    assureNoAttributes() {
        if (this.attributes().length > 0) {
            throw new Error(`Element with name "${this.name}" cannot have attributes`);
        }
    }
    optionalAttribute(attributeName) {
        let attributes = this.attributes(attributeName);
        if (attributes.length > 1) {
            throw new Error(`Element "${this.name}" must contain one or no attribute "${attributeName}" but contains ${attributes.length}`);
        }
        if (attributes.length === 0) {
            return null;
        }
        else {
            return attributes[0];
        }
    }
    requiredAttribute(attributeName) {
        let attributes = this.attributes(attributeName);
        if (attributes.length !== 1) {
            throw new Error(`Element "${this.name}" must contain one attribute "${attributeName}" but contains ${attributes.length}`);
        }
        return attributes[0];
    }
    oneOrMoreAttributes(attributeName) {
        let attributes = this.attributes(attributeName);
        if (attributes.length < 1) {
            throw new Error(`Element "${this.name}" must contain at least one attribute "${attributeName}" but contains 0`);
        }
        return attributes;
    }
    optionalElement(elementName) {
        let elements = this.elements(elementName);
        if (elements.length > 1) {
            throw new Error(`Element "${this.name}" must contain one or no element "${elementName}" but contains ${elements.length}`);
        }
        if (elements.length === 0) {
            return null;
        }
        else {
            return elements[0];
        }
    }
    requiredElement(elementName) {
        let elements = this.elements(elementName);
        if (elements.length !== 1) {
            throw new Error(`Element "${this.name}" must contain one element "${elementName}" but contains ${elements.length}`);
        }
        return elements[0];
    }
    oneOrMoreElements(elementName) {
        let elements = this.elements(elementName);
        if (elements.length < 1) {
            throw new Error(`Element "${this.name}" must contain at least one element "${elementName}" but contains 0`);
        }
        return elements;
    }
    assureChoice(elementNames, attributeNames, optional = false) {
        let foundNodeName = null;
        let wasAttribute = false;
        if (elementNames !== null) {
            for (let elementName of elementNames) {
                if (this.hasElement(elementName)) {
                    if (foundNodeName !== null) {
                        throw new Error(`Element "${this.name}" cannot contain an element "${foundNodeName}" and an element "${elementName}"`);
                    }
                    foundNodeName = elementName;
                }
            }
        }
        if (attributeNames !== null) {
            for (let attributeName of attributeNames) {
                if (this.hasAttribute(attributeName)) {
                    if (foundNodeName !== null) {
                        throw new Error(`Element "${this.name}" cannot contain an ${wasAttribute ? "attribute" : "element"} "${foundNodeName}" and an attribute "${attributeName}"`);
                    }
                    foundNodeName = attributeName;
                    wasAttribute = true;
                }
            }
        }
        if (foundNodeName === null && !optional) {
            let elementStr = null;
            let attributeStr = null;
            throw new Error(`Element "${this.name}" must contain ${elementStr}${(elementStr !== null && attributeStr !== null) ? " or " : ""}${attributeStr}`);
        }
    }
    static internalSetEndWhitespacesAndComment(element, endWhitespaces, endComment) {
        element._endWhitespaces = endWhitespaces;
        element._endComment = endComment;
    }
}
exports.SmlElement = SmlElement;
// ----------------------------------------------------------------------
class SmlDocument {
    constructor(root, endKeyword = "End", encoding = reliabletxt_1.ReliableTxtEncoding.Utf8) {
        this._defaultIndentation = null;
        this.emptyNodesBefore = [];
        this.emptyNodesAfter = [];
        this.root = root;
        this.endKeyword = endKeyword;
        this.encoding = encoding;
    }
    get defaultIndentation() {
        return this._defaultIndentation;
    }
    set defaultIndentation(value) {
        if (value !== null && value.length !== 0) {
            wsv_1.WsvStringUtil.validateWhitespaceString(value, true);
        }
        this._defaultIndentation = value;
    }
    minify() {
        this.emptyNodesBefore = [];
        this.emptyNodesAfter = [];
        this.defaultIndentation = "";
        this.endKeyword = null;
        this.root.minify();
    }
    toString(preserveWhitespaceAndComment = true) {
        return SmlSerializer.serializeDocument(this, preserveWhitespaceAndComment);
    }
    toMinifiedString() {
        return this.root.toMinifiedString();
    }
    getBytes(preserveWhitespacesAndComments = true) {
        let str = this.toString(preserveWhitespacesAndComments);
        return new reliabletxt_1.ReliableTxtDocument(str, this.encoding).getBytes();
    }
    static parse(content, preserveWhitespaceAndComments = true) {
        if (preserveWhitespaceAndComments) {
            return SmlParser.parseDocument(content);
        }
        else {
            return SmlParser.parseDocumentNonPreserving(content);
        }
    }
}
exports.SmlDocument = SmlDocument;
// ----------------------------------------------------------------------
class SmlStringUtil {
    static equalsIgnoreCase(str1, str2) {
        return str1.localeCompare(str2, undefined, { sensitivity: 'accent' }) === 0;
    }
}
exports.SmlStringUtil = SmlStringUtil;
// ----------------------------------------------------------------------
class SmlSerializer {
    static serializeDocument(document, preserveWhitespaceAndComment) {
        let lines = [];
        SmlSerializer.serialzeEmptyNodes(document.emptyNodesBefore, lines);
        document.root.serialize(lines, 0, document.defaultIndentation, document.endKeyword, preserveWhitespaceAndComment);
        SmlSerializer.serialzeEmptyNodes(document.emptyNodesAfter, lines);
        return reliabletxt_1.ReliableTxtLines.join(lines);
    }
    static serializeElementMinified(element) {
        let lines = [];
        element.serialize(lines, 0, "", null, false);
        return reliabletxt_1.ReliableTxtLines.join(lines);
    }
    static serializeEmptyNode(emptyNode) {
        let lines = [];
        emptyNode.serialize(lines, 0, null, null, true);
        return lines[0];
    }
    static serializeElement(element, preserveWhitespaceAndComment) {
        let lines = [];
        element.serialize(lines, 0, null, "End", preserveWhitespaceAndComment);
        return reliabletxt_1.ReliableTxtLines.join(lines);
    }
    static serializeAttribute(attribute, preserveWhitespaceAndComment) {
        let lines = [];
        attribute.serialize(lines, 0, null, null, preserveWhitespaceAndComment);
        return lines[0];
    }
    static serialzeEmptyNodes(emptyNodes, lines) {
        for (let emptyNode of emptyNodes) {
            emptyNode.serialize(lines, 0, null, null, true);
        }
    }
    static getWhitespaces(whitespaces, level, defaultIndentation) {
        if (whitespaces !== null && whitespaces.length > 0) {
            if (whitespaces[0] === null) {
                if (defaultIndentation === null) {
                    defaultIndentation = "\t";
                }
                let indentStr = defaultIndentation.repeat(level);
                return [indentStr, ...whitespaces.slice(1)];
            }
            return whitespaces;
        }
        if (defaultIndentation === null) {
            defaultIndentation = "\t";
        }
        let indentStr = defaultIndentation.repeat(level);
        return [indentStr];
    }
    static serializeValuesWhitespacesAndComment(values, whitespaces, comment, lines, level, defaultIndentation) {
        whitespaces = SmlSerializer.getWhitespaces(whitespaces, level, defaultIndentation);
        lines.push(wsv_1.WsvSerializer.serializeValuesWhitespacesAndComment(values, whitespaces, comment));
    }
}
exports.SmlSerializer = SmlSerializer;
// ----------------------------------------------------------------------
class SmlParserError extends Error {
    constructor(lineIndex, message) {
        super(`${message} (${lineIndex + 1})`);
        this.lineIndex = lineIndex;
    }
}
exports.SmlParserError = SmlParserError;
// ----------------------------------------------------------------------
class WsvDocumentLineIterator {
    constructor(wsvDocument, endKeyword) {
        this.index = 0;
        this.wsvDocument = wsvDocument;
        this.endKeyword = endKeyword;
    }
    getEndKeyword() {
        return this.endKeyword;
    }
    hasLine() {
        return this.index < this.wsvDocument.lines.length;
    }
    isEmptyLine() {
        return this.hasLine() && !this.wsvDocument.lines[this.index].hasValues;
    }
    getLineAsArray() {
        return this.getLine().values;
    }
    getLine() {
        let line = this.wsvDocument.lines[this.index];
        this.index++;
        return line;
    }
    toString() {
        let result = "(" + this.index + "): ";
        if (this.hasLine()) {
            result += this.wsvDocument.lines[this.index].toString();
        }
        return result;
    }
    getLineIndex() {
        return this.index;
    }
}
exports.WsvDocumentLineIterator = WsvDocumentLineIterator;
// ----------------------------------------------------------------------
class WsvJaggedArrayLineIterator {
    constructor(lines, endKeyword) {
        this.index = 0;
        this.lines = lines;
        this.endKeyword = endKeyword;
    }
    getEndKeyword() {
        return this.endKeyword;
    }
    hasLine() {
        return this.index < this.lines.length;
    }
    isEmptyLine() {
        return this.hasLine() && (this.lines[this.index].length === 0);
    }
    getLine() {
        return new wsv_1.WsvLine(this.getLineAsArray());
    }
    getLineAsArray() {
        let line = this.lines[this.index];
        this.index++;
        return line;
    }
    toString() {
        let result = "(" + this.index + "): ";
        if (this.hasLine()) {
            let line = this.lines[this.index];
            if (line !== null) {
                result += wsv_1.WsvSerializer.serializeValues(line);
            }
        }
        return result;
    }
    getLineIndex() {
        return this.index;
    }
}
exports.WsvJaggedArrayLineIterator = WsvJaggedArrayLineIterator;
// ----------------------------------------------------------------------
class SmlParser {
    static parseDocument(content) {
        let wsvDocument = wsv_1.WsvDocument.parse(content);
        let endKeyword = SmlParser.determineEndKeyword(wsvDocument);
        let iterator = new WsvDocumentLineIterator(wsvDocument, endKeyword);
        let emptyNodesBefore = [];
        let rootElement = SmlParser.readRootElement(iterator, emptyNodesBefore);
        SmlParser.readElementContent(iterator, rootElement);
        let emptyNodesAfter = [];
        SmlParser.readEmptyNodes(emptyNodesAfter, iterator);
        if (iterator.hasLine()) {
            throw SmlParser.getError(iterator, SmlParser.onlyOneRootElementAllowed);
        }
        let document = new SmlDocument(rootElement);
        document.endKeyword = endKeyword;
        document.emptyNodesBefore = emptyNodesBefore;
        return document;
    }
    static equalIgnoreCase(name1, name2) {
        if (name1 === null) {
            return name1 === name2;
        }
        if (name2 === null) {
            return false;
        }
        return SmlStringUtil.equalsIgnoreCase(name1, name2);
    }
    static readRootElement(iterator, emptyNodesBefore) {
        SmlParser.readEmptyNodes(emptyNodesBefore, iterator);
        if (!iterator.hasLine()) {
            throw SmlParser.getError(iterator, SmlParser.rootElementExpected);
        }
        let rootStartLine = iterator.getLine();
        if (!rootStartLine.hasValues || rootStartLine.values.length !== 1 || SmlParser.equalIgnoreCase(iterator.getEndKeyword(), rootStartLine.values[0])) {
            throw SmlParser.getLastLineException(iterator, SmlParser.invalidRootElementStart);
        }
        let rootElementName = rootStartLine.values[0];
        if (rootElementName === null) {
            throw SmlParser.getLastLineException(iterator, SmlParser.nullValueAsElementNameIsNotAllowed);
        }
        let rootElement = new SmlElement(rootElementName);
        SmlNode.internalSetWhitespacesAndComment(rootElement, wsv_1.WsvLine.internalWhitespaces(rootStartLine), rootStartLine.comment);
        return rootElement;
    }
    static readNode(iterator, parentElement) {
        let line = iterator.getLine();
        if (line.hasValues) {
            let name = line.values[0];
            if (line.values.length === 1) {
                if (SmlParser.equalIgnoreCase(iterator.getEndKeyword(), name)) {
                    SmlElement.internalSetEndWhitespacesAndComment(parentElement, wsv_1.WsvLine.internalWhitespaces(line), line.comment);
                    return null;
                }
                if (name === null) {
                    throw SmlParser.getLastLineException(iterator, SmlParser.nullValueAsElementNameIsNotAllowed);
                }
                let childElement = new SmlElement(name);
                SmlNode.internalSetWhitespacesAndComment(childElement, wsv_1.WsvLine.internalWhitespaces(line), line.comment);
                SmlParser.readElementContent(iterator, childElement);
                return childElement;
            }
            else {
                if (name === null) {
                    throw SmlParser.getLastLineException(iterator, SmlParser.nullValueAsAttributeNameIsNotAllowed);
                }
                let values = line.values.slice(1);
                let childAttribute = new SmlAttribute(name, values);
                SmlNode.internalSetWhitespacesAndComment(childAttribute, wsv_1.WsvLine.internalWhitespaces(line), line.comment);
                return childAttribute;
            }
        }
        else {
            let emptyNode = new SmlEmptyNode();
            SmlNode.internalSetWhitespacesAndComment(emptyNode, wsv_1.WsvLine.internalWhitespaces(line), line.comment);
            return emptyNode;
        }
    }
    static readElementContent(iterator, element) {
        while (true) {
            if (!iterator.hasLine()) {
                throw SmlParser.getLastLineException(iterator, `Element "${element.name}" not closed`);
            }
            let node = SmlParser.readNode(iterator, element);
            if (node === null) {
                break;
            }
            element.addNode(node);
        }
    }
    static readEmptyNodes(nodes, iterator) {
        while (iterator.isEmptyLine()) {
            let emptyNode = SmlParser.readEmptyNode(iterator);
            nodes.push(emptyNode);
        }
    }
    static readEmptyNode(iterator) {
        let line = iterator.getLine();
        let emptyNode = new SmlEmptyNode();
        SmlNode.internalSetWhitespacesAndComment(emptyNode, wsv_1.WsvLine.internalWhitespaces(line), line.comment);
        return emptyNode;
    }
    static determineEndKeyword(wsvDocument) {
        for (let i = wsvDocument.lines.length - 1; i >= 0; i--) {
            let values = wsvDocument.lines[i].values;
            if (values != null) {
                if (values.length === 1) {
                    return values[0];
                }
                else if (values.length > 1) {
                    break;
                }
            }
        }
        throw new SmlParserError(wsvDocument.lines.length - 1, SmlParser.endKeywordCouldNotBeDetected);
    }
    static getError(iterator, message) {
        return new SmlParserError(iterator.getLineIndex(), message);
    }
    static getLastLineException(iterator, message) {
        return new SmlParserError(iterator.getLineIndex() - 1, message);
    }
    static parseDocumentNonPreserving(content) {
        let wsvLines = wsv_1.WsvDocument.parseAsJaggedArray(content);
        return SmlParser.parseJaggedArray(wsvLines);
    }
    static parseJaggedArray(wsvLines) {
        let endKeyword = SmlParser.determineEndKeywordFromJaggedArray(wsvLines);
        let iterator = new WsvJaggedArrayLineIterator(wsvLines, endKeyword);
        let rootElement = SmlParser.parseDocumentNonPreservingInternal(iterator);
        let document = new SmlDocument(rootElement);
        document.endKeyword = endKeyword;
        return document;
    }
    static parseDocumentNonPreservingInternal(iterator) {
        SmlParser.skipEmptyLines(iterator);
        if (!iterator.hasLine()) {
            throw SmlParser.getError(iterator, SmlParser.rootElementExpected);
        }
        let node = SmlParser.readNodeNonPreserving(iterator);
        if (!(node instanceof SmlElement)) {
            throw SmlParser.getLastLineException(iterator, SmlParser.invalidRootElementStart);
        }
        SmlParser.skipEmptyLines(iterator);
        if (iterator.hasLine()) {
            throw SmlParser.getError(iterator, SmlParser.onlyOneRootElementAllowed);
        }
        return node;
    }
    static skipEmptyLines(iterator) {
        while (iterator.isEmptyLine()) {
            iterator.getLineAsArray();
        }
    }
    static readNodeNonPreserving(iterator) {
        let line = iterator.getLineAsArray();
        let name = line[0];
        if (line.length === 1) {
            if (SmlParser.equalIgnoreCase(iterator.getEndKeyword(), name)) {
                return null;
            }
            if (name === null) {
                throw SmlParser.getLastLineException(iterator, SmlParser.nullValueAsElementNameIsNotAllowed);
            }
            let element = new SmlElement(name);
            SmlParser.readElementContentNonPreserving(iterator, element);
            return element;
        }
        else {
            if (name === null) {
                throw SmlParser.getLastLineException(iterator, SmlParser.nullValueAsAttributeNameIsNotAllowed);
            }
            let values = line.slice(1);
            let attribute = new SmlAttribute(name, values);
            return attribute;
        }
    }
    static readElementContentNonPreserving(iterator, element) {
        while (true) {
            SmlParser.skipEmptyLines(iterator);
            if (!iterator.hasLine()) {
                throw SmlParser.getLastLineException(iterator, `Element "${element.name}" not closed`);
            }
            let node = SmlParser.readNodeNonPreserving(iterator);
            if (node === null) {
                break;
            }
            element.addNode(node);
        }
    }
    static determineEndKeywordFromJaggedArray(lines) {
        for (let i = lines.length - 1; i >= 0; i--) {
            let values = lines[i];
            if (values.length === 1) {
                return values[0];
            }
            else if (values.length > 1) {
                break;
            }
        }
        throw new SmlParserError(lines.length - 1, SmlParser.endKeywordCouldNotBeDetected);
    }
}
exports.SmlParser = SmlParser;
SmlParser.onlyOneRootElementAllowed = "Only one root element allowed";
SmlParser.rootElementExpected = "Root element expected";
SmlParser.invalidRootElementStart = "Invalid root element start";
SmlParser.nullValueAsElementNameIsNotAllowed = "Null value as element name is not allowed";
SmlParser.nullValueAsAttributeNameIsNotAllowed = "Null value as attribute name is not allowed";
SmlParser.endKeywordCouldNotBeDetected = "End keyword could not be detected";
