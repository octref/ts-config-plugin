import { Project, ScriptTarget, SourceFile } from 'ts-simple-ast'
import { ModuleKind, ModuleResolutionKind } from 'typescript/lib/tsserverlibrary'

export class WebpackSemanticErrorEmitter {
  private project: Project
  private sf: SourceFile;

  constructor() {
    this.project = new Project({
      compilerOptions: {
        target: ScriptTarget.ES2015,
        module: ModuleKind.CommonJS,
        moduleResolution: ModuleResolutionKind.NodeJs,
        allowSyntheticDefaultImports: true
      }
    })
    this.sf = this.project.createSourceFile('____webpack.ts', '')
  }

  getWebpackDiagnostics(fakeSource: string) {
    this.sf.removeText()
    this.sf.insertText(0, fakeSource)

    return this.project.getPreEmitDiagnostics()
  }
}
