# SML

## About

[SML Documentation/Specification](https://www.simpleml.com)

## Installation

Using NPM:
```
npm install @stenway/sml
```

## Getting started

```ts
import { SmlDocument } from "@stenway/sml"
console.log(SmlDocument.parse("Begin\nAttribute 123\nEnd"))
```

For file reading and writing functionality see the [sml-io package](https://www.npmjs.com/package/@stenway/sml-io).

## Videos
* [Package Usage](https://www.youtube.com/watch?v=zrjmOUkrDhE)
* [SML in 60 seconds](https://www.youtube.com/watch?v=qOooyygwX0w)
* [SML Explained](https://www.youtube.com/watch?v=fBzMdzMtH-s)
* [Why I like the UTF-8 Byte Order Mark (BOM)](https://www.youtube.com/watch?v=VgVkod9HQTo)
* [Stop Using Windows Line Breaks (CRLF)](https://www.youtube.com/watch?v=YPtMCiHj7F8)

## Examples

Code to recreate the examples from the [SML in 60 seconds](https://www.youtube.com/watch?v=qOooyygwX0w) video:

```ts
import { SmlAttribute, SmlDocument, SmlElement } from "@stenway/sml"

console.log("----------------------------------------")

let rootElement = new SmlElement("PointOfInterest")
let rootElementStr = rootElement.toString()
console.log(rootElementStr)

let attribute = new SmlAttribute("City", ["Seattle"])
let attributeStr = attribute.toString()

console.log("----------------------------------------")

rootElement.addNode(attribute)
console.log(rootElement.toString())

console.log("----------------------------------------")

rootElement.addAttribute("Name", ["Space Needle"])
console.log(rootElement.toString())

console.log("----------------------------------------")

rootElement.addAttribute("GpsCoords", ["47.6205", "-122.3493"])
console.log(rootElement.toString())

console.log("----------------------------------------")

let document = new SmlDocument(rootElement)
document.defaultIndentation = "  "
console.log(document.toString())

console.log("----------------------------------------")

rootElement.alignAttributes(" ", 1)
console.log(document.toString())

console.log("----------------------------------------")

let hoursElement = rootElement.addElement("OpeningHours")
hoursElement.addAttribute("Sunday", ["9am", "10pm"])
hoursElement.addAttribute("Monday", ["9am", "10pm"])
hoursElement.addAttribute("Tuesday", ["9am", "10pm"])
hoursElement.addAttribute("Wednesday", ["9am", "10pm"])
hoursElement.addAttribute("Thursday", ["9am", "10pm"])
hoursElement.addAttribute("Friday", ["9am", "11pm"])
hoursElement.addAttribute("Saturday", ["9am", "11pm"])
hoursElement.alignAttributes(" ", 1)
console.log(document.toString())

console.log("----------------------------------------")

rootElement.nodes.pop()
let commentLine = rootElement.addEmptyNode()
commentLine.comment = " Opening hours should go here"
console.log(document.toString())

console.log("----------------------------------------")
console.log("SML usage")
```

```ts
import { SmlDocument, SmlParserError } from "@stenway/sml"
import { WsvDocument } from "@stenway/wsv"

console.log("----------------------------------------")

let content = `PointOfInterest
  City      Seattle
  Name      "Space Needle"
  GpsCoords 47.6205 -122.3493
  OpeningHours
    Sunday    9am 10pm
    Monday    9am 10pm
    Tuesday   9am 10pm
    Wednesday 9am 10pm
    Thursday  9am 10pm
    Friday    9am 11pm
    Saturday  9am 11pm
  End
End`

let document = SmlDocument.parse(content)
console.log(document.toString())

console.log("----------------------------------------")

let rootElement = document.root
let rootElementName = rootElement.name
let city = rootElement.attribute("City").asString()
let name = rootElement.attribute("Name").asString()
let gpsCoords = rootElement.attribute("GpsCoords").asFloatArray()

rootElement.attribute("GPSCOORDS").values = ["12.345", "67.890"]
console.log(document.toString())

console.log("----------------------------------------")

let nameAttribute = rootElement.attribute("name")
nameAttribute.comment = " Important comment"
nameAttribute.whitespaces = ["  ", "      ", "  "]
console.log(document.toString())

console.log("----------------------------------------")

let contentWithComment = `PointOfInterest
  City      Seattle
  Name      "Space Needle"
  GpsCoords 47.6205 -122.3493
  # Opening hours should go here
End`

let documentWithComment = SmlDocument.parse(contentWithComment)
console.log(documentWithComment.toString())

console.log("----------------------------------------")

let documentWithoutWsAndComment = SmlDocument.parse(
	contentWithComment, false
)
console.log(documentWithoutWsAndComment.toString())

console.log("----------------------------------------")

console.log(document.toMinifiedString())

console.log("----------------------------------------")

let wsvDocument = WsvDocument.parse(content)
wsvDocument.lines[5].values[0] = "SUNDAY"
console.log(wsvDocument.toString())

console.log("----------------------------------------")

let wsvDocumentWithoutWS = WsvDocument.parse(content, false)
console.log(wsvDocumentWithoutWS.toString())

let jaggedArray = WsvDocument.parseAsJaggedArray(content)

console.log("----------------------------------------")

let wsvSmlDocument = SmlDocument.parse(
	WsvDocument.parse(content).toString()
)
console.log(wsvSmlDocument.toString())

console.log("----------------------------------------")

let invalidContent = `PointOfInterest
  City      Seattle
  Name      "Space Needle"
  GpsCoords 47.6205 -122.3493`

try {
	let document = SmlDocument.parse(invalidContent)
} catch (error) {
	let smlError = error as SmlParserError
	console.log(`Parser error: ${smlError.message}`)
}

console.log("----------------------------------------")
console.log("SML usage")
```

```ts
import { SmlDocument, SmlParserError } from "@stenway/sml"
import { WsvDocument } from "@stenway/wsv"

console.log("----------------------------------------")

let content = `#=============================
# My file list
# Copyright Steve Wilson 2022
#=============================
Files
  File Readme.txt
  File c:\\Directory\\File.txt
  File "d:\\My directory\\Test.sml"
End`

try {
	let document = SmlDocument.parse(content)
	console.log(document.toString())

	let root = document.root
	root.assureName("Files")
	root.assureNoElements()
	root.assureAttributeNames(["File"])

	let filePaths: string[] = root.attributes().map(x => x.asString())
	console.log("----------------------------------------")
	console.log(filePaths)
} catch (error) {
	console.log("----------------------------------------")
	console.log(`Error: ${(error as Error).message}`)
}

console.log("----------------------------------------")
console.log("SML usage")
```

```ts
import { SmlDocument } from "@stenway/sml"

// values with unit

enum Unit {
	Meter,
	Centimeter,
	Millimeter
}

let content = `Test
	Length 10
End`

let document = SmlDocument.parse(content)
let root = document.root

try {
	let lengthAttribute = root.attribute("Length")
	lengthAttribute.assureValueCountMinMax(1, 2)
	let lengthValue = lengthAttribute.getFloat(0)
	let lengthUnit: Unit | null = null
	if (lengthAttribute.valueCount === 2) {
		lengthUnit = lengthAttribute.getEnum(["m", "cm", "mm"], 1)
	}
	console.log(`Value: ${lengthValue} Unit: ${lengthUnit}`)
} catch (error) {
	if (error instanceof Error) { console.log(error.message) }
	else { console.log(error) }
}
```

```ts
import { SmlDocument } from "@stenway/sml"

// nullable value

let content = `Player
	Name SuperGamer123
	FavoriteFood Cheeseburger
End`

try {
	let document = SmlDocument.parse(content)
	let root = document.root

	let playerName = root.requiredAttribute("Name").asString()
	console.log(`Player name: ${playerName}`)

	let favoriteFoodAttribute = root.optionalAttribute("FavoriteFood")
	if (favoriteFoodAttribute !== null) {
		let favoriteFood = favoriteFoodAttribute.asNullableString()
		console.log(`Favorite food: ${favoriteFood ?? `Eats everything`}`)
	}

	if (!root.hasAttribute("FavoriteFood")) {
		console.log(`Favorite food was not yet specified.`)
	}
} catch (error) {
	if (error instanceof Error) { console.log(error.message) }
	else { console.log(error) }
}
```

```ts
import { SmlDocument, SmlElement } from "@stenway/sml"

// multiline values

console.log("----------------------------------------")

let rootElement = new SmlElement("RootElement")
rootElement.addAttribute("Attribute1", ["Line1\nLine2\nLine2"])
rootElement.addAttribute("Attribute2", ["Line1\nLine2"])
console.log(rootElement.toString())

// end keyword

console.log("----------------------------------------")

let japaneseElement = new SmlElement("契約")
let japaneseSubElement = japaneseElement.addElement("個人情報")
japaneseSubElement.addAttribute("名字", ["田中"])
japaneseSubElement.addAttribute("名前", ["蓮"])
japaneseElement.addAttribute("日付", ["２０２１－０１－０２"])
let japaneseDocument = new SmlDocument(japaneseElement, "エンド")
japaneseDocument.defaultIndentation = "\u3000"
console.log(japaneseDocument.toString())

console.log("----------------------------------------")
console.log("SML usage")
```

```ts
import { SmlElement } from "@stenway/sml"

console.log(
	new SmlElement("The").toString()
)
```

## BinarySML

BinarySML is the binary representation of SML documents. It starts with the magic code 'BSML'.
It uses the VarInt56 encoding to encode for example how many bytes a string value will take up space.
Because it uses VarInt56, the complete file is UTF-8 compatible and can be validated for UTF-8 correctness in one single step which can offer a performance advantage.

BinarySML is made for scenarios, where parsing speed of the textual representation might be a limitation.

Usage:
```ts
const document = SmlDocument.parse(`Root\nEnd`)
const bytes = document.toBinarySml()
const decodedDocument = SmlDocument.fromBinarySml(bytes)
```