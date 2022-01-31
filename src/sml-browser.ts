/* (C) Stefan John / Stenway / SimpleML.com / 2022 */

import { SmlDocument } from "./sml.js"

// ----------------------------------------------------------------------

export abstract class SmlDownload {
	static getDownloadUrl(document: SmlDocument): string {
		let bytes: Uint8Array = document.getBytes()
		let blob: Blob = new Blob([bytes], { type: 'text/plain' })
		return URL.createObjectURL(blob)
	}
	
	static download(wsvDocument: SmlDocument, fileName: string) {
		const url = SmlDownload.getDownloadUrl(wsvDocument)
		let element = document.createElement('a')
		element.href = url
		element.download = fileName
		element.style.display = 'none'
		document.body.appendChild(element)
		element.click()
		document.body.removeChild(element)
	}
}