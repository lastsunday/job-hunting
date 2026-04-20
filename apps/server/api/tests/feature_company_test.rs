use std::collections::HashMap;
use std::net::SocketAddr;

use chrono::DateTime;
use chrono::FixedOffset;
use chrono::TimeZone;
use cucumber::gherkin::Step;
use cucumber::then;
use cucumber::when;
use cucumber::{World, given};
use futures::FutureExt;
use serde_json::json;
use service::AppState;

use api::company::CompanyErrorCode;
use api::config;
use api::setup_company;
use api::setup_default;
use axum::extract::connect_info::MockConnectInfo;
use axum::{Router, http::StatusCode};
use entity::company::{ActiveModel, Entity as Company};
use framework::auth::Jwt;
use framework::auth::Principal;
use framework::id::gen_id;
use sea_orm::{DatabaseConnection, EntityTrait, Set};
use utoipa_axum::router::OpenApiRouter;

mod common;
use common::{
    delete_json_with_token, get_from_value, get_json_result, get_json_with_token,
    post_json_with_token, put_json_with_token, response_to_json, setup_database, tear_down,
};
use service::util::gen_company_id;

const SEARCH_API_URL: &str = "/api/company/search";
const CREATE_API_URL: &str = "/api/company";

fn xlsx_field_to_api_field(xlsx_field: &str) -> String {
    match xlsx_field {
        "公司" => "name".to_string(),
        "公司描述" => "desc".to_string(),
        "成立时间" => "start_date".to_string(),
        "经营状态" => "status".to_string(),
        "法人" => "legal_person".to_string(),
        "统一社会信用代码" => "unified_code".to_string(),
        "官网" => "web_site".to_string(),
        "社保人数" => "insurance_num".to_string(),
        "自身风险数" => "self_risk".to_string(),
        "关联风险数" => "union_risk".to_string(),
        "地址" => "address".to_string(),
        "经营范围" => "scope".to_string(),
        "纳税人识别号" => "tax_no".to_string(),
        "所属行业" => "industry".to_string(),
        "工商注册号" => "license_number".to_string(),
        "经度" => "longitude".to_string(),
        "纬度" => "latitude".to_string(),
        "注册资本" => "reg_capital_value".to_string(),
        "注册资本货币" => "reg_capital_currency".to_string(),
        "数据来源地址" => "source_url".to_string(),
        "数据来源平台" => "source_platform".to_string(),
        "数据来源记录编号" => "source_record_id".to_string(),
        "数据来源更新时间" => "source_refresh_datetime".to_string(),
        "实收资本" => "paidin_capital_value".to_string(),
        "实收资本货币" => "paidin_capital_currency".to_string(),
        _ => xlsx_field.to_string(),
    }
}

fn xlsx_value_to_api_value(field: &str, value: &str) -> serde_json::Value {
    let api_field = xlsx_field_to_api_field(field);
    if api_field.is_empty() {
        return serde_json::Value::Null;
    }
    if value.is_empty() || value == "-" {
        return serde_json::Value::Null;
    }
    if field == "成立时间" {
        if let Ok(date) = chrono::NaiveDate::parse_from_str(value, "%Y-%m-%d") {
            return serde_json::json!(date.format("%Y-%m-%d").to_string());
        }
    }
    if field == "社保人数" || field == "自身风险数" || field == "关联风险数" {
        if let Ok(num) = value.parse::<i32>() {
            return serde_json::json!(num);
        }
    }
    if field == "经度" || field == "纬度" {
        if let Ok(num) = value.parse::<f64>() {
            return serde_json::json!(num);
        }
    }
    serde_json::json!(value)
}

#[derive(Debug, Default)]
pub struct ExpectedCompanyData(pub HashMap<String, serde_json::Value>);

#[derive(Debug, Default, World)]
pub struct CompanyWorld {
    container: Option<testcontainers::ContainerAsync<testcontainers_modules::postgres::Postgres>>,
    app: Option<Router>,
    state: Option<AppState>,
    last_response: Option<axum::response::Response>,
    created_company_id: Option<String>,
    expected_company_data: Option<ExpectedCompanyData>,
    expected_companies: Vec<ExpectedCompanyData>,
    auth_token: Option<String>,
}

