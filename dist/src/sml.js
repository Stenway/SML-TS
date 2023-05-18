/* (C) Stefan John / Stenway / SimpleML.com / 2023 */
import { Base64String, ReliableTxtDocument, ReliableTxtEncoding, ReliableTxtLines, Utf16String } from "@stenway/reliabletxt";
import { WsvStringUtil, WsvDocument, WsvLine, WsvSerializer, WsvValue } from "@stenway/wsv";
// ----------------------------------------------------------------------
export class SmlNode {
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
        WsvStringUtil.validateWhitespaceStrings(values);
        if (values !== null) {
            this._whitespaces = [...values];
        }
        else {
            this._whitespaces = null;
        }
    }
    get hasWhitespaces() {
        return this._whitespaces !== null;
    }
    get comment() {
        return this._comment;
    }
    set comment(value) {
        WsvStringUtil.validateComment(value);
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
    isEmptyNode() {
        return this instanceof SmlEmptyNode;
    }
    isNamedNode() {
        return this instanceof SmlNamedNode;
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
    minify() {
        this._whitespaces = null;
        this._comment = null;
    }
    static internalSetWhitespacesAndComment(node, whitespaces, comment) {
        node._whitespaces = whitespaces;
        node._comment = comment;
    }
}
// ----------------------------------------------------------------------
export class SmlEmptyNode extends SmlNode {
    constructor(whitespaces = null, comment = null) {
        super();
        this.whitespaces = whitespaces;
        this.comment = comment;
    }
    toString() {
        return SmlSerializer.serializeEmptyNode(this);
    }
    internalSerialize(lines, level, defaultIndentation, endKeyword, preserveWhitespaceAndComment) {
        if (!preserveWhitespaceAndComment) {
            return;
        }
        SmlSerializer.internalSerializeValuesWhitespacesAndComment([], this._whitespaces, this._comment, lines, level, defaultIndentation);
    }
}
// ----------------------------------------------------------------------
export class SmlNamedNode extends SmlNode {
    constructor(name) {
        super();
        this.name = name;
    }
    hasName(name) {
        return SmlStringUtil.equalsIgnoreCase(this.name, name);
    }
}
// ----------------------------------------------------------------------
export class SmlValueUtil {
    static getBoolString(value) {
        return value === true ? "true" : "false";
    }
    static getIntString(value) {
        if (!Number.isInteger(value)) {
            throw new RangeError(`Value "${value}" is not a valid integer`);
        }
        return value.toString();
    }
    static getFloatString(value) {
        if (!Number.isFinite(value)) {
            throw new RangeError(`Value "${value}" is not a valid float`);
        }
        return value.toString();
    }
    static getEnumString(value, enumValues) {
        if (!Number.isInteger(value) || !(value >= 0 && value < enumValues.length)) {
            throw new RangeError(`Enum value "${value}" is out of range`);
        }
        return enumValues[value];
    }
    static getBytesString(bytes) {
        return Base64String.fromBytes(bytes);
    }
    static getBoolOrNull(str) {
        str = str.toLowerCase();
        if (str === "true") {
            return true;
        }
        else if (str === "false") {
            return false;
        }
        else {
            return null;
        }
    }
    static getIntOrNull(str) {
        if (str.match(/^[-+]?[0-9]+$/)) {
            return parseInt(str);
        }
        else {
            return null;
        }
    }
    static getFloatOrNull(str) {
        if (str.match(/^[-+]?[0-9]+(\.[0-9]+([eE][-+]?[0-9]+)?)?$/)) {
            return parseFloat(str);
        }
        else {
            return null;
        }
    }
    static getEnumOrNull(str, enumValues) {
        for (let i = 0; i < enumValues.length; i++) {
            const enumValue = enumValues[i];
            if (SmlStringUtil.equalsIgnoreCase(str, enumValue)) {
                return i;
            }
        }
        return null;
    }
    static getBytesOrNull(str) {
        try {
            return Base64String.toBytes(str);
        }
        catch (error) {
            return null;
        }
    }
}
// ----------------------------------------------------------------------
export class SmlAttribute extends SmlNamedNode {
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
    constructor(name, values = [null]) {
        super(name);
        if (values.length === 0) {
            throw new TypeError(`Attribute "${name}" must contain at least one value`);
        }
        this._values = [...values];
    }
    toString(preserveWhitespaceAndComment = true) {
        return SmlSerializer.serializeAttribute(this, preserveWhitespaceAndComment);
    }
    internalSerialize(lines, level, defaultIndentation, endKeyword, preserveWhitespaceAndComment) {
        const combined = [this.name, ...this.values];
        if (preserveWhitespaceAndComment) {
            SmlSerializer.internalSerializeValuesWhitespacesAndComment(combined, this._whitespaces, this._comment, lines, level, defaultIndentation);
        }
        else {
            SmlSerializer.internalSerializeValuesWhitespacesAndComment(combined, null, null, lines, level, defaultIndentation);
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
    assureValueCountMinMax(min, max = null) {
        if (min !== null) {
            if (min < 1) {
                throw new RangeError(`Min value must be greater equal one`);
            }
            if (this._values.length < min) {
                throw new Error(`Attribute "${this.name}" must have a minimum value count of ${min} but has ${this._values.length}`);
            }
        }
        if (max !== null) {
            if (max < 1) {
                throw new RangeError(`Max value must be greater equal one`);
            }
            if (this._values.length > max) {
                throw new Error(`Attribute "${this.name}" must have a maximum value count of ${min} but has ${this._values.length}`);
            }
        }
        return this;
    }
    getNullableString(index = 0) {
        if (!(index >= 0 && index < this._values.length)) {
            throw new Error(`Index of ${index} for attribute "${this.name}" is out of range`);
        }
        const value = this._values[index];
        return value;
    }
    getString(index = 0) {
        const value = this.getNullableString(index);
        if (value === null) {
            throw new Error(`Value of attribute "${this.name}" at index ${index} is null`);
        }
        return value;
    }
    getNullableStringArray(startIndex = 0) {
        if (!(startIndex >= 0 && startIndex < this._values.length)) {
            throw new Error(`Index of ${startIndex} for attribute "${this.name}" is out of range`);
        }
        return this._values.slice(startIndex);
    }
    getStringArray(startIndex = 0) {
        const array = this.getNullableStringArray(startIndex);
        if (array.indexOf(null) >= 0) {
            throw new Error(`Attribute "${this.name}" has a null value`);
        }
        return array;
    }
    getBool(index = 0) {
        const strValue = this.getString(index);
        const value = SmlValueUtil.getBoolOrNull(strValue);
        if (value === null) {
            throw new Error(`Value of attribute "${this.name}" at index ${index} is not a bool`);
        }
        return value;
    }
    getInt(index = 0) {
        const strValue = this.getString(index);
        const value = SmlValueUtil.getIntOrNull(strValue);
        if (value === null) {
            throw new Error(`Value of attribute "${this.name}" at index ${index} is not an integer`);
        }
        return value;
    }
    getFloat(index = 0) {
        const strValue = this.getString(index);
        const value = SmlValueUtil.getFloatOrNull(strValue);
        if (value === null) {
            throw new Error(`Value of attribute "${this.name}" at index ${index} is not a float`);
        }
        return value;
    }
    getEnum(enumValues, index = 0) {
        const strValue = this.getString(index);
        const value = SmlValueUtil.getEnumOrNull(strValue, enumValues);
        if (value === null) {
            throw new Error(`Value of attribute "${this.name}" at index ${index} is not a valid enum value`);
        }
        return value;
    }
    getBytes(index = 0) {
        const strValue = this.getString(index);
        const bytes = SmlValueUtil.getBytesOrNull(strValue);
        if (bytes === null) {
            throw new Error(`Value of attribute "${this.name}" at index ${index} is not a Reliable Base64 string`);
        }
        return bytes;
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
    asBool() {
        return this.assureValueCount(1).getBool();
    }
    asInt() {
        return this.assureValueCount(1).getInt();
    }
    asFloat() {
        return this.assureValueCount(1).getFloat();
    }
    asEnum(enumValues) {
        return this.assureValueCount(1).getEnum(enumValues);
    }
    asBytes() {
        return this.assureValueCount(1).getBytes();
    }
    asIntArray(min = null, max = null) {
        this.assureValueCountMinMax(min, max);
        return this._values.map((strValue, index) => {
            if (strValue === null) {
                throw new Error(`Value of attribute "${this.name}" at index ${index} is null`);
            }
            const value = SmlValueUtil.getIntOrNull(strValue);
            if (value === null) {
                throw new Error(`Value "${strValue}" of attribute "${this.name}" at index ${index} is not an integer`);
            }
            return value;
        });
    }
    asFloatArray(min = null, max = null) {
        this.assureValueCountMinMax(min, max);
        return this._values.map((strValue, index) => {
            if (strValue === null) {
                throw new Error(`Value of attribute "${this.name}" at index ${index} is null`);
            }
            const value = SmlValueUtil.getFloatOrNull(strValue);
            if (value === null) {
                throw new Error(`Value "${strValue}" of attribute "${this.name}" at index ${index} is not a float`);
            }
            return value;
        });
    }
    isNullValue() {
        return this._values.length === 1 && this._values[0] === null;
    }
    setNullableString(value, index = null) {
        if (index === null) {
            this._values = [value];
        }
        else {
            if (!(index >= 0 && index < this._values.length)) {
                throw new RangeError(`Index ${index} is out of range`);
            }
            this._values[index] = value;
        }
        return this;
    }
    setString(value, index = null) {
        this.setNullableString(value, index);
        return this;
    }
    setBool(value, index = null) {
        this.setNullableString(SmlValueUtil.getBoolString(value), index);
        return this;
    }
    setInt(value, index = null) {
        this.setNullableString(SmlValueUtil.getIntString(value), index);
        return this;
    }
    setFloat(value, index = null) {
        this.setNullableString(SmlValueUtil.getFloatString(value), index);
        return this;
    }
    setEnum(value, enumValues, index = null) {
        this.setNullableString(SmlValueUtil.getEnumString(value, enumValues), index);
        return this;
    }
    setBytes(bytes, index = null) {
        this.setNullableString(SmlValueUtil.getBytesString(bytes), index);
        return this;
    }
    setIntArray(values) {
        if (values.length === 0) {
            throw new TypeError(`Int array must contain at least one value`);
        }
        this._values = values.map((value) => {
            return SmlValueUtil.getIntString(value);
        });
        return this;
    }
    setFloatArray(values) {
        if (values.length === 0) {
            throw new TypeError(`Float array must contain at least one value`);
        }
        this._values = values.map((value) => {
            return SmlValueUtil.getFloatString(value);
        });
        return this;
    }
    setNull(index = null) {
        this.setNullableString(null, index);
        return this;
    }
    static parse(content, preserveWhitespaceAndComments = true) {
        return SmlParser.parseAttributeSync(content, preserveWhitespaceAndComments);
    }
}
// ----------------------------------------------------------------------
export class SmlElement extends SmlNamedNode {
    get endWhitespaces() {
        if (this._endWhitespaces === null) {
            return null;
        }
        return [...this._endWhitespaces];
    }
    set endWhitespaces(values) {
        WsvStringUtil.validateWhitespaceStrings(values);
        if (values !== null) {
            this._endWhitespaces = [...values];
        }
        else {
            this._endWhitespaces = null;
        }
    }
    get hasEndWhitespaces() {
        return this._endWhitespaces !== null;
    }
    get endComment() {
        return this._endComment;
    }
    set endComment(value) {
        WsvStringUtil.validateComment(value);
        this._endComment = value;
    }
    get hasEndComment() {
        return this._endComment !== null;
    }
    constructor(name) {
        super(name);
        this.nodes = [];
        this._endWhitespaces = null;
        this._endComment = null;
    }
    addNode(node) {
        this.nodes.push(node);
    }
    addAttribute(name, values = [null]) {
        const attribute = new SmlAttribute(name, values);
        this.addNode(attribute);
        return attribute;
    }
    addElement(name) {
        const element = new SmlElement(name);
        this.addNode(element);
        return element;
    }
    addEmptyNode(whitespaces = null, comment = null) {
        const emptyNode = new SmlEmptyNode(whitespaces, comment);
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
        const result = this.nodes.
            filter(node => node instanceof SmlNamedNode).
            map(node => node).
            find(namedNode => namedNode.hasName(name));
        if (result === undefined) {
            throw new Error(`Element "${this.name}" does not contain a "${name}" named node`);
        }
        return result;
    }
    namedNodeOrNull(name) {
        const result = this.nodes.
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
        const result = this.nodes.
            filter(node => node instanceof SmlElement).
            map(node => node).
            find(element => element.hasName(name));
        if (result === undefined) {
            throw new Error(`Element "${this.name}" does not contain a "${name}" element`);
        }
        return result;
    }
    elementOrNull(name) {
        const result = this.nodes.
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
        const result = this.nodes.
            filter(node => node instanceof SmlAttribute).
            map(node => node).
            find(attribute => attribute.hasName(name));
        if (result === undefined) {
            throw new Error(`Element "${this.name}" does not contain a "${name}" attribute`);
        }
        return result;
    }
    attributeOrNull(name) {
        const result = this.nodes.
            filter(node => node instanceof SmlAttribute).
            map(node => node).
            find(attribute => attribute.hasName(name));
        if (result === undefined) {
            return null;
        }
        return result;
    }
    hasEmptyNodes() {
        return this.nodes.
            some(node => node instanceof SmlEmptyNode);
    }
    emptyNodes() {
        return this.nodes.
            filter(node => node instanceof SmlEmptyNode).
            map(node => node);
    }
    isEmpty() {
        return !this.hasNamedNodes();
    }
    toString(preserveWhitespaceAndComment = true) {
        return SmlSerializer.serializeElement(this, preserveWhitespaceAndComment);
    }
    internalSerialize(lines, level, defaultIndentation, endKeyword, preserveWhitespaceAndComment) {
        if (endKeyword !== null && this.hasName(endKeyword)) {
            throw new Error(`Element name matches the end keyword "${endKeyword}"`);
        }
        if (preserveWhitespaceAndComment) {
            SmlSerializer.internalSerializeValuesWhitespacesAndComment([this.name], this._whitespaces, this._comment, lines, level, defaultIndentation);
            const childLevel = level + 1;
            for (const child of this.nodes) {
                child.internalSerialize(lines, childLevel, defaultIndentation, endKeyword, preserveWhitespaceAndComment);
            }
            SmlSerializer.internalSerializeValuesWhitespacesAndComment([endKeyword], this._endWhitespaces, this._endComment, lines, level, defaultIndentation);
        }
        else {
            SmlSerializer.internalSerializeValuesWhitespacesAndComment([this.name], null, null, lines, level, defaultIndentation);
            const childLevel = level + 1;
            for (const child of this.nodes) {
                child.internalSerialize(lines, childLevel, defaultIndentation, endKeyword, preserveWhitespaceAndComment);
            }
            SmlSerializer.internalSerializeValuesWhitespacesAndComment([endKeyword], null, null, lines, level, defaultIndentation);
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
        for (const node of this.nodes) {
            node.minify();
        }
    }
    alignAttributes(whitespaceBetween = " ", maxColumns = null, rightAligned = null) {
        var _a;
        const attributes = this.attributes();
        const whitespacesArray = [];
        const valuesArray = [];
        let numColumns = 0;
        WsvStringUtil.validateWhitespaceString(whitespaceBetween, false);
        for (const attribute of attributes) {
            whitespacesArray.push([null]);
            const values = [attribute.name, ...attribute.values];
            numColumns = Math.max(numColumns, values.length);
            valuesArray.push(values);
        }
        if (maxColumns !== null) {
            numColumns = maxColumns;
        }
        for (let curColumnIndex = 0; curColumnIndex < numColumns; curColumnIndex++) {
            let maxLength = 0;
            for (let i = 0; i < attributes.length; i++) {
                const values = valuesArray[i];
                if (curColumnIndex >= values.length) {
                    continue;
                }
                const value = values[curColumnIndex];
                const serializedValue = WsvValue.serialize(value);
                maxLength = Math.max(maxLength, Utf16String.getCodePointCount(serializedValue));
            }
            for (let i = 0; i < attributes.length; i++) {
                const values = valuesArray[i];
                if (curColumnIndex >= values.length) {
                    continue;
                }
                const value = valuesArray[i][curColumnIndex];
                const serializedValue = WsvValue.serialize(value);
                const lengthDif = maxLength - Utf16String.getCodePointCount(serializedValue);
                const fillingWhitespace = " ".repeat(lengthDif);
                if (rightAligned !== null && rightAligned[curColumnIndex]) {
                    const last = (_a = whitespacesArray[i][whitespacesArray[i].length - 1]) !== null && _a !== void 0 ? _a : "";
                    whitespacesArray[i][whitespacesArray[i].length - 1] = last + fillingWhitespace;
                    if (curColumnIndex >= values.length - 1) {
                        continue;
                    }
                    whitespacesArray[i].push(whitespaceBetween);
                }
                else {
                    if (curColumnIndex >= values.length - 1) {
                        continue;
                    }
                    whitespacesArray[i].push(fillingWhitespace + whitespaceBetween);
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
        elementLoop: for (const element of this.elements()) {
            for (const name of names) {
                if (element.hasName(name)) {
                    continue elementLoop;
                }
            }
            throw new Error(`Not allowed element with name "${element.name}" found in element "${this.name}"`);
        }
        return this;
    }
    assureAttributeNames(names) {
        attributeLoop: for (const attribute of this.attributes()) {
            for (const name of names) {
                if (attribute.hasName(name)) {
                    continue attributeLoop;
                }
            }
            throw new Error(`Not allowed attribute with name "${attribute.name}" found in element "${this.name}"`);
        }
        return this;
    }
    assureNoElements() {
        if (this.elements().length > 0) {
            throw new Error(`Element with name "${this.name}" cannot have elements`);
        }
        return this;
    }
    assureElementCount(count, name) {
        if (name === undefined) {
            if (this.elements().length !== count) {
                throw new Error(`Element with name "${this.name}" must have ${count} element(s)`);
            }
        }
        else {
            if (this.elements(name).length !== count) {
                throw new Error(`Element with name "${this.name}" must have ${count} element(s) with name "${name}"`);
            }
        }
        return this;
    }
    assureElementCountMinMax(min, max = null, name) {
        if (name === undefined) {
            const elementCount = this.elements().length;
            if (min !== null) {
                if (min < 0) {
                    throw new RangeError(`Min value must be greater equal zero`);
                }
                if (elementCount < min) {
                    throw new Error(`Element "${this.name}" must have a minimum element count of ${min} but has ${elementCount}`);
                }
            }
            if (max !== null) {
                if (max < 0) {
                    throw new RangeError(`Max value must be greater equal zero`);
                }
                if (elementCount > max) {
                    throw new Error(`Element "${this.name}" must have a maximum element count of ${min} but has ${elementCount}`);
                }
            }
        }
        else {
            const elementCount = this.elements(name).length;
            if (min !== null) {
                if (min < 0) {
                    throw new RangeError(`Min value must be greater equal zero`);
                }
                if (elementCount < min) {
                    throw new Error(`Element "${this.name}" must have a minimum element count of ${min} with name "${name}" but has ${elementCount}`);
                }
            }
            if (max !== null) {
                if (max < 0) {
                    throw new RangeError(`Max value must be greater equal zero`);
                }
                if (elementCount > max) {
                    throw new Error(`Element "${this.name}" must have a maximum element count of ${min} with name "${name}" but has ${elementCount}`);
                }
            }
        }
        return this;
    }
    assureNoAttributes() {
        if (this.attributes().length > 0) {
            throw new Error(`Element with name "${this.name}" cannot have attributes`);
        }
        return this;
    }
    assureAttributeCount(count, name) {
        if (name === undefined) {
            if (this.attributes().length !== count) {
                throw new Error(`Element with name "${this.name}" must have ${count} attribute(s)`);
            }
        }
        else {
            if (this.attributes(name).length !== count) {
                throw new Error(`Element with name "${this.name}" must have ${count} attribute(s) with name "${name}"`);
            }
        }
        return this;
    }
    assureAttributeCountMinMax(min, max = null, name) {
        if (name === undefined) {
            const attributeCount = this.attributes().length;
            if (min !== null) {
                if (min < 0) {
                    throw new RangeError(`Min value must be greater equal zero`);
                }
                if (attributeCount < min) {
                    throw new Error(`Element "${this.name}" must have a minimum attribute count of ${min} but has ${attributeCount}`);
                }
            }
            if (max !== null) {
                if (max < 0) {
                    throw new RangeError(`Max value must be greater equal zero`);
                }
                if (attributeCount > max) {
                    throw new Error(`Element "${this.name}" must have a maximum attribute count of ${min} but has ${attributeCount}`);
                }
            }
        }
        else {
            const attributeCount = this.attributes(name).length;
            if (min !== null) {
                if (min < 0) {
                    throw new RangeError(`Min value must be greater equal zero`);
                }
                if (attributeCount < min) {
                    throw new Error(`Element "${this.name}" must have a minimum attribute count of ${min} with name "${name}" but has ${attributeCount}`);
                }
            }
            if (max !== null) {
                if (max < 0) {
                    throw new RangeError(`Max value must be greater equal zero`);
                }
                if (attributeCount > max) {
                    throw new Error(`Element "${this.name}" must have a maximum attribute count of ${min} with name "${name}" but has ${attributeCount}`);
                }
            }
        }
        return this;
    }
    optionalElement(elementName) {
        const elements = this.elements(elementName);
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
        const elements = this.elements(elementName);
        if (elements.length !== 1) {
            throw new Error(`Element "${this.name}" must contain one element "${elementName}" but contains ${elements.length}`);
        }
        return elements[0];
    }
    oneOrMoreElements(elementName) {
        const elements = this.elements(elementName);
        if (elements.length < 1) {
            throw new Error(`Element "${this.name}" must contain at least one element "${elementName}" but contains 0`);
        }
        return elements;
    }
    optionalAttribute(attributeName) {
        const attributes = this.attributes(attributeName);
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
        const attributes = this.attributes(attributeName);
        if (attributes.length !== 1) {
            throw new Error(`Element "${this.name}" must contain one attribute "${attributeName}" but contains ${attributes.length}`);
        }
        return attributes[0];
    }
    oneOrMoreAttributes(attributeName) {
        const attributes = this.attributes(attributeName);
        if (attributes.length < 1) {
            throw new Error(`Element "${this.name}" must contain at least one attribute "${attributeName}" but contains 0`);
        }
        return attributes;
    }
    assureEmpty() {
        if (!this.isEmpty()) {
            throw new Error(`Element with name "${this.name}" must be empty`);
        }
        return this;
    }
    assureChoice(elementNames, attributeNames, canBeEmpty = false) {
        const hasElementNames = elementNames !== null && elementNames.length > 0;
        const hasAttributeNames = attributeNames !== null && attributeNames.length > 0;
        if (!hasElementNames && !hasAttributeNames) {
            throw new RangeError(`No element or attribute names specified`);
        }
        let foundNodeName = null;
        let wasAttribute = false;
        if (elementNames !== null) {
            for (const elementName of elementNames) {
                if (this.hasElement(elementName)) {
                    if (foundNodeName !== null) {
                        throw new Error(`Element "${this.name}" cannot contain an element "${foundNodeName}" and an element "${elementName}"`);
                    }
                    foundNodeName = elementName;
                    this.assureElementCount(1, elementName);
                }
            }
        }
        if (attributeNames !== null) {
            for (const attributeName of attributeNames) {
                if (this.hasAttribute(attributeName)) {
                    if (foundNodeName !== null) {
                        throw new Error(`Element "${this.name}" cannot contain an ${wasAttribute ? "attribute" : "element"} "${foundNodeName}" and an attribute "${attributeName}"`);
                    }
                    foundNodeName = attributeName;
                    wasAttribute = true;
                    this.assureAttributeCount(1, attributeName);
                }
            }
        }
        if (foundNodeName === null && !canBeEmpty) {
            if (hasElementNames && !hasAttributeNames) {
                throw new Error(`Element "${this.name}" must contain one of the following elements: ${elementNames.join(", ")}`);
            }
            else if (!hasElementNames && hasAttributeNames) {
                throw new Error(`Element "${this.name}" must contain one of the following attributes: ${attributeNames.join(", ")}`);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                throw new Error(`Element "${this.name}" must contain one of the following elements: ${elementNames.join(", ")} or attributes: ${attributeNames.join(", ")}`);
            }
        }
        return this;
    }
    static parse(content, preserveWhitespaceAndComments = true) {
        // TODO optimize
        return SmlDocument.parse(content, preserveWhitespaceAndComments).root;
    }
    static internalSetEndWhitespacesAndComment(element, endWhitespaces, endComment) {
        element._endWhitespaces = endWhitespaces;
        element._endComment = endComment;
    }
}
// ----------------------------------------------------------------------
export class SmlDocument {
    get defaultIndentation() {
        return this._defaultIndentation;
    }
    set defaultIndentation(value) {
        if (value !== null && value.length !== 0) {
            WsvStringUtil.validateWhitespaceString(value, true);
        }
        this._defaultIndentation = value;
    }
    constructor(root, endKeyword = "End", encoding = ReliableTxtEncoding.Utf8) {
        this._defaultIndentation = null;
        this.emptyNodesBefore = [];
        this.emptyNodesAfter = [];
        this.root = root;
        this.endKeyword = endKeyword;
        this.encoding = encoding;
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
        const str = this.toString(preserveWhitespacesAndComments);
        return new ReliableTxtDocument(str, this.encoding).getBytes();
    }
    toBase64String(preserveWhitespacesAndComments = true) {
        const str = this.toString(preserveWhitespacesAndComments);
        return Base64String.fromText(str, this.encoding);
    }
    toJaggedArray() {
        // TODO optimize
        const content = this.toString(false);
        return WsvDocument.parseAsJaggedArray(content);
    }
    static parse(content, preserveWhitespaceAndComments = true, encoding = ReliableTxtEncoding.Utf8) {
        if (preserveWhitespaceAndComments) {
            return SmlParser.parseDocumentSync(content, encoding);
        }
        else {
            return SmlParser.parseDocumentNonPreservingSync(content, encoding);
        }
    }
    static fromBytes(bytes, preserveWhitespaceAndComments = true) {
        const txtDocument = ReliableTxtDocument.fromBytes(bytes);
        return SmlDocument.parse(txtDocument.text, preserveWhitespaceAndComments, txtDocument.encoding);
    }
    static fromJaggedArray(jaggedArray, encoding = ReliableTxtEncoding.Utf8) {
        return SmlParser.parseJaggedArraySync(jaggedArray, encoding);
    }
    static fromBase64String(base64Str) {
        const bytes = Base64String.toBytes(base64Str);
        return this.fromBytes(bytes);
    }
}
// ----------------------------------------------------------------------
export class SmlStringUtil {
    static equalsIgnoreCase(str1, str2) {
        return str1.localeCompare(str2, undefined, { sensitivity: 'accent' }) === 0;
    }
}
// ----------------------------------------------------------------------
export class SmlSerializer {
    static serializeDocument(document, preserveWhitespaceAndComment) {
        const lines = [];
        if (preserveWhitespaceAndComment) {
            SmlSerializer.serialzeEmptyNodes(document.emptyNodesBefore, lines);
        }
        document.root.internalSerialize(lines, 0, document.defaultIndentation, document.endKeyword, preserveWhitespaceAndComment);
        if (preserveWhitespaceAndComment) {
            SmlSerializer.serialzeEmptyNodes(document.emptyNodesAfter, lines);
        }
        return ReliableTxtLines.join(lines);
    }
    static serializeElementMinified(element) {
        const lines = [];
        element.internalSerialize(lines, 0, "", null, false);
        return ReliableTxtLines.join(lines);
    }
    static serializeEmptyNode(emptyNode) {
        const lines = [];
        emptyNode.internalSerialize(lines, 0, null, null, true);
        return lines[0];
    }
    static serializeElement(element, preserveWhitespaceAndComment) {
        const lines = [];
        element.internalSerialize(lines, 0, null, "End", preserveWhitespaceAndComment);
        return ReliableTxtLines.join(lines);
    }
    static serializeAttribute(attribute, preserveWhitespaceAndComment) {
        const lines = [];
        attribute.internalSerialize(lines, 0, null, null, preserveWhitespaceAndComment);
        return lines[0];
    }
    static serialzeEmptyNodes(emptyNodes, lines) {
        for (const emptyNode of emptyNodes) {
            emptyNode.internalSerialize(lines, 0, null, null, true);
        }
    }
    static getWhitespaces(whitespaces, level, defaultIndentation) {
        if (whitespaces !== null && whitespaces.length > 0) {
            if (whitespaces[0] === null) {
                if (defaultIndentation === null) {
                    defaultIndentation = "\t";
                }
                const indentStr = defaultIndentation.repeat(level);
                return [indentStr, ...whitespaces.slice(1)];
            }
            return whitespaces;
        }
        if (defaultIndentation === null) {
            defaultIndentation = "\t";
        }
        const indentStr = defaultIndentation.repeat(level);
        return [indentStr];
    }
    static internalSerializeValuesWhitespacesAndComment(values, whitespaces, comment, lines, level, defaultIndentation) {
        whitespaces = SmlSerializer.getWhitespaces(whitespaces, level, defaultIndentation);
        lines.push(WsvSerializer.internalSerializeValuesWhitespacesAndComment(values, whitespaces, comment));
    }
}
// ----------------------------------------------------------------------
export class SmlParserError extends Error {
    constructor(lineIndex, message) {
        super(`${message} (${lineIndex + 1})`);
        this.lineIndex = lineIndex;
    }
}
// ----------------------------------------------------------------------
export class SyncWsvDocumentLineIterator {
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
        const line = this.wsvDocument.lines[this.index];
        this.index++;
        return line;
    }
    toString() {
        let result = "(" + (this.index + 1) + "): ";
        if (this.hasLine()) {
            result += this.wsvDocument.lines[this.index].toString();
        }
        return result;
    }
    getLineIndex() {
        return this.index;
    }
}
// ----------------------------------------------------------------------
export class SyncWsvJaggedArrayLineIterator {
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
        return new WsvLine(this.getLineAsArray());
    }
    getLineAsArray() {
        const line = this.lines[this.index];
        this.index++;
        return line;
    }
    toString() {
        let result = "(" + (this.index + 1) + "): ";
        if (this.hasLine()) {
            const line = this.lines[this.index];
            if (line !== null) {
                result += WsvSerializer.serializeValues(line);
            }
        }
        return result;
    }
    getLineIndex() {
        return this.index;
    }
}
// ----------------------------------------------------------------------
class SmlParser {
    static parseAttributeSync(content, preserveWhitespacesAndComments) {
        const line = WsvLine.parse(content, preserveWhitespacesAndComments);
        if (line.values.length < 2) {
            throw new SmlParserError(0, "Attribute line must have at least two values");
        }
        const name = line.values[0];
        if (name === null) {
            throw new SmlParserError(0, SmlParser.nullValueAsAttributeNameIsNotAllowed);
        }
        const values = line.values.slice(1);
        const childAttribute = new SmlAttribute(name, values);
        if (preserveWhitespacesAndComments) {
            SmlNode.internalSetWhitespacesAndComment(childAttribute, this.getLineWhitespaces(line), line.comment);
        }
        return childAttribute;
    }
    static parseDocumentSync(content, encoding = ReliableTxtEncoding.Utf8) {
        const wsvDocument = WsvDocument.parse(content);
        const endKeyword = SmlParser.determineEndKeywordSync(wsvDocument);
        const iterator = new SyncWsvDocumentLineIterator(wsvDocument, endKeyword);
        const emptyNodesBefore = [];
        const rootElement = SmlParser.readRootElementSync(iterator, emptyNodesBefore);
        SmlParser.readElementContentSync(iterator, rootElement);
        const emptyNodesAfter = [];
        SmlParser.readEmptyNodesSync(emptyNodesAfter, iterator);
        if (iterator.hasLine()) {
            throw SmlParser.getErrorSync(iterator, SmlParser.onlyOneRootElementAllowed);
        }
        const document = new SmlDocument(rootElement);
        document.encoding = encoding;
        document.endKeyword = endKeyword;
        document.emptyNodesBefore = emptyNodesBefore;
        document.emptyNodesAfter = emptyNodesAfter;
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
    static readRootElementSync(iterator, emptyNodesBefore) {
        SmlParser.readEmptyNodesSync(emptyNodesBefore, iterator);
        if (!iterator.hasLine()) {
            throw SmlParser.getErrorSync(iterator, SmlParser.rootElementExpected);
        }
        const rootStartLine = iterator.getLine();
        if (!rootStartLine.hasValues || rootStartLine.values.length !== 1 || SmlParser.equalIgnoreCase(iterator.getEndKeyword(), rootStartLine.values[0])) {
            throw SmlParser.getLastLineExceptionSync(iterator, SmlParser.invalidRootElementStart);
        }
        const rootElementName = rootStartLine.values[0];
        if (rootElementName === null) {
            throw SmlParser.getLastLineExceptionSync(iterator, SmlParser.nullValueAsElementNameIsNotAllowed);
        }
        const rootElement = new SmlElement(rootElementName);
        SmlNode.internalSetWhitespacesAndComment(rootElement, this.getLineWhitespaces(rootStartLine), rootStartLine.comment);
        return rootElement;
    }
    static async readRootElement(iterator, emptyNodesBefore) {
        await SmlParser.readEmptyNodes(emptyNodesBefore, iterator);
        if (!await iterator.hasLine()) {
            throw SmlParser.getError(iterator, SmlParser.rootElementExpected);
        }
        const rootStartLine = await iterator.getLine();
        if (!rootStartLine.hasValues || rootStartLine.values.length !== 1 || SmlParser.equalIgnoreCase(iterator.getEndKeyword(), rootStartLine.values[0])) {
            throw SmlParser.getLastLineException(iterator, SmlParser.invalidRootElementStart);
        }
        const rootElementName = rootStartLine.values[0];
        if (rootElementName === null) {
            throw SmlParser.getLastLineException(iterator, SmlParser.nullValueAsElementNameIsNotAllowed);
        }
        const rootElement = new SmlElement(rootElementName);
        SmlNode.internalSetWhitespacesAndComment(rootElement, this.getLineWhitespaces(rootStartLine), rootStartLine.comment);
        return rootElement;
    }
    static getLineWhitespaces(line) {
        const lineWhitespaces = WsvLine.internalWhitespaces(line);
        if (lineWhitespaces !== null && lineWhitespaces.length > 0 && lineWhitespaces[0] === null) {
            lineWhitespaces[0] = "";
        }
        return lineWhitespaces;
    }
    static readNodeSync(iterator, parentElement) {
        const line = iterator.getLine();
        if (line.hasValues) {
            const name = line.values[0];
            if (line.values.length === 1) {
                if (SmlParser.equalIgnoreCase(iterator.getEndKeyword(), name)) {
                    SmlElement.internalSetEndWhitespacesAndComment(parentElement, this.getLineWhitespaces(line), line.comment);
                    return null;
                }
                if (name === null) {
                    throw SmlParser.getLastLineExceptionSync(iterator, SmlParser.nullValueAsElementNameIsNotAllowed);
                }
                const childElement = new SmlElement(name);
                SmlNode.internalSetWhitespacesAndComment(childElement, this.getLineWhitespaces(line), line.comment);
                SmlParser.readElementContentSync(iterator, childElement);
                return childElement;
            }
            else {
                if (name === null) {
                    throw SmlParser.getLastLineExceptionSync(iterator, SmlParser.nullValueAsAttributeNameIsNotAllowed);
                }
                const values = line.values.slice(1);
                const childAttribute = new SmlAttribute(name, values);
                SmlNode.internalSetWhitespacesAndComment(childAttribute, this.getLineWhitespaces(line), line.comment);
                return childAttribute;
            }
        }
        else {
            const emptyNode = new SmlEmptyNode();
            SmlNode.internalSetWhitespacesAndComment(emptyNode, this.getLineWhitespaces(line), line.comment);
            return emptyNode;
        }
    }
    static async readNode(iterator, parentElement) {
        const line = await iterator.getLine();
        if (line.hasValues) {
            const name = line.values[0];
            if (line.values.length === 1) {
                if (SmlParser.equalIgnoreCase(iterator.getEndKeyword(), name)) {
                    SmlElement.internalSetEndWhitespacesAndComment(parentElement, this.getLineWhitespaces(line), line.comment);
                    return null;
                }
                if (name === null) {
                    throw SmlParser.getLastLineException(iterator, SmlParser.nullValueAsElementNameIsNotAllowed);
                }
                const childElement = new SmlElement(name);
                SmlNode.internalSetWhitespacesAndComment(childElement, this.getLineWhitespaces(line), line.comment);
                await SmlParser.readElementContent(iterator, childElement);
                return childElement;
            }
            else {
                if (name === null) {
                    throw SmlParser.getLastLineException(iterator, SmlParser.nullValueAsAttributeNameIsNotAllowed);
                }
                const values = line.values.slice(1);
                const childAttribute = new SmlAttribute(name, values);
                SmlNode.internalSetWhitespacesAndComment(childAttribute, this.getLineWhitespaces(line), line.comment);
                return childAttribute;
            }
        }
        else {
            const emptyNode = new SmlEmptyNode();
            SmlNode.internalSetWhitespacesAndComment(emptyNode, this.getLineWhitespaces(line), line.comment);
            return emptyNode;
        }
    }
    static readElementContentSync(iterator, element) {
        for (;;) {
            if (!iterator.hasLine()) {
                throw SmlParser.getLastLineExceptionSync(iterator, `Element "${element.name}" not closed`);
            }
            const node = SmlParser.readNodeSync(iterator, element);
            if (node === null) {
                break;
            }
            element.addNode(node);
        }
    }
    static async readElementContent(iterator, element) {
        for (;;) {
            if (!await iterator.hasLine()) {
                throw SmlParser.getLastLineException(iterator, `Element "${element.name}" not closed`);
            }
            const node = await SmlParser.readNode(iterator, element);
            if (node === null) {
                break;
            }
            element.addNode(node);
        }
    }
    static readEmptyNodesSync(nodes, iterator) {
        while (iterator.isEmptyLine()) {
            const emptyNode = SmlParser.readEmptyNodeSync(iterator);
            nodes.push(emptyNode);
        }
    }
    static async readEmptyNodes(nodes, iterator) {
        while (await iterator.isEmptyLine()) {
            const emptyNode = await SmlParser.readEmptyNode(iterator);
            nodes.push(emptyNode);
        }
    }
    static readEmptyNodeSync(iterator) {
        const line = iterator.getLine();
        const emptyNode = new SmlEmptyNode();
        SmlNode.internalSetWhitespacesAndComment(emptyNode, this.getLineWhitespaces(line), line.comment);
        return emptyNode;
    }
    static async readEmptyNode(iterator) {
        const line = await iterator.getLine();
        const emptyNode = new SmlEmptyNode();
        SmlNode.internalSetWhitespacesAndComment(emptyNode, this.getLineWhitespaces(line), line.comment);
        return emptyNode;
    }
    static determineEndKeywordSync(wsvDocument) {
        for (let i = wsvDocument.lines.length - 1; i >= 0; i--) {
            const values = wsvDocument.lines[i].values;
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
    static getErrorSync(iterator, message) {
        return new SmlParserError(iterator.getLineIndex(), message);
    }
    static getError(iterator, message) {
        return new SmlParserError(iterator.getLineIndex(), message);
    }
    static getLastLineExceptionSync(iterator, message) {
        return new SmlParserError(iterator.getLineIndex() - 1, message);
    }
    static getLastLineException(iterator, message) {
        return new SmlParserError(iterator.getLineIndex() - 1, message);
    }
    static parseDocumentNonPreservingSync(content, encoding = ReliableTxtEncoding.Utf8) {
        const wsvLines = WsvDocument.parseAsJaggedArray(content);
        return SmlParser.parseJaggedArraySync(wsvLines, encoding);
    }
    static parseJaggedArraySync(wsvLines, encoding = ReliableTxtEncoding.Utf8) {
        const endKeyword = SmlParser.determineEndKeywordFromJaggedArraySync(wsvLines);
        const iterator = new SyncWsvJaggedArrayLineIterator(wsvLines, endKeyword);
        const rootElement = SmlParser.parseDocumentNonPreservingInternalSync(iterator);
        const document = new SmlDocument(rootElement);
        document.encoding = encoding;
        document.endKeyword = endKeyword;
        return document;
    }
    static parseDocumentNonPreservingInternalSync(iterator) {
        SmlParser.skipEmptyLinesSync(iterator);
        if (!iterator.hasLine()) {
            throw SmlParser.getErrorSync(iterator, SmlParser.rootElementExpected);
        }
        const node = SmlParser.readNodeNonPreservingSync(iterator);
        if (!(node instanceof SmlElement)) {
            throw SmlParser.getLastLineExceptionSync(iterator, SmlParser.invalidRootElementStart);
        }
        SmlParser.skipEmptyLinesSync(iterator);
        if (iterator.hasLine()) {
            throw SmlParser.getErrorSync(iterator, SmlParser.onlyOneRootElementAllowed);
        }
        return node;
    }
    static skipEmptyLinesSync(iterator) {
        while (iterator.isEmptyLine()) {
            iterator.getLineAsArray();
        }
    }
    static readNodeNonPreservingSync(iterator) {
        const line = iterator.getLineAsArray();
        const name = line[0];
        if (line.length === 1) {
            if (SmlParser.equalIgnoreCase(iterator.getEndKeyword(), name)) {
                return null;
            }
            if (name === null) {
                throw SmlParser.getLastLineExceptionSync(iterator, SmlParser.nullValueAsElementNameIsNotAllowed);
            }
            const element = new SmlElement(name);
            SmlParser.readElementContentNonPreservingSync(iterator, element);
            return element;
        }
        else {
            if (name === null) {
                throw SmlParser.getLastLineExceptionSync(iterator, SmlParser.nullValueAsAttributeNameIsNotAllowed);
            }
            const values = line.slice(1);
            const attribute = new SmlAttribute(name, values);
            return attribute;
        }
    }
    static readElementContentNonPreservingSync(iterator, element) {
        for (;;) {
            SmlParser.skipEmptyLinesSync(iterator);
            if (!iterator.hasLine()) {
                throw SmlParser.getLastLineExceptionSync(iterator, `Element "${element.name}" not closed`);
            }
            const node = SmlParser.readNodeNonPreservingSync(iterator);
            if (node === null) {
                break;
            }
            element.addNode(node);
        }
    }
    static determineEndKeywordFromJaggedArraySync(lines) {
        for (let i = lines.length - 1; i >= 0; i--) {
            const values = lines[i];
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
SmlParser.onlyOneRootElementAllowed = "Only one root element allowed";
SmlParser.rootElementExpected = "Root element expected";
SmlParser.invalidRootElementStart = "Invalid root element start";
SmlParser.nullValueAsElementNameIsNotAllowed = "Null value as element name is not allowed";
SmlParser.nullValueAsAttributeNameIsNotAllowed = "Null value as attribute name is not allowed";
SmlParser.endKeywordCouldNotBeDetected = "End keyword could not be detected";
export { SmlParser };
//# sourceMappingURL=sml.js.map