mod common;

use chrono::{Duration, Utc};
use entity::job::Entity as Job;
use entity::job_source::Entity as JobSource;
use sea_orm::EntityTrait;
use service::{common::FileParser, sync::import_job::JobImporter};

use common::{setup_database, tear_down};

const TEST_URI_V1: &str = "data://admin@system/file_hash_v1";
const TEST_URI_V2: &str = "data://admin@system/file_hash_v2";

fn format_naive_date(dt: chrono::DateTime<chrono::Utc>) -> String {
    format!("{}", dt.format("%Y-%m-%d %H:%M:%S"))
}

fn build_job_headers_with_version() -> Vec<String> {
    vec![
        "职位自编号".to_string(),
        "发布平台".to_string(),
        "职位访问地址".to_string(),
        "职位".to_string(),
        "公司".to_string(),
        "公司是否为全称".to_string(),
        "地区".to_string(),
        "地址".to_string(),
        "经度".to_string(),
        "纬度".to_string(),
        "职位描述".to_string(),
        "学历".to_string(),
        "所需经验".to_string(),
        "技能".to_string(),
        "福利".to_string(),
        "最低薪资".to_string(),
        "最高薪资".to_string(),
        "几薪".to_string(),
        "首次发布时间".to_string(),
        "招聘人".to_string(),
        "招聘公司".to_string(),
        "招聘者职位".to_string(),
        "首次扫描日期".to_string(),
        "记录更新日期".to_string(),
        "__VERSION_1".to_string(),
    ]
}

fn build_test_job_row(job_id: &str, date_str: &str) -> Vec<String> {
    vec![
        job_id.to_string(),
        "平台".to_string(),
        "https://test.com".to_string(),
        "测试职位".to_string(),
        "测试公司".to_string(),
        "是".to_string(),
        "北京".to_string(),
        "地址".to_string(),
        "1".to_string(),
        "2".to_string(),
        "描述".to_string(),
        "本科".to_string(),
        "1".to_string(),
        "技能".to_string(),
        "福利".to_string(),
        "10".to_string(),
        "20".to_string(),
        "12".to_string(),
        date_str.to_string(),
        "人".to_string(),
        "公司".to_string(),
        "职位".to_string(),
        date_str.to_string(),
        date_str.to_string(),
        "".to_string(),
    ]
}

#[tokio::test]
async fn test_import_empty_data() {
    let (container, conn) = setup_database().await;

    let result = JobImporter::import(&conn, vec![], TEST_URI_V1)
        .await
        .unwrap();

    assert!(result.success, "空数据应返回成功");
    assert!(result.valid_result, "空数据应返回有效结果");
    assert!(result.errors.is_empty(), "空数据不应有错误");
    assert_eq!(result.total, 0, "总行数应为0");
    assert_eq!(result.imported, 0, "导入数应为0");
    assert_eq!(result.updated, 0, "更新数应为0");
    assert!(result.lack_columns.is_empty(), "空数据不应缺少字段");

    conn.close().await.unwrap();
    tear_down(&container).await;
}

#[tokio::test]
async fn test_import_invalid_headers() {
    let (container, conn) = setup_database().await;

    let invalid_data = vec![vec!["职位自编号".to_string()]];

    let result = JobImporter::import(&conn, invalid_data, TEST_URI_V1)
        .await
        .unwrap();

    assert!(!result.success, "无效表头应返回失败");
    assert!(!result.valid_result, "应返回无效结果");
    assert!(!result.errors.is_empty(), "应有错误信息");
    assert!(!result.lack_columns.is_empty(), "应列出缺少的字段");

    conn.close().await.unwrap();
    tear_down(&container).await;
}

#[tokio::test]
async fn test_import_success_new_jobs() {
    let (container, conn) = setup_database().await;

    let data = std::fs::read("tests/resources/data/job-v1.xlsx").unwrap();
    let parsed_data = FileParser::parse_excel(&data).unwrap();

    let row_count = parsed_data.len() - 1;
    assert_eq!(row_count, 180, "Excel 应有180条数据");

    let result = JobImporter::import(&conn, parsed_data, TEST_URI_V1)
        .await
        .unwrap();

    assert!(result.success, "导入应成功");
    assert!(result.errors.is_empty(), "不应有错误");
    assert!(result.warnings.is_empty(), "不应有警告");
    assert!(result.valid_result, "应返回有效结果");
    assert_eq!(result.total, 180, "总行数应为180");
    assert_eq!(result.imported, 180, "应导入180条");
    assert_eq!(result.updated, 0, "首次导入无更新");

    let jobs = Job::find().all(&conn).await.unwrap();
    assert_eq!(jobs.len(), 180, "Job 表应有180条记录");

    let job_sources = JobSource::find().all(&conn).await.unwrap();
    assert_eq!(job_sources.len(), 180, "JobSource 表应有180条记录");

    let first_job = jobs.first().unwrap();
    assert!(!first_job.id.is_empty(), "id should not be empty");
    assert!(first_job.name.is_some());
    assert!(first_job.company_name.is_some());
    assert!(first_job.publish_datetime.is_some());

    conn.close().await.unwrap();
    tear_down(&container).await;
}