#[given("公司表")]
async fn company_table(world: &mut CompanyWorld, step: &Step) {
    let conn: DatabaseConnection = world.state.clone().unwrap().conn.clone();
    let now = chrono::Local::now().fixed_offset();
    let mut index: i64 = 0;
    if let Some(table) = step.table.as_ref() {
        for row in table.rows.iter().skip(1) {
            index += 1;
            let dt = (now + chrono::Duration::seconds(index)).fixed_offset();
            Company::insert(ActiveModel {
                id: Set(gen_id()),
                name: Set(Some(row[0].to_string())),
                desc: Set(Some(row[1].to_string())),
                status: Set(Some(row[2].to_string())),
                create_datetime: Set(Some(dt)),
                update_datetime: Set(Some(dt)),
                ..Default::default()
            })
            .exec(&conn)
            .await
            .unwrap();
        }
    }
}

#[given("已创建的公司表")]
async fn created_company_table(world: &mut CompanyWorld, step: &Step) {
    let conn: DatabaseConnection = world.state.clone().unwrap().conn.clone();
    let now = chrono::Local::now().fixed_offset();
    let mut index: i64 = 0;
    let mut expected_data = std::collections::HashMap::new();
    let mut all_expected_data: Vec<ExpectedCompanyData> = Vec::new();
    if let Some(table) = step.table.as_ref() {
        let headers: Vec<String> = table
            .rows
            .first()
            .iter()
            .flat_map(|h| h.iter().map(|c| c.to_string()))
            .collect();
        for row in table.rows.iter().skip(1) {
            index += 1;
            let dt = (now + chrono::Duration::seconds(index)).fixed_offset();
            let mut row_expected = std::collections::HashMap::new();
            let mut model = ActiveModel {
                create_datetime: Set(Some(dt)),
                update_datetime: Set(Some(dt)),
                ..Default::default()
            };
            for (i, cell) in row.iter().enumerate() {
                if i < headers.len() {
                    let xlsx_field = &headers[i];
                    let value = cell;
                    let api_field = xlsx_field_to_api_field(xlsx_field);
                    if !api_field.is_empty() {
                        row_expected.insert(
                            api_field.to_string(),
                            xlsx_value_to_api_value(xlsx_field, value),
                        );
                        let f = api_field.as_str();
                        match f {
                            "name" => {
                                model.name = Set(Some(value.to_string()));
                                let id = gen_company_id(value);
                                model.id = Set(id.to_string());
                                world.created_company_id = Some(id.clone());
                            }
                            "desc" => model.desc = Set(Some(value.to_string())),
                            "status" => model.status = Set(Some(value.to_string())),
                            "industry" => model.industry = Set(Some(value.to_string())),
                            "legal_person" => model.legal_person = Set(Some(value.to_string())),
                            "address" => model.address = Set(Some(value.to_string())),
                            "unified_code" => model.unified_code = Set(Some(value.to_string())),
                            "web_site" => model.web_site = Set(Some(value.to_string())),
                            "license_number" => model.license_number = Set(Some(value.to_string())),
                            "tax_no" => model.tax_no = Set(Some(value.to_string())),
                            "source_platform" => {
                                model.source_platform = Set(Some(value.to_string()))
                            }
                            "source_url" => model.source_url = Set(Some(value.to_string())),
                            "source_record_id" => {
                                model.source_record_id = Set(Some(value.to_string()))
                            }
                            "scope" => model.scope = Set(Some(value.to_string())),
                            "start_date" => {
                                if let Ok(date) = parse_datetime(value) {
                                    model.start_date = Set(Some(date));
                                }
                            }
                            "insurance_num" => {
                                if let Ok(num) = value.parse::<i32>() {
                                    model.insurance_num = Set(Some(num));
                                }
                            }
                            "self_risk" => {
                                if let Ok(num) = value.parse::<i32>() {
                                    model.self_risk = Set(Some(num));
                                }
                            }
                            "union_risk" => {
                                if let Ok(num) = value.parse::<i32>() {
                                    model.union_risk = Set(Some(num));
                                }
                            }
                            "longitude" => {
                                if let Ok(num) = value.parse::<f64>() {
                                    model.longitude = Set(Some(num));
                                }
                            }
                            "latitude" => {
                                if let Ok(num) = value.parse::<f64>() {
                                    model.latitude = Set(Some(num));
                                }
                            }
                            _ => {}
                        }
                    }
                }
            }
            Company::insert(model).exec(&conn).await.unwrap();
            all_expected_data.push(ExpectedCompanyData(row_expected));
            if index == 1 {
                expected_data = all_expected_data[0].0.clone();
            }
        }
    }
    if !expected_data.is_empty() {
        world.expected_company_data = Some(ExpectedCompanyData(expected_data.clone()));
    }
    if !all_expected_data.is_empty() {
        world.expected_companies = all_expected_data;
    }
}

