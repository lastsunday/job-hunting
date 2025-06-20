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
