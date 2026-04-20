# 深入开发

> [!WIP]

## 架构

```mermaid
block
  columns 1
  数据仓库
  服务器端
  block
    数据同步服务
    数据查询服务
  end

```

## ErrorCode 设计

### 使用教程

#### 1. 定义错误码枚举

使用 `#[error]` 宏在 `framework/src/error/` 下定义枚举，或在各业务模块中定义。

**命名规则** - 枚举名称必须以 `ErrorCode` 结尾，前缀即为模块名

| 枚举名称             | 模块名    |
| -------------------- | --------- |
| `FrameworkErrorCode` | framework |
| `UserErrorCode`      | user      |

**框架级错误码** - 定义在 `framework/src/error/` 下

```rust,ignore
#[error]
pub enum FrameworkErrorCode {
    // 3xx 框架错误: 参数校验失败、无效查询等
    ValidationInvalid = 301001,
    QueryInvalid = 301002,
}
```

**业务级错误码** - 定义在各业务模块中

```rust,ignore
#[error]
pub enum UserErrorCode {
    // 5xx 业务错误
    AccountNotFound = 503001,
    OldPasswordIncorrect = 503002,
}
```

**默认 message** - 从模块名 + 变体名自动生成（空格分隔）

| 模块名    | 变体名                 | 默认消息                       |
| --------- | ---------------------- | ------------------------------ |
| user      | `AccountNotFound`      | "user account not found"       |
| user      | `OldPasswordIncorrect` | "user old password incorrect"  |
| framework | `ValidationInvalid`    | "framework validation invalid" |

**自定义 message** - 使用宏属性

```rust,ignore
#[error]
pub enum UserErrorCode {
    #[error(message = "用户不存在")]
    AccountNotFound = 503001,
}
```

---

#### 2. 在业务代码中使用

**基本用法**

```rust,ignore
return Err(UserErrorCode::AccountNotFound);
// message = "user account not found"
```

**添加 extra_message**（推荐）

```rust,ignore
return Err(UserErrorCode::AccountNotFound.with_extra("user_id=123"));
// message = "user account not found"
// extra_message = "user_id=123"
```

**使用 ? 运算符**

```rust,ignore
let user = User::find_by_id(id).await?
    .ok_or(UserErrorCode::AccountNotFound.into())?;
```

**使用 with_extra**

```rust,ignore
.ok_or(UserErrorCode::AccountNotFound.with_extra("user_id not found"))?;
```

---

#### 3. API 响应格式

```json
{
  "code": 503001,
  "message": "account not found"
}
```

---

1. 在 `error_tests!` 宏中添加新类型：

   ```rust,ignore
   error_tests! {
       FrameworkErrorCode,
       UserErrorCode,
       CompanyErrorCode,
       JobErrorCode,
       NewErrorCode,  // 添加新类型
   }
   ```

---

### 设计原理

#### 错误码分类

| 分类   | 范围          | 说明                                   | 日志级别 | 堆栈日志 | API 错误响应(StatusCode/Code/Message) |
| ------ | ------------- | -------------------------------------- | -------- | -------- | ------------------------------------- |
| 1xxyyy | 101001-199999 | 底层错误，预留                         | error    | 是       | 500/内部错误 code/内部错误            |
| 2xxyyy | 201001-299999 | 第三方错误                             | error    | 是       | 500/内部错误 code/内部错误            |
| 3xxyyy | 301001-399999 | 框架错误:如参数校验失败                | warn     | 否       | 500/内部错误 code/内部错误            |
| 4xxyyy | 401001-499999 | 关键业务错误:如多次登录错误,数据不完整 | warn     | 否       | 500/内部错误 code/内部错误            |
| 5xxyyy | 501001-599999 | 业务错误                               | info     | 否       | 400/直出/直出                         |

注意事项

- 登录错误: API 错误响应，按常规方式处理
- 参数校验失败: API 错误响应，按常规方式处理

#### 编码规则

6 位数字：`类别(1-5) + 模块(01-99) + 序号(001-999)`