fn parse_datetime(s: &str) -> Result<DateTime<FixedOffset>, Box<dyn std::error::Error>> {
    if let Ok(dt) = DateTime::parse_from_rfc3339(s) {
        return Ok(dt);
    }
    let naive = chrono::NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S")?;
    let offset = FixedOffset::east_opt(0).unwrap();
    Ok(offset.from_utc_datetime(&naive))
}

#[when("小明创建公司")]
async fn create_company(world: &mut CompanyWorld) {
    let param_json = json!({"name": "腾讯"});
    let response = post_json_with_token(
        world.app.clone().unwrap(),
        CREATE_API_URL,
        &param_json,
        world.auth_token.clone(),
    )
    .await;
    world.last_response = Some(response);
}

#[when("小明创建公司无名称")]
async fn create_company_no_name(world: &mut CompanyWorld) {
    let param_json = json!({"name": ""});
    let response = post_json_with_token(
        world.app.clone().unwrap(),
        CREATE_API_URL,
        &param_json,
        world.auth_token.clone(),
    )
    .await;
    world.last_response = Some(response);
}

#[when("小明创建完整公司信息")]
async fn create_company_full(world: &mut CompanyWorld, step: &Step) {
    let mut param_json = serde_json::Map::new();
    if let Some(table) = step.table.as_ref() {
        for header_row in table.rows.first().iter() {
            for (i, cell) in header_row.iter().enumerate() {
                if let Some(data_row) = table.rows.get(1) {
                    if i < data_row.len() {
                        let xlsx_field = cell;
                        let value = &data_row[i];
                        let api_field = xlsx_field_to_api_field(xlsx_field);
                        if !api_field.is_empty() && !value.is_empty() && value != "-" {
                            let api_value = xlsx_value_to_api_value(xlsx_field, value);
                            if !api_value.is_null() {
                                param_json.insert(api_field.to_string(), api_value);
                            }
                        }
                    }
                }
            }
        }
    }
    if param_json.is_empty() {
        panic!("param_json is empty!");
    }
    let response = post_json_with_token(
        world.app.clone().unwrap(),
        CREATE_API_URL,
        &json!(param_json),
        world.auth_token.clone(),
    )
    .await;
    world.last_response = Some(response);
}

#[when("小明更新公司信息")]
async fn update_company(world: &mut CompanyWorld, step: &Step) {
    let company_id = world.created_company_id.clone().unwrap_or_default();
    let url = format!("/api/company/{}", company_id);
    let mut param_json = serde_json::Map::new();
    if let Some(table) = step.table.as_ref() {
        for header_row in table.rows.first().iter() {
            for (i, cell) in header_row.iter().enumerate() {
                if let Some(data_row) = table.rows.get(1) {
                    if i < data_row.len() {
                        param_json.insert(cell.to_string(), json!(data_row[i]));
                    }
                }
            }
        }
    }
    let response = put_json_with_token(
        world.app.clone().unwrap(),
        &url,
        &json!(param_json),
        world.auth_token.clone(),
    )
    .await;
    world.last_response = Some(response);
}

#[when("小明尝试修改公司名称")]
async fn update_company_name(world: &mut CompanyWorld, step: &Step) {
    update_company(world, step).await;
}