#[tokio::test]
async fn test_import_update_existing_jobs() {
    let (container, conn) = setup_database().await;

    let now = Utc::now();
    let old_date_str = format_naive_date(now - Duration::days(10));
    let new_date_str = format_naive_date(now - Duration::days(1));

    let initial_data = vec![
        build_job_headers_with_version(),
        build_test_job_row("job_update_001", &old_date_str),
    ];
    let result1 = JobImporter::import(&conn, initial_data, TEST_URI_V1)
        .await
        .unwrap();
    assert_eq!(result1.imported, 1, "首次导入应有1条插入");
    assert_eq!(result1.updated, 0);

    let update_data = vec![
        build_job_headers_with_version(),
        vec![
            "job_update_001".to_string(),
            "BOSS直聘".to_string(),
            "https://new.com".to_string(),
            "更新后职位".to_string(),
            "新公司名".to_string(),
            "是".to_string(),
            "上海".to_string(),
            "新地址".to_string(),
            "3".to_string(),
            "4".to_string(),
            "新描述".to_string(),
            "硕士".to_string(),
            "2".to_string(),
            "新技能".to_string(),
            "新福利".to_string(),
            "30".to_string(),
            "50".to_string(),
            "12".to_string(),
            new_date_str.clone(),
            "新人".to_string(),
            "新公司".to_string(),
            "新职位".to_string(),
            new_date_str.clone(),
            new_date_str.clone(),
            "".to_string(),
        ],
    ];

    let result2 = JobImporter::import(&conn, update_data, TEST_URI_V2)
        .await
        .unwrap();

    assert!(result2.success, "更新导入应成功");
    assert_eq!(result2.imported, 0, "更新时无新插入");
    assert_eq!(result2.updated, 1, "应有1条更新");

    let job_after = Job::find_by_id("job_update_001")
        .one(&conn)
        .await
        .unwrap()
        .unwrap();

    assert_eq!(job_after.name.unwrap(), "更新后职位", "职位名应更新");
    assert_eq!(job_after.company_name.unwrap(), "新公司名", "公司名应更新");

    conn.close().await.unwrap();
    tear_down(&container).await;
}

#[tokio::test]
async fn test_import_mixed_new_and_update() {
    let (container, conn) = setup_database().await;

    let now = Utc::now();
    let old_date_str = format_naive_date(now - Duration::days(10));
    let new_date_str = format_naive_date(now - Duration::days(5));

    let initial_data = vec![
        build_job_headers_with_version(),
        build_test_job_row("job_mixed_001", &old_date_str),
    ];
    let result1 = JobImporter::import(&conn, initial_data, TEST_URI_V1)
        .await
        .unwrap();
    assert_eq!(result1.imported, 1);

    let mixed_data = vec![
        build_job_headers_with_version(),
        vec![
            "job_mixed_001".to_string(),
            "平台A".to_string(),
            "https://a.com".to_string(),
            "更新后职位".to_string(),
            "公司A".to_string(),
            "是".to_string(),
            "北京".to_string(),
            "街道".to_string(),
            "1".to_string(),
            "2".to_string(),
            "描述".to_string(),
            "本科".to_string(),
            "1".to_string(),
            "技能".to_string(),
            "福利".to_string(),
            "10".to_string(),
            "20".to_string(),
            "12".to_string(),
            new_date_str.clone(),
            "人".to_string(),
            "公司".to_string(),
            "职位".to_string(),
            new_date_str.clone(),
            new_date_str.clone(),
            "".to_string(),
        ],
        vec![
            "job_mixed_002".to_string(),
            "平台B".to_string(),
            "https://b.com".to_string(),
            "新职位".to_string(),
            "公司B".to_string(),
            "是".to_string(),
            "上海".to_string(),
            "路".to_string(),
            "3".to_string(),
            "4".to_string(),
            "描述2".to_string(),
            "大专".to_string(),
            "2".to_string(),
            "技能2".to_string(),
            "福利2".to_string(),
            "15".to_string(),
            "25".to_string(),
            "12".to_string(),
            new_date_str.clone(),
            "人2".to_string(),
            "公司2".to_string(),
            "职位2".to_string(),
            new_date_str.clone(),
            new_date_str.clone(),
            "".to_string(),
        ],
    ];

    let result2 = JobImporter::import(&conn, mixed_data, TEST_URI_V2)
        .await
        .unwrap();

    assert!(result2.success);
    assert_eq!(result2.imported, 1, "应有1条插入");
    assert_eq!(result2.updated, 1, "应有1条更新");
    assert_eq!(result2.total, 2);

    let jobs = Job::find().all(&conn).await.unwrap();
    assert_eq!(jobs.len(), 2, "应有2条job记录");

    conn.close().await.unwrap();
    tear_down(&container).await;
}

