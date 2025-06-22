# Entity

## Gen entity

````shell
sea-orm-cli generate entity --lib --with-serde=both --model-extra-attributes='serde(rename_all = "camelCase")' --output-dir src --database-url=postgres://postgres:changeme@127.0.0.1/postgres

```shell
sea-orm-cli generate entity --lib --with-serde=both --model-extra-attributes='serde(rename_all = "camelCase")' --output-dir src --database-url=sqlite://../db.sqlite?mode=rwc

````