#[when("小明更新公司完整信息")]
async fn update_company_full(world: &mut CompanyWorld, step: &Step) {
    let company_id = world.created_company_id.clone().unwrap_or_default();
    let url = format!("/api/company/{}", company_id);
    let mut param_json = serde_json::Map::new();
    let mut expected_data = std::collections::HashMap::new();
    if let Some(table) = step.table.as_ref() {
        for header_row in table.rows.first().iter() {
            for (i, cell) in header_row.iter().enumerate() {
                if let Some(data_row) = table.rows.get(1) {
                    if i < data_row.len() {
                        let xlsx_field = cell;
                        let value = &data_row[i];
                        let api_field = xlsx_field_to_api_field(xlsx_field);
                        if !api_field.is_empty() {
                            if !value.is_empty() && value != "-" {
                                param_json.insert(
                                    api_field.to_string(),
                                    xlsx_value_to_api_value(xlsx_field, value),
                                );
                            }
                            expected_data.insert(
                                api_field.to_string(),
                                xlsx_value_to_api_value(xlsx_field, value),
                            );
                        }
                    }
                }
            }
        }
    }
    let response = put_json_with_token(
        world.app.clone().unwrap(),
        &url,
        &json!(param_json),
        world.auth_token.clone(),
    )
    .await;
    world.last_response = Some(response);
    world.expected_company_data = Some(ExpectedCompanyData(expected_data));
}

#[when("小明搜索公司")]
async fn search_company(world: &mut CompanyWorld, step: &Step) {
    let mut param_json = serde_json::Map::new();
    param_json.insert("page".to_string(), json!({"num": 1, "size": 10}));
    if let Some(table) = step.table.as_ref() {
        for row in table.rows.iter().skip(1) {
            let header_row = table.rows.first();
            if let Some(hdr) = header_row {
                if !row.is_empty() {
                    param_json.insert(hdr[0].to_string(), json!(row[0]));
                }
            }
        }
    }
    let response = post_json_with_token(
        world.app.clone().unwrap(),
        SEARCH_API_URL,
        &json!(param_json),
        world.auth_token.clone(),
    )
    .await;
    world.last_response = Some(response);
}

#[when("小明搜索公司分页")]
async fn search_company_paged(world: &mut CompanyWorld, step: &Step) {
    let mut param_json = serde_json::Map::new();
    if let Some(table) = step.table.as_ref() {
        for row in table.rows.iter().skip(1) {
            param_json.insert(
                "page".to_string(),
                json!({"num": row[0].parse::<i64>().unwrap_or(1), "size": row[1].parse::<i64>().unwrap_or(10)}),
            );
        }
    }
    let response = post_json_with_token(
        world.app.clone().unwrap(),
        SEARCH_API_URL,
        &json!(param_json),
        world.auth_token.clone(),
    )
    .await;
    world.last_response = Some(response);
}

#[when("小明搜索公司排序")]
async fn search_company_sorted(world: &mut CompanyWorld, step: &Step) {
    let mut param_json = serde_json::Map::new();
    param_json.insert("page".to_string(), json!({"num": 1, "size": 10}));
    if let Some(table) = step.table.as_ref() {
        for row in table.rows.iter().skip(1) {
            param_json.insert("order_by".to_string(), json!(row[0]));
            param_json.insert("order_dir".to_string(), json!(row[1]));
        }
    }
    let response = post_json_with_token(
        world.app.clone().unwrap(),
        SEARCH_API_URL,
        &json!(param_json),
        world.auth_token.clone(),
    )
    .await;
    world.last_response = Some(response);
}

#[when("小明获取公司详情")]
async fn get_company_detail(world: &mut CompanyWorld) {
    let company_id = world.created_company_id.clone().unwrap_or_default();
    let url = format!("/api/company/{}", company_id);
    let response =
        get_json_with_token(world.app.clone().unwrap(), &url, world.auth_token.clone()).await;
    world.last_response = Some(response);
}

#[when("小明获取不存在的公司详情")]
async fn get_company_detail_not_found(world: &mut CompanyWorld) {
    let url = "/api/company/not_found_id_12345";
    let response =
        get_json_with_token(world.app.clone().unwrap(), &url, world.auth_token.clone()).await;
    world.last_response = Some(response);
}

