import * as ts_module from 'typescript/lib/tsserverlibrary'
import * as path from 'path'

import { log } from './log'
import { WebpackConfig, getLS } from './webpackMask';

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

    const wpFile = new WebpackConfig(path.resolve(__dirname, '../workspaces/webpack/node_modules/@types/webpack'))
    const miniLS = getLS(wpFile, ts)

    log('init')

    proxy.getCompletionsAtPosition = (fileName, position, options) => {
      const snapshot = info.languageServiceHost.getScriptSnapshot(fileName)
      if (!snapshot) {
        return undefined
      }
      const content = snapshot.getText(0, snapshot.getLength())

      const originalStart = `module.exports = {`
      const blockStart = content.indexOf(originalStart) + originalStart.length
      const originalEnd = `}`
      const blockEnd = content.lastIndexOf(originalEnd)

      if (position > blockStart && position < blockEnd) {
        wpFile.updateOriginalConfigSource(content)
        log(wpFile.getFakeSource())

        const results = miniLS.getCompletionsAtPosition(
          wpFile.filename,
          wpFile.getCompletionPosition(position),
          options
        )

        log(results)

        return results
      } else {
        return info.languageService.getCompletionsAtPosition(fileName, position, options);
      }

    }

    proxy.getCompletionEntryDetails = (fileName: string, position: number, name: string, formatOptions: ts.FormatCodeOptions | ts.FormatCodeSettings | undefined, source: string | undefined, preferences: ts.UserPreferences | undefined) => {
      const snapshot = info.languageServiceHost.getScriptSnapshot(fileName)
      if (!snapshot) {
        return undefined
      }
      const content = snapshot.getText(0, snapshot.getLength())

      const originalStart = `module.exports = {`
      const blockStart = content.indexOf(originalStart) + originalStart.length
      const originalEnd = `}`
      const blockEnd = content.lastIndexOf(originalEnd)

      if (position > blockStart && position < blockEnd) {
        wpFile.updateOriginalConfigSource(content)
        log(wpFile.getFakeSource())

        const results = miniLS.getCompletionEntryDetails(
          fileName,
          position,
          name,
          formatOptions,
          source,
          preferences
        )

        log(results)

        return results
      } else {
        return info.languageService.getCompletionEntryDetails(
          fileName,
          position,
          name,
          formatOptions,
          source,
          preferences
        )
      }
    }

    // proxy.getSemanticDiagnostics = (fileName) => {
    //   // const a = miniLS.getProgram().getSourceFile(wpFile.filename)
    //   // log(a.fileName)
    //   // log(a.getText())
    //   // log(miniLS.getProgram().getSemanticDiagnostics().map(d => d.file))
    //   // log(miniLS.getProgram().getSourceFiles().map(sf => sf.fileName))
    //   if (fileName.endsWith('webpack.config.js')) {
    //     const snapshot = info.languageServiceHost.getScriptSnapshot(fileName)
    //     if (!snapshot) {
    //       return []
    //     }
    //     const content = snapshot.getText(0, snapshot.getLength())
    //     wpFile.updateOriginalConfigSource(content)

    //     const diags = miniLS.getSemanticDiagnostics(wpFile.filename)
    //   }

    //   return info.languageService.getSemanticDiagnostics(fileName)
    // }

    return proxy
  }

  return { create }
}

export = init