#[tokio::test]
async fn test_import_update_rule_publish_datetime() {
    let (container, conn) = setup_database().await;

    let now = Utc::now();
    let old_date_str = format_naive_date(now - Duration::days(30));
    let new_date_str = format_naive_date(now - Duration::days(1));

    let initial_data = vec![
        build_job_headers_with_version(),
        build_test_job_row("rule_test_001", &old_date_str),
    ];
    JobImporter::import(&conn, initial_data, TEST_URI_V1)
        .await
        .unwrap();

    let update_data = vec![
        build_job_headers_with_version(),
        vec![
            "rule_test_001".to_string(),
            "平台".to_string(),
            "https://x.com".to_string(),
            "新职位名".to_string(),
            "新公司".to_string(),
            "是".to_string(),
            "北京".to_string(),
            "地址".to_string(),
            "1".to_string(),
            "2".to_string(),
            "新描述".to_string(),
            "本科".to_string(),
            "3".to_string(),
            "技能".to_string(),
            "福利".to_string(),
            "20".to_string(),
            "30".to_string(),
            "12".to_string(),
            new_date_str.clone(),
            "人".to_string(),
            "公司".to_string(),
            "职位".to_string(),
            new_date_str.clone(),
            new_date_str.clone(),
            "".to_string(),
        ],
    ];

    let result = JobImporter::import(&conn, update_data, TEST_URI_V2)
        .await
        .unwrap();

    assert_eq!(result.imported, 0);
    assert_eq!(result.updated, 1, "规则1触发时应有1条更新");

    let updated_job = Job::find_by_id("rule_test_001")
        .one(&conn)
        .await
        .unwrap()
        .unwrap();

    assert_eq!(updated_job.name.unwrap(), "新职位名", "职位名应更新");
    assert_eq!(updated_job.description.unwrap(), "新描述", "描述应更新");

    conn.close().await.unwrap();
    tear_down(&container).await;
}

#[tokio::test]
async fn test_import_update_rule_company_full_name() {
    let (container, conn) = setup_database().await;

    let now = Utc::now();
    let date_str = format_naive_date(now - Duration::days(10));

    let initial_data = vec![
        build_job_headers_with_version(),
        vec![
            "rule_test_002".to_string(),
            "平台".to_string(),
            "https://x.com".to_string(),
            "职位".to_string(),
            "腾讯".to_string(),
            "否".to_string(),
            "深圳".to_string(),
            "地址".to_string(),
            "1".to_string(),
            "2".to_string(),
            "描述".to_string(),
            "本科".to_string(),
            "1".to_string(),
            "技能".to_string(),
            "福利".to_string(),
            "20".to_string(),
            "30".to_string(),
            "12".to_string(),
            date_str.clone(),
            "人".to_string(),
            "公司".to_string(),
            "职位".to_string(),
            date_str.clone(),
            date_str.clone(),
            "".to_string(),
        ],
    ];
    JobImporter::import(&conn, initial_data, TEST_URI_V1)
        .await
        .unwrap();

    let update_data = vec![
        build_job_headers_with_version(),
        vec![
            "rule_test_002".to_string(),
            "平台".to_string(),
            "https://x.com".to_string(),
            "职位".to_string(),
            "深圳市腾讯计算机系统有限公司".to_string(),
            "是".to_string(),
            "深圳".to_string(),
            "地址".to_string(),
            "1".to_string(),
            "2".to_string(),
            "描述".to_string(),
            "本科".to_string(),
            "1".to_string(),
            "技能".to_string(),
            "福利".to_string(),
            "20".to_string(),
            "30".to_string(),
            "12".to_string(),
            date_str.clone(),
            "人".to_string(),
            "公司".to_string(),
            "职位".to_string(),
            date_str.clone(),
            date_str.clone(),
            "".to_string(),
        ],
    ];

    let result = JobImporter::import(&conn, update_data, TEST_URI_V2)
        .await
        .unwrap();

    assert_eq!(result.updated, 1, "规则2触发时应有1条更新");

    let updated_job = Job::find_by_id("rule_test_002")
        .one(&conn)
        .await
        .unwrap()
        .unwrap();

    assert!(updated_job.is_full_company_name.unwrap(), "应更新为全称");
    assert_eq!(
        updated_job.company_name.unwrap(),
        "深圳市腾讯计算机系统有限公司",
        "公司名应更新"
    );

    conn.close().await.unwrap();
    tear_down(&container).await;
}

