/* eslint-disable no-console */
import { SmlDocument } from "../src"

const content = `MyRootElement\nGroup1\nMyFirstAttribute 123\nMySecondAttribute 10 20 30 40 50\nEnd\nMyThirdAttribute "Hello world"\nEnd`
const document = SmlDocument.parse(content)

console.log(document.toString())