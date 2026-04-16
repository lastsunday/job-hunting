mod common;

use entity::company::Entity as Company;
use entity::company_source::Entity as CompanySource;
use sea_orm::EntityTrait;
use service::sync::file_parser::FileParser;
use service::sync::import_company::CompanyImporter;

use common::{setup_database, tear_down};

const TEST_URI_V1: &str = "data://admin@system/file_hash_v1";
const TEST_URI_V2: &str = "data://admin@system/file_hash_v2";

#[tokio::test]
async fn test_import_company_empty_data() {
    let (container, state) = setup_database().await;

    let result = CompanyImporter::import(&state.conn, vec![], TEST_URI_V1)
        .await
        .unwrap();

    assert!(result.success, "空数据应返回成功");
    assert!(result.valid_result, "空数据应返回有效结果");
    assert!(result.errors.is_empty(), "空数据不应有错误");
    assert_eq!(result.total, 0, "总行数应为0");
    assert_eq!(result.imported, 0, "导入数应为0");
    assert_eq!(result.updated, 0, "更新数应为0");
    assert!(result.lack_columns.is_empty(), "空数据不应缺少字段");

    let _ = state.conn.close().await.unwrap();
    tear_down(&container).await;
}

#[tokio::test]
async fn test_import_company_invalid_headers() {
    let (container, state) = setup_database().await;

    let invalid_data = vec![vec!["公司".to_string()]];

    let result = CompanyImporter::import(&state.conn, invalid_data, TEST_URI_V1)
        .await
        .unwrap();

    assert!(!result.success, "无效表头应返回失败");
    assert!(!result.valid_result, "应返回无效结果");
    assert!(!result.errors.is_empty(), "应有错误信息");

    let _ = state.conn.close().await.unwrap();
    tear_down(&container).await;
}

#[tokio::test]
async fn test_import_company_success() {
    let (container, state) = setup_database().await;

    let data = std::fs::read("tests/resources/data/company-v2.xlsx").unwrap();
    let parsed_data = FileParser::parse_excel(&data).unwrap();

    let row_count = parsed_data.len() - 1;
    println!("Excel 行数: {}", row_count);

    let result = CompanyImporter::import(&state.conn, parsed_data, TEST_URI_V1)
        .await
        .unwrap();

    assert!(result.success, "导入应成功");
    assert!(result.errors.is_empty(), "不应有错误");
    assert!(result.valid_result, "应返回有效结果");
    assert!(result.updated == 0, "首次导入无更新");

    let companys = Company::find().all(&state.conn).await.unwrap();
    println!("Company 表记录数: {}", companys.len());

    let company_sources = CompanySource::find().all(&state.conn).await.unwrap();
    println!("CompanySource 表记录数: {}", company_sources.len());

    let first_company = companys.first().unwrap();
    assert!(!first_company.id.is_empty(), "id should not be empty");
    assert!(first_company.name.is_some(), "name should exist");

    let _ = state.conn.close().await.unwrap();
    tear_down(&container).await;
}

#[tokio::test]
async fn test_import_company_update() {
    let (container, state) = setup_database().await;

    let data = std::fs::read("tests/resources/data/company-v2.xlsx").unwrap();
    let parsed_data = FileParser::parse_excel(&data).unwrap();

    // 第一次导入
    let result1 = CompanyImporter::import(&state.conn, parsed_data.clone(), TEST_URI_V1)
        .await
        .unwrap();
    assert!(result1.success);
    let initial_count = result1.imported;
    println!("首次导入: {} 条", initial_count);

    // 第二次导入不同URI
    let result2 = CompanyImporter::import(&state.conn, parsed_data, TEST_URI_V2)
        .await
        .unwrap();

    assert!(result2.success, "更新导入应成功");
    println!("第二次导入: imported={}, updated={}", result2.imported, result2.updated);

    // 由于使用不同的URI，会创建新的 company_source，可能触发更新
    let companys = Company::find().all(&state.conn).await.unwrap();
    println!("Company 表记录数: {}", companys.len());

    let company_sources = CompanySource::find().all(&state.conn).await.unwrap();
    println!("CompanySource 表记录数: {}", company_sources.len());

    let _ = state.conn.close().await.unwrap();
    tear_down(&container).await;
}