#[tokio::test]
async fn test_import_update_rule_first_scan_datetime() {
    let (container, conn) = setup_database().await;

    let now = Utc::now();
    let old_date_str = format_naive_date(now - Duration::days(20));
    let new_date_str = format_naive_date(now - Duration::days(10));

    let initial_data = vec![
        build_job_headers_with_version(),
        build_test_job_row("rule_test_003", &old_date_str),
    ];
    let initial_result = JobImporter::import(&conn, initial_data, TEST_URI_V1)
        .await
        .unwrap();
    assert_eq!(initial_result.imported, 1);
    assert_eq!(initial_result.updated, 0);

    let initial_job = Job::find_by_id("rule_test_003")
        .one(&conn)
        .await
        .unwrap()
        .unwrap();
    let initial_first_scan = initial_job.first_scan_datetime.unwrap();

    let update_data = vec![
        build_job_headers_with_version(),
        vec![
            "rule_test_003".to_string(),
            "平台".to_string(),
            "https://x.com".to_string(),
            "职位".to_string(),
            "公司".to_string(),
            "是".to_string(),
            "北京".to_string(),
            "地址".to_string(),
            "1".to_string(),
            "2".to_string(),
            "描述".to_string(),
            "本科".to_string(),
            "1".to_string(),
            "技能".to_string(),
            "福利".to_string(),
            "20".to_string(),
            "30".to_string(),
            "12".to_string(),
            new_date_str.clone(),
            "人".to_string(),
            "公司".to_string(),
            "职位".to_string(),
            new_date_str.clone(),
            new_date_str.clone(),
            "".to_string(),
        ],
    ];

    let result = JobImporter::import(&conn, update_data, TEST_URI_V2)
        .await
        .unwrap();

    assert_eq!(result.imported, 0);
    assert_eq!(result.updated, 1, "规则3触发时应有1条更新");

    let updated_job = Job::find_by_id("rule_test_003")
        .one(&conn)
        .await
        .unwrap()
        .unwrap();

    assert_eq!(
        updated_job.first_scan_datetime.unwrap(),
        initial_first_scan,
        "首次扫描时间应取更早的值"
    );

    conn.close().await.unwrap();
    tear_down(&container).await;
}

#[tokio::test]
async fn test_import_job_same_uri_duplicate() {
    let (container, conn) = setup_database().await;

    let now = Utc::now();
    let date_str = format_naive_date(now - Duration::days(10));

    let initial_data = vec![
        build_job_headers_with_version(),
        build_test_job_row("job_dup_001", &date_str),
    ];
    let result1 = JobImporter::import(&conn, initial_data, TEST_URI_V1)
        .await
        .unwrap();
    assert_eq!(result1.imported, 1, "首次导入应有1条插入");

    let duplicate_data = vec![
        build_job_headers_with_version(),
        build_test_job_row("job_dup_001", &date_str),
    ];
    let result2 = JobImporter::import(&conn, duplicate_data, TEST_URI_V1)
        .await
        .unwrap();

    assert_eq!(result2.imported, 0, "相同URI+相同job_id不应重复导入");
    assert_eq!(result2.updated, 0, "相同数据不应更新");

    let sources = JobSource::find().all(&conn).await.unwrap();
    assert_eq!(sources.len(), 1, "JobSource应为1条");

    conn.close().await.unwrap();
    tear_down(&container).await;
}

#[tokio::test]
async fn test_import_job_invalid_number_format() {
    let (container, conn) = setup_database().await;

    let now = Utc::now();
    let date_str = format_naive_date(now - Duration::days(10));

    let mut data = vec![
        build_job_headers_with_version(),
        build_test_job_row("job_invalid_001", &date_str),
    ];

    data[1][15] = "面议".to_string();

    let result = JobImporter::import(&conn, data, TEST_URI_V1).await.unwrap();

    println!(
        "Result: success={}, errors={:?}",
        result.success, result.errors
    );
    assert!(!result.success, "数字格式错误应返回失败");
    assert!(!result.errors.is_empty(), "应有错误信息");

    conn.close().await.unwrap();
    tear_down(&container).await;
}
