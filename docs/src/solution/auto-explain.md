# auto_explain

 ``` ts
    db = new PGlite(`opfs-ahp://${JOB_DB_PATH}`, {
        extensions: { auto_explain },
        debug:1,
    });
  await db.exec(`
    LOAD 'auto_explain';
    SET auto_explain.log_min_duration = '0';
    SET auto_explain.log_analyze = 'true';
    `);
```

打开offscreen的console，可看到详细的分析日志
