# Commit Message

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]

提交说明包含了下面的结构化元素，以向类库使用者表明其意图：

    fix: 类型 为 fix 的提交表示在代码库中修复了一个 bug（这和语义化版本中的 PATCH 相对应）。
    feat: 类型 为 feat 的提交表示在代码库中新增了一个功能（这和语义化版本中的 MINOR 相对应）。
    BREAKING CHANGE: 在脚注中包含 BREAKING CHANGE: 或 <类型>(范围) 后面有一个 ! 的提交，表示引入了破坏性 API 变更（这和语义化版本中的 MAJOR 相对应）。 破坏性变更可以是任意 类型 提交的一部分。
    除 fix: 和 feat: 之外，也可以使用其它提交 类型 ，例如 @commitlint/config-conventional（基于 Angular 约定）中推荐的 build:、chore:、 ci:、docs:、style:、refactor:、perf:、test:，等等。
    build: 用于修改项目构建系统，例如修改依赖库、外部接口或者升级 Node 版本等；
    chore: 用于对非业务性代码进行修改，例如修改构建流程或者工具配置等；
    ci: 用于修改持续集成流程，例如修改 Travis、Jenkins 等工作流配置；
    docs: 用于修改文档，例如修改 README 文件、API 文档等；
    style: 用于修改代码的样式，例如调整缩进、空格、空行等；
    refactor: 用于重构代码，例如修改代码结构、变量名、函数名等但不修改功能逻辑；
    perf: 用于优化性能，例如提升代码的性能、减少内存占用等；
    test: 用于修改测试用例，例如添加、删除、修改代码的测试用例等。
    脚注中除了 BREAKING CHANGE: <description> ，其它条目应该采用类似 git trailer format 这样的惯例。
    其它提交类型在约定式提交规范中并没有强制限制，并且在语义化版本中没有隐式影响（除非它们包含 BREAKING CHANGE）。 可以为提交类型添加一个围在圆括号内的范围，以为其提供额外的上下文信息。例如 feat(parser): adds ability to parse arrays.。
    特别地：
        bump: v1.1.0，代表发布版本
```


# Version

```
版本格式：主版本号.次版本号.修订号，版本号递增规则如下：

主版本号：当你做了不兼容的 API 修改，
次版本号：当你做了向下兼容的功能性新增，
修订号：当你做了向下兼容的问题修正。
先行版本号及版本编译信息可以加到“主版本号.次版本号.修订号”的后面，作为延伸。
```

# Reference

- <https://keepachangelog.com/zh-CN/1.1.0/>
- <https://github.com/angular/angular/blob/main/CONTRIBUTING.md#-commit-message-format>
- <https://www.conventionalcommits.org/zh-hans/v1.0.0/>
- <https://semver.org/lang/zh-CN/>
