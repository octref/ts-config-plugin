# TS Config Plugin

Just install the [VS Code extension](https://marketplace.visualstudio.com/items?itemName=octref.vscode-ts-config-plugin).

Or, `yarn add ts-config-plugin` and put this in tsconfig:

```json
{
  "compilerOptions": {
    "plugins": [
      { "name": "ts-config-plugin" }
    ]
  }
}
```

## Demo

![demo](./vsc/media/config.gif)