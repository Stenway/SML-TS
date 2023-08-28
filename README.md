# SML

## About SML

The Simple Markup Language is an easy and fast to type markup language. It only uses a minimal set of special characters and therefor feels very natural. It is line-based, and if you are a touch typist you will love it.

SML was specifically designed to be understandable for even non-computer experts. It is human-friendly, while also being machine-friendly. It has multi-language support and offers a 100% reliable encoding and decoding.

SML is a lightweight markup language but still powerful and flexible. It is meant to be an alternative for XML, JSON and YAML.

It is especially suited for hierarchical data, but can also nest tabular data with ease. Through its support for comments and whitespace-preserving loading and saving techniques, it is the number one choice for configuration files. But it's not limited to that.

Here is a simple example of an SML document, a simple message data structure:

```
Message
  From Andrew
  To James
  Timestamp 2021-01-02 15:43
  Text "I'll be there at 5pm"
End
```

Learn more about SML on the official website [www.simpleml.com](https://www.simpleml.com) where you can find the complete specification and can try out SML in an online editor.

SML builds the **foundation for text file formats** like [S3D](https://www.youtube.com/watch?v=oPZRmJBw_1Y) and [TBL](https://www.youtube.com/watch?v=mGUlW6YgHjE) (see also the [Stenway Text File Format Stack](https://www.youtube.com/watch?v=m7Z0mrcFeCg)).
All of these formats **don't need to bother about encoding and decoding** anymore, because they rely on [ReliableTXT](https://www.reliabletxt.com), which takes care of that aspect (see also the NPM packages [reliabletxt](https://www.npmjs.com/package/@stenway/reliabletxt), [reliabletxt-io](https://www.npmjs.com/package/@stenway/reliabletxt-io), and [reliabletxt-browser](https://www.npmjs.com/package/@stenway/reliabletxt-browser)). SML is also built upon [WSV](https://www.whitespacesv.com) (see also the NPM packages for [wsv](https://www.npmjs.com/package/@stenway/wsv), [wsv-io](https://www.npmjs.com/package/@stenway/wsv-io), and [wsv-browser](https://www.npmjs.com/package/@stenway/wsv-browser)).

Find out what can be done with WSV on the official [YouTube channel from Stenway](https://www.youtube.com/@stenway). Here is a selection of videos you might start with:

* [SML Explained - The Simple Markup Language](https://www.youtube.com/watch?v=fBzMdzMtH-s)
* [SML in 60 seconds](https://www.youtube.com/watch?v=qOooyygwX0w)
* [Stop Using CSV !](https://www.youtube.com/watch?v=mGUlW6YgHjE)
* [A Better Alternative to XML](https://www.youtube.com/watch?v=LNeSppPFXsI)
* [Writing SML on a #typewriter](https://www.youtube.com/watch?v=sa1yln1kH1k)
* [Static3D File Format - Sneak Peek (S3D)](https://www.youtube.com/watch?v=oPZRmJBw_1Y)
* [PoseML - Describe your dance moves (The Pose Markup Language)](https://www.youtube.com/watch?v=g0fA7WqXX6M)
* [UI Development like in the 90's - With TypeScript and SML](https://www.youtube.com/watch?v=8ZflBjIIXss)

## About this package

This package provides functionality to handle the **parsing and serialization** of SML documents.
This package **works both in the browser and Node.js**, because it does not require environment specific functionality.
If you want to **read and write SML files** using Node.js's file system module, you can use the **[sml-io](https://www.npmjs.com/package/@stenway/sml-io)** package.
The **[sml-browser](https://www.npmjs.com/package/@stenway/sml-browser)** package on the other hand
offers functionality to easily provide SML documents as downloadable files.

If you want to get a first impression on how to use this package, you can watch [this video](https://www.youtube.com/watch?v=zrjmOUkrDhE). But always check the changelog of the presented packages for possible changes, that are
not reflected in the video.

## Getting started

First get the **SML package** installed with a package manager of your choice.
If you are using NPM just run the following command:
```
npm install @stenway/sml
```

As a start, we are going to recreate the example from the
[SML in 60 seconds video](https://www.youtube.com/watch?v=qOooyygwX0w), which describes a 
touristic point of interest and is a good example to
show the basic functionality of the package. First we
create a new SmlElement object. We pass the name
of the element and as a second step, convert
the element to a string by using the toString method.

```ts
import { SmlElement } from "@stenway/sml"

const rootElement = new SmlElement("PointOfInterest")
const rootElementStr = rootElement.toString()
```

The resulting string is the name of the element followed by the end keyword on the next line.

```
PointOfInterest
End
```

We now want to add our first attribute to the element
and thus create a new SmlAttribute object. We pass
the name of the attribute and an array of string values
containing a single string value.

```ts
const attribute = new SmlAttribute("City", ["Seattle"])
const attributeStr = attribute.toString()
```
The string we get by calling the toString method looks like this.
The name and the single value are simply separated by a space character.

```
City Seattle
```

Let's add the attribute to our element and see how the
serialized element looks like.

```ts
rootElement.addNode(attribute)
let result = rootElement.toString()
```

We can see that the element now encloses the attribute line, which is indented:

```
PointOfInterest
	City Seattle
End
```
To add an attribute to an element, we can also use the
comfort method addAttribute.
```ts
rootElement.addAttribute("Name", ["Space Needle"])
result = rootElement.toString()
```
Here our value itself contains a space character, and thus it needs to be enclosed in 
double quotes in our SML string.
```
PointOfInterest
	City Seattle
	Name "Space Needle"
End
```

We already saw, that an attribute takes an array as second
parameter and we now want to pass two values as arguments.
For that we add another attribute called GpsCoords and
pass a value for the latitude and another value for the
longitude. 

```ts
rootElement.addAttribute("GpsCoords", ["47.6205", "-122.3493"])
result = rootElement.toString()
```
As you can see this simply results in line with
the second value also being separated from the first value 
by a space character:

```
PointOfInterest
	City Seattle
	Name "Space Needle"
	GpsCoords 47.6205 -122.3493
End
```

By default, the indentation character is a tab character.
If we want to change that, we can create an SmlDocument
object by passing our element and then change the used
indentation string by setting the defaultIndentation property.

```ts
const document = new SmlDocument(rootElement)
document.defaultIndentation = "  "
result = document.toString()
```

Here we change it to use two space characters, instead of 
the default tab character:
```
PointOfInterest
  City Seattle
  Name "Space Needle"
  GpsCoords 47.6205 -122.3493
End
```

If we want to make the generated SML string visually more
pleasing, we can use the alignAttributes method, to align
the first values of the attributes nicely in the same row.

```ts
rootElement.alignAttributes(" ", 1)
result = document.toString()
```
This gives us:
```
PointOfInterest
  City      Seattle
  Name      "Space Needle"
  GpsCoords 47.6205 -122.3493
End
```
To add a child element to an element, we use the addElement
method and supply the name of the child element as argument.
Here we describe the opening hours by adding attributes for
every day, which we align as well as a last step.

```ts
const hoursElement = rootElement.addElement("OpeningHours")
hoursElement.addAttribute("Sunday", ["9am", "10pm"])
hoursElement.addAttribute("Monday", ["9am", "10pm"])
hoursElement.addAttribute("Tuesday", ["9am", "10pm"])
hoursElement.addAttribute("Wednesday", ["9am", "10pm"])
hoursElement.addAttribute("Thursday", ["9am", "10pm"])
hoursElement.addAttribute("Friday", ["9am", "11pm"])
hoursElement.addAttribute("Saturday", ["9am", "11pm"])
hoursElement.alignAttributes(" ", 1)
result = document.toString()
```
This gives us:
```
PointOfInterest
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
End
```
To show the comment functionality, we remove the OpeningHours
element from our root element and add an empty node with
the addEmptyNode method. An empty node is essentially an empty line,
when it's been serialized as an SML string.
By providing a comment string to the comment property, we
can create a line with just a comment.
```ts
rootElement.nodes.pop()
const commentLine = rootElement.addEmptyNode()
commentLine.comment = " Opening hours should go here"
result = document.toString()
```
This gives us:
```
PointOfInterest
  City      Seattle
  Name      "Space Needle"
  GpsCoords 47.6205 -122.3493
  # Opening hours should go here
End
```

### Parsing and modifications

Now that we've recreated the example from the SML in 60 seconds
video, we will try to parse that SML string with the
static method parse of the SmlDocument class and will convert
the parsed document back as string again, so that you can see,
that all the indentation and alignment space characters will be
preserved.

```ts
import { SmlDocument } from "@stenway/sml"

const content = `PointOfInterest
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

const document = SmlDocument.parse(content)
let result = document.toString()
```

We can access the root element of the document with
the root property and it's name with
the name property. Attributes of an element can be easily
accessed with the attribute method, which takes the name of
the attribute as argument. Here we get our three attributes
and convert the first two arguments as single string values,
and our third attribute as an array of floating point numbers.

```ts
const rootElement = document.root
const rootElementName = rootElement.name
const city = rootElement.attribute("City").asString()
const name = rootElement.attribute("Name").asString()
const gpsCoords = rootElement.attribute("GpsCoords").asFloatArray()
```

Values can be changed, by simply setting the values property.
Here we change the GpsCoords. This also shows an important
feature of SML, which is that names of attributes and elements are
case insensitive, so we can write the GpsCoords attribute name
in upper case, completely in lower case, or in any other variation,
without getting an error.

```ts
rootElement.attribute("GPSCOORDS").values = ["12.345", "67.890"]
result = document.toString()
```

And here we see, that only the values were changed and the
formatting remained:

```
PointOfInterest
  City      Seattle
  Name      "Space Needle"
  GpsCoords 12.345 67.890
  OpeningHours
    Sunday    9am 10pm
    Monday    9am 10pm
    Tuesday   9am 10pm
    Wednesday 9am 10pm
    Thursday  9am 10pm
    Friday    9am 11pm
    Saturday  9am 11pm
  End
End
```
We can also append a comment to an attribute line, and adjust
the whitespace strings so that our comment will be preceeded
by two space characters.

```ts
const nameAttribute = rootElement.attribute("name")
nameAttribute.comment = " Important comment"
nameAttribute.whitespaces = ["  ", "      ", "  "]
result = document.toString()
```
This gives us:

```
PointOfInterest
  City      Seattle
  Name      "Space Needle"  # Important comment
  GpsCoords 12.345 67.890
  OpeningHours
    Sunday    9am 10pm
    Monday    9am 10pm
    Tuesday   9am 10pm
    Wednesday 9am 10pm
    Thursday  9am 10pm
    Friday    9am 11pm
    Saturday  9am 11pm
  End
End
```
Let's do another parsing test with an SML string that contains
a comment line. As you will see, the comment is also preserved.

```ts
const contentWithComment = `PointOfInterest
  City      Seattle
  Name      "Space Needle"
  GpsCoords 47.6205 -122.3493
  # Opening hours should go here
End`

const documentWithComment = SmlDocument.parse(contentWithComment)
result = documentWithComment.toString()
```

In case we don't need the formating and comments to be preserved,
we can provide a second argument to the parse method and will see
that the comment will be gone, as well as the indentation of
two characters and the alignment spaces.

```ts
const documentWithoutWsAndComment = SmlDocument.parse(contentWithComment, false)
result = documentWithoutWsAndComment.toString()
```
This will give us:
```
PointOfInterest
	City Seattle
	Name "Space Needle"
	GpsCoords 47.6205 -122.3493
End
```

### Minification

SML is also very well suited to be minified. For that we can use the
toMinifiedString method, which strips away all unneccessary whitespace
characters like the indentation, all comments and additionally 
reduces the end keyword to a null string, which will be represented
with a single minus character.

```ts
result = document.toMinifiedString()
```

This will give us:
```
PointOfInterest
City Seattle
Name "Space Needle"
GpsCoords 12.345 67.890
OpeningHours
Sunday 9am 10pm
Monday 9am 10pm
Tuesday 9am 10pm
Wednesday 9am 10pm
Thursday 9am 10pm
Friday 9am 11pm
Saturday 9am 11pm
-
-
```
If you want to know more about the minification, you can also watch [this video](https://www.youtube.com/watch?v=mujA0AfKgKw).

### Relationship to WSV

If you look at the minified version of the document and 
you've maybe already seen WSV, you might already
have noticed, what the relationship between SML and WSV is.
An SML document is a valid WSV document, which creates a hierarchy
by counting the number of values per line. If the line has more
than one value it's an attribute. If the line has no value, than it's
an empty node, and if the line has exactly one value, it's either
the starting line of an element or the closing line, if it matches
the end keyword. And the end keyword is simply derived by looking
at the last non empty line. And that's the beautiful concept
of SML.

In order to demonstrate that relation, we will parse the SML
string with the static parse method of the WsvDocument class from the [WSV package](https://www.npmjs.com/package/@stenway/wsv),
which will return a WsvDocument object. We then access the
parsed Wsv lines and change the first value of line 6 to the
capitalized word Sunday.

```ts
import { WsvDocument } from "@stenway/wsv"

const content = `PointOfInterest
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

const wsvDocument = WsvDocument.parse(content)
wsvDocument.lines[5].values[0] = "SUNDAY"
let result = wsvDocument.toString()
```

When we convert it back to a string,
we can see that the first attribute of the opening hours
element has changed it's name:

```
PointOfInterest
  City      Seattle
  Name      "Space Needle"
  GpsCoords 47.6205 -122.3493
  OpeningHours
    SUNDAY    9am 10pm
    Monday    9am 10pm
    Tuesday   9am 10pm
    Wednesday 9am 10pm
    Thursday  9am 10pm
    Friday    9am 11pm
    Saturday  9am 11pm
  End
End
```

We can also parse the SML document string without preserving whitespaces
and comments.

```ts
const wsvDocumentWithoutWS = WsvDocument.parse(content, false)
result = wsvDocumentWithoutWS.toString()
```

And we will get this result:
```
PointOfInterest
City Seattle
Name "Space Needle"
GpsCoords 47.6205 -122.3493
OpeningHours
Sunday 9am 10pm
Monday 9am 10pm
Tuesday 9am 10pm
Wednesday 9am 10pm
Thursday 9am 10pm
Friday 9am 11pm
Saturday 9am 11pm
End
End
```

We could even parse the SML document string as a jagged array, which
also demonstrates the relationship and the concept of SML quite nicely.

```ts
const jaggedArray = WsvDocument.parseAsJaggedArray(content)
```

And last but not least, the ultimate test. We parse the SML
string as a WsvDocument, convert it to a string with the toString
method and parse that result as an SmlDocument.

```ts
const wsvSmlDocument = SmlDocument.parse(
	WsvDocument.parse(content).toString()
)
result = wsvSmlDocument.toString()
```
And it works as expected.

### Parser errors

When we parse an SML document string, we always should consider
that it might contain syntactical errors. In this example the
end keyword is missing and the parse method will throw an
SmlParserError that also tells us in which line the error occured:

```ts
const invalidContent = `PointOfInterest
  City      Seattle
  Name      "Space Needle"
  GpsCoords 47.6205 -122.3493`

try {
	const document = SmlDocument.parse(invalidContent)
} catch (error) {
	const smlError = error as SmlParserError
	console.log(`Parser error: ${smlError.message}`)
}
```

It's not the only type of error that could occur, especially
because SML is based on WSV, we could also get a WsvParserError,
like in this example where a value is missing a closing double quote:

```ts
SmlDocument.parse(`Root\nAttribute "My Value\nEnd`)
```

Another type of error is the NoReliableTxtPreambleError. Because
WSV is based on ReliableTXT and thus SML is as well, we can get
a NoReliableTxtPreambleError when a byte sequence is decoded
and does not have a valid ReliableTXT preamble, like in the following example:

```ts
SmlDocument.fromBytes(new Uint8Array([0x31, 0x32, 0x33]))
```

### Validation

We will now look at some built-in validation methods, which will help you, when you want to load
an SML document in a reliable way, without using a schema.
For this example we will use a simple file list, which has 
a root element called files, and uses attributes with the name
file to represent the items of the file list.

```ts
const content = `#=============================
# My file list
# Copyright Steve Wilson 2022
#=============================
Files
  File Readme.txt
  File c:\\Directory\\File.txt
  File "d:\\My directory\\Test.sml"
End`
```

We first check the root element's name, with the assureName
method. We also make sure, that the root element has only attributes
and not elements as child nodes, with the assureNoElements method.
In order to restrict the child attributes to only attributes with
the name file, we can use the assureAttributeNames method.

```ts
try {
	const document = SmlDocument.parse(content)
	console.log(document.toString())

	const root = document.root
	root.assureName("Files")
	root.assureNoElements()
	root.assureAttributeNames(["File"])

	let filePaths: string[] = root.attributes().map(x => x.asString())
	console.log(filePaths)
} catch (error) {
	console.log(`Error: ${(error as Error).message}`)
}
```
To convert our SML file list to a string array, we use the attributes
method which returns all child attributes of the specified element,
in our case the root element. And we take this array of attributes
and map each attribute to a string, by using the asString method.
The asString method also makes sure, that the attribute only has
one value and not multiple, and checks that the value is not null.

And that's all we need to get our file list.

As a side note, you can add comments before or after a root element,
like the copyright information in our example.

We can now test our validation methods. We could for example
change the root element name, or the first attribute's name,
or we could add an element to the root element. All this
would produce an error message.
We can also test what happens, when we supply a null value as file path.
That case is also handled. Also adding another value to the attribute, would not be allowed.
This already gives us a nice set of methods, to
load our SML document in a robust way.

#### Values with units

Of course there are many more of these helper and validation
methods and we will now have a further look at some of them.

Here is an example where we want to specify a value that can 
have a unit. With SML that's pretty easy to do:

```ts
enum Unit {
	Meter,
	Centimeter,
	Millimeter
}

const content = `Test
	Length 10
End`

const document = SmlDocument.parse(content)
const root = document.root

try {
	const lengthAttribute = root.attribute("Length")
	lengthAttribute.assureValueCountMinMax(1, 2)
	const lengthValue = lengthAttribute.getFloat(0)
	const lengthUnit: Unit | null = null
	if (lengthAttribute.valueCount === 2) {
		lengthUnit = lengthAttribute.getEnum(["m", "cm", "mm"], 1)
	}
	console.log(`Value: ${lengthValue} Unit: ${lengthUnit}`)
} catch (error) {
	if (error instanceof Error) { console.log(error.message) }
	else { console.log(error) }
}
```

We use the assureValueCountMinMax method, to specify the minimum value
count and the maximum value count. For an attribute with
optional unit value, that's one and two.
The getFloat method converts a value at the specified index
of the attribute's value array into a number and also assures
that the format of the value is correct.
We then check, if a second value is available and convert
it with the getEnum method to a unit. We pass an array of
possible enum string values and the method will compare
the value with them, returning actually an index number into
the array where the method found a match.
When we specify a not expected unit, we will get an error
message.

#### Null values and required or optional nodes

In some situations we might want a null value as possible value
or want to specify whether an attribute is optional or required.
To specify that an attribute must exist and only has an
occurrance of one, we can use the requiredAttribute method,
which will throw an error, if the conditions are not met.
Here the name of the player is a must, which we can express like
this.

```ts
const content = `Player
	Name SuperGamer123
	FavoriteFood Cheeseburger
End`

try {
	const document = SmlDocument.parse(content)
	const root = document.root

	const playerName = root.requiredAttribute("Name").asString()
	console.log(`Player name: ${playerName}`)

	const favoriteFoodAttribute = root.optionalAttribute("FavoriteFood")
	if (favoriteFoodAttribute !== null) {
		const favoriteFood = favoriteFoodAttribute.asNullableString()
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

The FavoriteFood attribute does not need to be specified, so we
can use the optionalAttribute method which will return either 
the attribute or null. If the attribute was specified, we can
get its value. We want to allow null as a value, so we use
the asNullableString method, which will either return a string
or null.

With the hasAttribute method, we can check if the element has
at least one attribute with the specified name.

We can play around with the SML document string and see the
validation in action. For example we can comment out the required
name attribute or could duplicate the name attribute.
Both cases would produce errors that already tell us in a nice way,
what the problem is.

If we would change the FavoriteFood attribute and would provide a null value,
we would see the default string. When we comment out the optional attribute,
we would get the message printed, for the case that no attribute with
the name FavoriteFood was found.

## Multi-line values

One really beautiful aspect about SML is how multi-line strings
are handled. Here we create an SmlElement and add two attributes
that both have multi-line strings as values:

```ts
const rootElement = new SmlElement("RootElement")
rootElement.addAttribute("Attribute1", ["Line1\nLine2\nLine3"])
rootElement.addAttribute("Attribute2", ["Line1\nLine2"])
const result = rootElement.toString()
```

And here is how the serialized SML element looks like:

```
RootElement
	Attribute1 "Line1"/"Line2"/"Line3"
	Attribute2 "Line1"/"Line2"
End
```

All line-feed characters are replaced with the special WSV line break syntax ``"/"`` and therefor
an attribute with multi-line string values will always remain
on one line. The document structure or let's call it outline 
therefor always remains nicely visible.

## End keyword

In our last example we will change the end keyword, which we
can individually choose if we want it to be different than the
default English end keyword. This is helpful, when your requirement
is to create a completely localized SML document like here
in this example, where we create a completely Japanese SML document:

```ts
const japaneseElement = new SmlElement("契約")
const japaneseSubElement = japaneseElement.addElement("個人情報")
japaneseSubElement.addAttribute("名字", ["田中"])
japaneseSubElement.addAttribute("名前", ["蓮"])
japaneseElement.addAttribute("日付", ["２０２１－０１－０２"])
const japaneseDocument = new SmlDocument(japaneseElement, "エンド")
japaneseDocument.defaultIndentation = "\u3000"
const result = japaneseDocument.toString()
```
We also change our default indentation to a special space character,
called ideographic space, which aligns Japanese, Chinese, Korean and
other characters nicely:

```
契約
　個人情報
　　名字 田中
　　名前 蓮
　エンド
　日付 ２０２１－０１－０２
エンド
```

Fun fact: The following code would create a valid SML document:
```ts
import { SmlElement } from "@stenway/sml"

console.log(
	new SmlElement("The").toString()
)
```
As you can see in the [following video](https://www.youtube.com/shorts/5bwoTXezZ0c).

## Encoding and decoding

The SmlDocument class offers the method toBytes and the static method fromBytes to directly serialize
the document to a byte array and deserialize it again. This bytes would be the bytes of the text file
written and because SML is based on ReliableTXT would be prefixed with a [ReliableTXT preamble](https://www.reliabletxt.com). Here is an example of the methods in use:

```ts
const document = SmlDocument.parse(`Root\nEnd`)
const bytes = document.toBytes()
const fromBytesDocument = SmlDocument.fromBytes(bytes)
```

The default encoding is [UTF-8](https://www.youtube.com/watch?v=VgVkod9HQTo). If you want
to specify another ReliableTXT encoding, import the ReliableTxtEncoding enum from
the [ReliableTXT package](https://www.npmjs.com/package/@stenway/reliabletxt) and
change the encoding property of the SML document:

```ts
document.encoding = ReliableTxtEncoding.Utf16
```
Calling now the fromBytes method, would return a byte sequence using the UTF-16 encoding.

The toBytes method can be used, when you want to transfer SML documents via HTTP.
For that see the related video [Transferring ReliableTXT Documents Using HTTP](https://www.youtube.com/watch?v=Z0xjuHgAAXw).


## BinarySML

BinarySML is the binary representation of SML documents. It starts with the magic code 'BS1'.
BinarySML is made for scenarios, where parsing speed of the textual representation might be a limitation.
Like [BinaryWSV](https://www.youtube.com/watch?v=vR1bj6sArLU) it uses invalid UTF-8 codepoints to
separate elements, attributes, and values from each other, and to signal null values. The special bytes are:

```
11111111 = Element Start Byte
11111110 = Element End Byte
11111101 = Attribute End Byte
11111100 = Value Separator Byte
11111011 = Null Value Byte
```
It always produces smaller document size than the textual representation. It is also well suited for streaming.

The SmlDocument class offers the method toBinarySml and the static method fromBinarySml to comfortable
get the byte sequences and decode those again as SmlDocument objects:

```ts
const document = SmlDocument.parse(`Root\nEnd`)
const bytes = document.toBinarySml()
const decodedDocument = SmlDocument.fromBinarySml(bytes)
```