# Dump

## 数据库备份

> <https://github.com/electric-sql/pglite/tree/main/packages/pglite-tools>

> <https://github.com/electric-sql/pglite/blob/6b60fbc55c2d59eb7642d1d3f560999ec5b4ec40/packages/pglite-tools/README.md>

> 这里有pgDump的工具，但整合后报错（pg_dump failed with exit code 1），不能正常导出

1. 导出

package.json

```json
"@electric-sql/pglite-tools": "^0.2.2",
```

wxt.config.ts

```ts
copyFileSync(resolve(srcDir, "node_modules", "@electric-sql", "pglite-tools", "dist", "pg_dump.wasm"), resolve(outDir, "assets", "pg_dump.wasm"));
```

database.js

```ts
import { PGlite } from '@electric-sql/pglite'
import { pgDump } from '@electric-sql/pglite-tools/pg_dump'

const pg = await PGlite.create()

// Create a table and insert some data
await pg.exec(`
  CREATE TABLE test (
    id SERIAL PRIMARY KEY,
    name TEXT
  );
`)
await pg.exec(`
  INSERT INTO test (name) VALUES ('test');
`)

// Dump the database to a file
const dump = await pgDump({ pg })
```

2. 导入
