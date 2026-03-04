# FAQ

## 1. 报错 No more file handles available in the pool

如果在 Linux 下，请使用命令 _ulimit -n_ 检查 soft file descriptor 的值，一般默认为 1024 或 2048,请设定一个较高的值如 9001
