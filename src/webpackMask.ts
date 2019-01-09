import * as ts_module from 'typescript/lib/tsserverlibrary'
import * as fs from 'fs'

import { LanguageService } from 'typescript/lib/tsserverlibrary'
import { log } from './log';

export class WebpackConfig {
  private _version: number = 0

  filename: string = '____webpack.ts'

  originalConfigSource: string = ''
  originalPreConfigSource: string = ''
  originalPostConfigSource: string = ''

  // Position of the opening module.exports = {|
  originalBlockStart: number = -1
  // Position of the closing of module.exports = {... |}
  originalBlockEnd: number = -1

  readonly originalStart = `module.exports = {`

  fakeConfigSourceStart = ''
  readonly fakeConfigSourceEnd = `}`

  constructor(absWebpackPath: string) {
    this.fakeConfigSourceStart = `import * as webpack from '${absWebpackPath}'; let config: webpack.Configuration = {}; module.exports = config = {`
  }

  getVersion() {
    this._version++
    return this._version
  }

  updateOriginalConfigSource(original: string) {
    this.originalBlockStart = original.indexOf(this.originalStart) + this.originalStart.length
    this.originalBlockEnd = original.lastIndexOf(`}`)
    this.originalConfigSource = original.slice(this.originalBlockStart, this.originalBlockEnd)
    this.originalPreConfigSource = original.slice(0, this.originalBlockStart - this.originalStart.length)
    this.originalPostConfigSource = original.slice(this.originalBlockEnd + 1)
  }

  getFakeSource() {
    return (
      this.originalPreConfigSource +
      this.fakeConfigSourceStart +
      this.originalConfigSource +
      this.fakeConfigSourceEnd +
      this.originalPostConfigSource
    )
  }

  getOffsetedPosition(pos: number) {
    return pos - this.originalBlockStart + this.originalPreConfigSource.length + this.fakeConfigSourceStart.length
  }

  getOriginalPosition(offsetedPosition: number) {
    const delta = offsetedPosition - this.originalPreConfigSource.length - this.fakeConfigSourceStart.length
    return this.originalBlockStart + delta
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