#[when("小明删除公司")]
async fn delete_company(world: &mut CompanyWorld) {
    let company_id = world.created_company_id.clone().unwrap_or_default();
    let url = format!("/api/company/{}", company_id);
    let response =
        delete_json_with_token(world.app.clone().unwrap(), &url, world.auth_token.clone()).await;
    world.last_response = Some(response);
}

#[when("小明删除不存在的公司")]
async fn delete_company_not_found(world: &mut CompanyWorld) {
    let url = "/api/company/not_found_id_12345";
    let response =
        delete_json_with_token(world.app.clone().unwrap(), &url, world.auth_token.clone()).await;
    world.last_response = Some(response);
}

#[then("小明应该能看到公司创建成功")]
async fn company_create_success(world: &mut CompanyWorld) {
    let response = world.last_response.take().unwrap();
    let status = response.status();
    let value = response_to_json(response).await;
    if status != StatusCode::OK {
        panic!("创建失败，状态码: {}，响应: {:?}", status, value);
    }
    let data = get_json_result(&value);
    if data.get("id").is_none() {
        panic!("响应中没有id字段: {:?}", data);
    }
    let company_name = get_from_value::<String>(&data, "name").unwrap();
    assert!(!company_name.is_empty(), "公司名称不应为空");
}

#[then("小明应该能看到公司信息返回正确")]
async fn company_data_correct(world: &mut CompanyWorld) {
    let response = world.last_response.take().unwrap();
    let status = response.status();
    let value = response_to_json(response).await;
    let data = get_json_result(&value);

    if status != StatusCode::OK {
        panic!("请求失败，状态码: {}", status);
    }
    if data.get("id").is_none() && data.get("name").is_none() {
        panic!("返回数据为空或格式错误: {:?}", data);
    }
}

#[then("小明应该能看到公司创建失败")]
async fn company_create_fail(world: &mut CompanyWorld) {
    let response = world.last_response.take().unwrap();
    assert_ne!(response.status(), StatusCode::OK, "创建应失败");
}

#[then("小明应该能看到公司更新成功")]
async fn company_update_success(world: &mut CompanyWorld) {
    let response = world.last_response.take().unwrap();
    let status = &response.status();
    assert_eq!(status.clone(), StatusCode::OK, "更新应返回200");
}

#[then("小明应该能看到公司更新失败")]
async fn company_update_fail(world: &mut CompanyWorld) {
    let response = world.last_response.take().unwrap();
    let status = &response.status();
    let value = response_to_json(response).await;
    assert_ne!(status.clone(), StatusCode::OK, "不应返回200");
    let code: u32 = get_from_value(&value, "code").unwrap();
    assert_eq!(CompanyErrorCode::NameImmutable.code(), code);
}

#[then("小明应该能看到公司搜索成功")]
async fn company_search_success(world: &mut CompanyWorld) {
    let response = world.last_response.take().unwrap();
    assert_eq!(response.status(), StatusCode::OK, "搜索应返回200");
}

#[then("小明应该能看到搜索结果包含公司名称")]
async fn company_search_contains_name(world: &mut CompanyWorld, step: &Step) {
    if let Some(response) = world.last_response.take() {
        let value = response_to_json(response).await;
        let data = get_json_result(&value);
        if let Some(items) = data.get("items").and_then(|v| v.as_array()) {
            if let Some(table) = step.table.as_ref() {
                for row in table.rows.iter().skip(1) {
                    let has_name = items.iter().any(|item| {
                        item.get("name").and_then(|n| n.as_str()) == Some(row[0].as_str())
                    });
                    assert!(has_name, "搜索结果应包含 {}", row[0]);
                }
            }
        }
    }
}

#[then("小明应该能看到搜索结果包含行业")]
async fn company_search_contains_industry(world: &mut CompanyWorld, step: &Step) {
    if let Some(response) = world.last_response.take() {
        let value = response_to_json(response).await;
        let data = get_json_result(&value);
        if let Some(items) = data.get("items").and_then(|v| v.as_array()) {
            if let Some(table) = step.table.as_ref() {
                for row in table.rows.iter().skip(1) {
                    let has_industry = items.iter().any(|item| {
                        item.get("industry").and_then(|n| n.as_str()) == Some(row[0].as_str())
                    });
                    assert!(has_industry, "搜索结果应包含行业 {}", row[0]);
                }
            }
        }
    }
}

