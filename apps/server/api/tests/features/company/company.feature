Feature: 公司管理
  公司创建和更新功能测试

  Scenario: 创建公司 - 仅名称
    When 小明创建公司
    Then 小明应该能看到公司创建成功

  Scenario: 创建公司 - 完整信息
    When 小明创建完整公司信息
      | name | desc | status | industry |
      | 史伟莎管理咨询(上海)有限公司深圳分公司 | 测试描述 | 开业 | 批发业 |
    Then 小明应该能看到公司创建成功

  Scenario: 创建公司 - 无名称失败
    When 小明创建公司无名称
    Then 小明应该能看到公司创建失败

  Scenario: 更新公司
    Given 已创建的公司表
      | name | desc | status |
      | 史伟莎管理咨询(上海)有限公司深圳分公司 | 描述1 | 开业 |
    When 小明更新公司信息
      | desc |
      | 更新后的描述 |
    Then 小明应该能看到公司更新成功

  Scenario: 更新公司 - 修改名称失败
    Given 已创建的公司表
      | name | desc | status |
      | 史伟莎管理咨询(上海)有限公司深圳分公司 | 描述1 | 开业 |
    When 小明尝试修改公司名称
      | name |
      | 腾讯科技 |
    Then 小明应该能看到公司更新失败

  Scenario: 查询公司 - 按名称搜索
    Given 已创建的公司表
      | name | desc | status |
      | 史伟莎管理咨询(上海)有限公司深圳分公司 | 描述1 | 开业 |
      | 广东温氏南方家禽育种有限公司 | 描述2 | 开业 |
    When 小明搜索公司
      | name |
      | 史伟莎 |
    Then 小明应该能看到公司搜索成功
    And 小明应该能看到搜索结果包含公司名称
      | name |
      | 史伟莎管理咨询(上海)有限公司深圳分公司 |

  Scenario: 查询公司 - 按行业筛选
    Given 已创建的公司表
      | name | desc | status |
      | 史伟莎管理咨询(上海)有限公司深圳分公司 | 描述1 | 开业 |
    When 小明搜索公司
      | industry |
      | 批发业 |
    Then 小明应该能看到公司搜索成功

  Scenario: 查询公司 - 按经营状态筛选
    Given 已创建的公司表
      | name | desc | status |
      | 史伟莎管理咨询(上海)有限公司深圳分公司 | 描述1 | 开业 |
      | 广东温氏南方家禽育种有限公司 | 描述2 | 注销 |
    When 小明搜索公司
      | status |
      | 开业 |
    Then 小明应该能看到公司搜索成功

  Scenario: 查询公司 - 分页
    Given 已创建的公司表
      | name | desc | status |
      | 史伟莎管理咨询(上海)有限公司深圳分公司 | 描述1 | 开业 |
      | 广东温氏南方家禽育种有限公司 | 描述2 | 开业 |
    When 小明搜索公司分页
      | num | size |
      | 1 | 1 |
    Then 小明应该能看到公司搜索成功

  Scenario: 查询公司 - 排序
    Given 已创建的公司表
      | name | desc | status |
      | 史伟莎管理咨询(上海)有限公司深圳分公司 | 描述1 | 开业 |
      | 广东温氏南方家禽育种有限公司 | 描述2 | 开业 |
    When 小明搜索公司排序
      | order_by | order_dir |
      | name | asc |
    Then 小明应该能看到公司搜索成功
    And 小明应该能看到搜索结果按名称排序

  Scenario: 获取公司详情
    Given 已创建的公司表
      | name | desc | status |
      | 史伟莎管理咨询(上海)有限公司深圳分公司 | 描述1 | 开业 |
    When 小明获取公司详情
    Then 小明应该能看到公司详情返回成功

  Scenario: 获取公司详情 - 不存在
    When 小明获取不存在的公司详情
    Then 小明应该能看到公司详情返回失败

  Scenario: 删除公司
    Given 已创建的公司表
      | name | desc | status |
      | 史伟莎管理咨询(上海)有限公司深圳分公司 | 描述1 | 开业 |
    When 小明删除公司
    Then 小明应该能看到公司删除成功

  Scenario: 删除公司 - 不存在
    When 小明删除不存在的公司
    Then 小明应该能看到公司删除失败

  Scenario: 查询公司 - 按地址筛选
    Given 已创建的公司表
      | name | address |
      | 腾讯科技 | 深圳市南山区 |
      | 阿里云 | 杭州市余杭区 |
    When 小明搜索公司
      | address |
      | 深圳 |
    Then 小明应该能看到公司搜索成功
    And 小明应该能看到搜索结果包含地址
      | address |
      | 深圳市南山区 |

  Scenario: 多条件组合搜索
    Given 已创建的公司表
      | name | industry | status |
      | 腾讯科技 | 互联网 | 开业 |
      | 阿里云 | 互联网 | 注销 |
      | 工商银行 | 金融 | 开业 |
    When 小明搜索公司
      | industry | status |
      | 互联网 | 开业 |
    Then 小明应该能看到公司搜索成功
    And 小明应该能看到搜索结果包含行业
      | industry |
      | 互联网 |
