import * as ts_module from 'typescript/lib/tsserverlibrary'
import * as fs from 'fs'
import * as path from 'path'
import { log } from './log';

import { LanguageService } from 'typescript/lib/tsserverlibrary';

export class WebpackConfig {
  filename: string = '____webpack.ts'
  private _version: number = 0
  originalConfigSource: string = ''

  originalOffset: number = -1;

  readonly originalStart = `module.exports = {`

  fakeSourceStart = ''
  readonly fakeSourceEnd = `}`

  constructor(absWebpackPath: string) {
    this.fakeSourceStart = `import * as webpack from '${absWebpackPath}'; let config: webpack.Configuration = {}; module.exports = config = {`
  }

  getVersion() {
    this._version++
    return this._version
  }
  
  updateOriginalConfigSource(original: string) {
    const start = original.indexOf(this.originalStart) + this.originalStart.length
    const end = original.lastIndexOf(`}`)

    this.originalOffset = this.fakeSourceStart.length - start

    // log(`start: ${start}`)
    // log(`end: ${end}`)
    // log(`original: ${original}`)
    // log(`original config source: ${original.slice(start, end)}`)
    this.originalConfigSource = original.slice(start, end)
  }

  getFakeSource() {
    return this.fakeSourceStart + this.originalConfigSource + this.fakeSourceEnd
  }

  getCompletionPosition(pos: number) {
    return pos + this.originalOffset
  }
}

export function getLS(wpFile: WebpackConfig, ts: typeof ts_module): LanguageService {
  const fileNames: string[] = []

  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2016,
    module: ts.ModuleKind.CommonJS,
    jsx: ts_module.JsxEmit.Preserve,
    allowJs: true,
    allowSyntheticDefaultImports: true,
    noLib: true
  }

  fileNames.push(wpFile.filename)

  const files: ts.MapLike<{ version: number }> = {}

  // initialize the list of files
  fileNames.forEach(fileName => {
    files[fileName] = { version: 0 }
  })

  const servicesHost: ts.LanguageServiceHost = {
    getScriptFileNames: () => fileNames,
    getScriptVersion: fileName => {
      if (fileName === wpFile.filename) {
        return wpFile.getVersion().toString()
      }
      return files[fileName] && files[fileName].version.toString()
    },
    getScriptSnapshot: fileName => {
      if (fileName === wpFile.filename) {
        return ts.ScriptSnapshot.fromString(wpFile.getFakeSource())
      }

      if (!fs.existsSync(fileName)) {
        return undefined
      }

      return ts.ScriptSnapshot.fromString(fs.readFileSync(fileName).toString())
    },
    getCurrentDirectory: () => process.cwd(),
    getCompilationSettings: () => options,
    getDefaultLibFileName: options => ts.getDefaultLibFilePath(options),
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory
  }

  const registry = ts.createDocumentRegistry()
  const service = ts.createLanguageService(servicesHost, registry)

  return service
}