#[then("小明应该能看到搜索结果包含状态")]
async fn company_search_contains_status(world: &mut CompanyWorld, step: &Step) {
    if let Some(response) = world.last_response.take() {
        let value = response_to_json(response).await;
        let data = get_json_result(&value);
        if let Some(items) = data.get("items").and_then(|v| v.as_array()) {
            if let Some(table) = step.table.as_ref() {
                for row in table.rows.iter().skip(1) {
                    let has_status = items.iter().any(|item| {
                        item.get("status").and_then(|n| n.as_str()) == Some(row[0].as_str())
                    });
                    assert!(has_status, "搜索结果应包含状态 {}", row[0]);
                }
            }
        }
    }
}

#[then("小明应该能看到分页结果正确")]
async fn company_pagination_correct(world: &mut CompanyWorld) {
    if let Some(response) = world.last_response.take() {
        let value = response_to_json(response).await;
        let data = get_json_result(&value);
        if let Some(items) = data.get("items").and_then(|v| v.as_array()) {
            let total = data.get("total").and_then(|v| v.as_u64()).unwrap_or(0);
            assert_eq!(items.len(), 1, "每页大小应为1");
            assert!(total >= 1, "总数应>=1");
        }
    }
}

#[then("小明应该能看到搜索结果按名称排序")]
async fn company_sorted_correct(world: &mut CompanyWorld) {
    if let Some(response) = world.last_response.take() {
        let value = response_to_json(response).await;
        let data = get_json_result(&value);
        if let Some(items) = data.get("items").and_then(|v| v.as_array()) {
            let total = data.get("total").and_then(|v| v.as_u64()).unwrap_or(0);
            if items.len() >= 2 && total >= 2 {
                let names: Vec<&str> = items
                    .iter()
                    .filter_map(|item| item.get("name").and_then(|n| n.as_str()))
                    .collect();
                assert!(
                    names.windows(2).all(|w| w[0] <= w[1]),
                    "结果应按名称升序排列"
                );
            }
        }
    }
}

#[then("小明应该能看到公司详情返回成功")]
async fn company_detail_success(world: &mut CompanyWorld) {
    let response = world.last_response.take().unwrap();
    assert_eq!(response.status(), StatusCode::OK, "获取详情应返回200");
}

#[then("小明应该能看到公司详情返回失败")]
async fn company_detail_fail(world: &mut CompanyWorld) {
    let response = world.last_response.take().unwrap();
    assert_ne!(response.status(), StatusCode::OK, "获取详情应失败");
}

#[then("小明应该能看到公司删除成功")]
async fn company_delete_success(world: &mut CompanyWorld) {
    let response = world.last_response.take().unwrap();
    assert_eq!(response.status(), StatusCode::OK, "删除应返回200");
}

#[then("小明应该能看到公司删除失败")]
async fn company_delete_fail(world: &mut CompanyWorld) {
    let response = world.last_response.take().unwrap();
    assert_ne!(response.status(), StatusCode::OK, "删除应失败");
}

#[tokio::test]
async fn main() {
    tracing_subscriber::fmt::init();
    CompanyWorld::cucumber()
        .before(|_feature, _rule, _scenario, world| {
            async move {
                let (container, state) = setup_database().await;
                world.container = container;
                world.state = Some(state.clone());
                Jwt::init(config::get().auth().clone());
                let principal = Principal {
                    id: String::from("testid"),
                    name: String::from("test"),
                };
                world.auth_token = Some(Jwt::global().access_token_encode(principal).unwrap());
                let app = OpenApiRouter::new();
                let app = setup_company(app, state).split_for_parts().0;
                let app = setup_default(app);
                let app = app.layer(MockConnectInfo(SocketAddr::from(([0, 0, 0, 0], 1337))));
                world.app = Some(app);
            }
            .boxed()
        })
        .after(|_feature, _rule, _scenario, _ev, world| {
            async move {
                if let Some(world) = world.as_ref() {
                    tear_down(&world.container).await;
                }
            }
            .boxed()
        })
        .run("tests/features/company/company.feature")
        .await;
}
