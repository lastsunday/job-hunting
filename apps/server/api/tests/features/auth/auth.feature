Feature: 登录后台系统
    As a 管理员
    I want 登录系统
    So that 进行后台管理

  Scenario: 登录后台系统
    Given 含有预设的超级用户凭证信息
      | 账号 | 密码      |
      | root | Change_Me |
    When 超级用户进行登录
    Then 超级用户应该能获得访问令牌

  Scenario: 获取用户信息
    Given 超级用户的登录凭证
    When 超级用户进行个人信息查询
    Then 超级用户应该能获得个人信息

  Scenario: 刷新登录令牌
    Given 刷新令牌
    When 使用刷新令牌获取新的访问令牌和刷新令牌
    Then 获得刷新后的访问令牌和刷新令牌

  Scenario: 修改自身密码
    Given 超级用户访问令牌和用户凭证信息
      | 账号 | 密码      |
      | root | Change_Me |
    When 使用原密码和新密码进行密码修改
    Then 可以使用新密码进行登录
