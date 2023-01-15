"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable no-console */
const src_1 = require("../src");
const content = `MyRootElement\nGroup1\nMyFirstAttribute 123\nMySecondAttribute 10 20 30 40 50\nEnd\nMyThirdAttribute "Hello world"\nEnd`;
const document = src_1.SmlDocument.parse(content);
console.log(document.toString());
//# sourceMappingURL=dev.js.map