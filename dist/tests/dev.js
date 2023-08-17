/* eslint-disable no-console */
import { BinarySmlDecoder, SmlDocument } from "../src/sml.js";
import * as fs from 'node:fs';
const elementEndCode = 0b00000001;
const emptyElementNameCode = 0b00000101;
const emptyAttributeNameCode = 0b00000011;
const attributeEndCode = 0b00000001;
const nullValueCode = 0b00000011;
const charA = 0x41;
const charE = 0x45;
const input = [0b00001001, 0x41, emptyAttributeNameCode, nullValueCode, attributeEndCode, elementEndCode];
const document = BinarySmlDecoder.decode(new Uint8Array([0x42, 0x53, 0x4D, 0x4C, 0x31, ...input]));
function writeBytesSync(bytes, filePath) {
    fs.writeFileSync(filePath, bytes);
}
function test1() {
    const document = SmlDocument.parse(`Table
		Meta
		Title       "My Table"
		Description "This is a description of my table"		
		End
		FirstName      LastName  Age PlaceOfBirth
		William        Smith     30  Boston
		Olivia         Jones     27  "San Francisco"
		Lucas          Brown     -   Chicago          # Age missing
		"James Elijah" Wilson    20  "New York City"
		Elizabeth      Miller                         # Data missing
		Victoria       Davis     22  Austin
	End`);
    const bytes = document.toBinarySml();
    writeBytesSync(bytes, "d:\\Test3.bsml");
    const bytes2 = document.getBytes();
    writeBytesSync(bytes2, "d:\\Test3.sml");
    document.minify();
    const bytes3 = document.getBytes();
    writeBytesSync(bytes3, "d:\\Test3M.sml");
}
//console.log(bytes)
//const decodedDocument = SmlDocument.fromBinarySml(bytes)
/*
const document = SmlDocument.parse("A\nEnd")
const bytes = BinarySmlEncoder.encodeElement(document.root, true)

console.log(bytes)*/
console.log("Dev");
//# sourceMappingURL=dev.js.map