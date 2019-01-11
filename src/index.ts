import * as ts_module from 'typescript/lib/tsserverlibrary'
import * as path from 'path'

import { log } from './log'
import { WebpackConfig, getLS } from './webpackMask'
import { WebpackSemanticErrorEmitter } from './semanticDiagnostics'

function init(modules: { typescript: typeof ts_module }) {
  const ts = modules.typescript

  function create(info: ts.server.PluginCreateInfo) {
    const proxy: ts.LanguageService = Object.create(null)
    for (let k of Object.keys(info.languageService) as Array<keyof ts.LanguageService>) {
      const x = info.languageService[k]
      if (x) {
        proxy[k] = (...args: Array<{}>) => (x as any).apply(info.languageService, args)
      }
    }

    // Hack to handle flattened deps
    const WEBPACK_ABS_PATH = path.resolve(__dirname, '../../@types/webpack')
    log(WEBPACK_ABS_PATH)

    const wpFile = new WebpackConfig(WEBPACK_ABS_PATH)
    const miniLS = getLS(wpFile, ts)
    const errorEmitter = new WebpackSemanticErrorEmitter()

    log('init ts-config-plugin')

    proxy.getCompletionsAtPosition = (fileName, position, options) => {
      if (!fileName.endsWith('webpack.config.js')) {
        return info.languageService.getCompletionsAtPosition(fileName, position, options)
      }

      const snapshot = info.languageServiceHost.getScriptSnapshot(fileName)
      if (!snapshot) {
        return undefined
      }
      const content = snapshot.getText(0, snapshot.getLength())
      wpFile.updateOriginalConfigSource(content)

      if (position > wpFile.originalBlockStart && position < wpFile.originalBlockEnd) {
        const results = miniLS.getCompletionsAtPosition(wpFile.filename, wpFile.getOffsetedPosition(position), options)

        return results
      } else {
        return info.languageService.getCompletionsAtPosition(fileName, position, options)
      }
    }

    proxy.getCompletionEntryDetails = (fileName: string, position: number, ...args) => {
      if (!fileName.endsWith('webpack.config.js')) {
        return info.languageService.getCompletionEntryDetails(fileName, position, ...args)
      }

      const snapshot = info.languageServiceHost.getScriptSnapshot(fileName)
      if (!snapshot) {
        return undefined
      }

      if (position > wpFile.originalBlockStart && position < wpFile.originalBlockEnd) {
        return miniLS.getCompletionEntryDetails(fileName, position, ...args)
      } else {
        return info.languageService.getCompletionEntryDetails(fileName, position, ...args)
      }
    }

    proxy.getSemanticDiagnostics = fileName => {
      const diagnostics = info.languageService.getSemanticDiagnostics(fileName)

      if (fileName.endsWith('webpack.config.js')) {
        const snapshot = info.languageServiceHost.getScriptSnapshot(fileName)
        if (!snapshot) {
          return []
        }
        const content = snapshot.getText(0, snapshot.getLength())
        wpFile.updateOriginalConfigSource(content)

        const webpackSemanticDiagnostics = errorEmitter.getWebpackDiagnostics(wpFile.getFakeSource())

        const program = proxy.getProgram()
        const sourceFile = program.getSourceFile(fileName)

        webpackSemanticDiagnostics.forEach(d => {
          diagnostics.push({
            ...d.compilerObject,
            start: wpFile.getOriginalPosition(d.compilerObject.start),
            file: sourceFile,
            source: content
          })
        })

        // NONE of these generate any diagnostics

        // const diag = ts.getPreEmitDiagnostics(program, sourceFile)
        // log(diag)
        // const diag0 = proxy.getProgram().getSemanticDiagnostics(sourceFile)
        // log(diag0)
        // const diags = miniLS.getSemanticDiagnostics(wpFile.filename)
        // log(diags)
        // const diags2 = miniLS.getSemanticDiagnostics(wpFile.filename)
        // log(diags2)

        // return diags
      }

      return diagnostics
    }

    return proxy
  }

  return { create }
}

export = init
