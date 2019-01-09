import * as fs from 'fs'
import * as path from 'path'

const logPath = path.resolve(__dirname, '../log.txt')

export function log(msg: any) {
  fs.appendFileSync(logPath, '\n=====\n')
  if (typeof msg === 'string') {
    fs.appendFileSync(logPath, msg) + '\n'
  } else {
    fs.appendFileSync(logPath, JSON.stringify(msg, null, 2) + '\n')
  }
}
