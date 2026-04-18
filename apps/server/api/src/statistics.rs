use crate::AppState;
use axum::{debug_handler, extract::Query, extract::State};
use entity::company::{Column as CompanyColumn, Entity as Company};
use entity::job::{Column as JobColumn, Entity as Job};
use framework::{data::ApiResponse, error::ApiResult};
use sea_orm::sea_query::Expr;
use sea_orm::{
    ColumnTrait, EntityTrait, ExprTrait, PaginatorTrait, QueryFilter, QueryOrder, QuerySelect,
};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use utoipa_axum::{
    router::{OpenApiRouter, UtoipaMethodRouterExt},
    routes,
};

const TAG: &str = "statistics";

pub fn create_routes(state: AppState) -> OpenApiRouter {
    OpenApiRouter::new()
        .routes(routes!(job_scan_time).with_state(state.clone()))
        .routes(routes!(job_salary).with_state(state.clone()))
        .routes(routes!(job_location).with_state(state.clone()))
        .routes(routes!(job_platform).with_state(state.clone()))
        .routes(routes!(job_degree).with_state(state.clone()))
        .routes(routes!(job_year).with_state(state.clone()))
        .routes(routes!(company_insurance).with_state(state.clone()))
        .routes(routes!(company_industry).with_state(state.clone()))
        .routes(routes!(company_status).with_state(state.clone()))
        .routes(routes!(company_source_update).with_state(state))
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct StatItem {
    pub name: String,
    pub value: i64,
}

#[derive(Debug, Deserialize, Default)]
pub struct YearQuery {
    year: Option<i32>,
}

#[debug_handler]
#[utoipa::path(get, path = "/job/statistics/scan-time", tag = TAG, security(()), responses(
    (status = OK, body = ApiResponse<Vec<StatItem>>)
))]
pub async fn job_scan_time(
    State(AppState { conn }): State<AppState>,
    Query(query): Query<YearQuery>,
) -> ApiResult<ApiResponse<Vec<StatItem>>> {
    let results: Vec<(String, i64)> = if let Some(year) = query.year {
        let pattern = format!("{}-%", year);
        Job::find()
            .select_only()
            .column_as(
                Expr::col(JobColumn::CreateDatetime)
                    .cast_as("TEXT")
                    .if_null("未知"),
                "period",
            )
            .column_as(JobColumn::Id.count(), "count")
            .filter(JobColumn::CreateDatetime.like(&pattern))
            .group_by(
                Expr::col(JobColumn::CreateDatetime)
                    .cast_as("TEXT")
                    .if_null("未知"),
            )
            .order_by_asc(
                Expr::col(JobColumn::CreateDatetime)
                    .cast_as("TEXT")
                    .if_null("未知"),
            )
            .into_tuple::<(String, i64)>()
            .all(&conn)
            .await?
    } else {
        Job::find()
            .select_only()
            .column_as(
                Expr::col(JobColumn::CreateDatetime)
                    .cast_as("TEXT")
                    .if_null("未知"),
                "period",
            )
            .column_as(JobColumn::Id.count(), "count")
            .group_by(
                Expr::col(JobColumn::CreateDatetime)
                    .cast_as("TEXT")
                    .if_null("未知"),
            )
            .order_by_asc(
                Expr::col(JobColumn::CreateDatetime)
                    .cast_as("TEXT")
                    .if_null("未知"),
            )
            .into_tuple::<(String, i64)>()
            .all(&conn)
            .await?
    };

    let mut period_map: std::collections::HashMap<String, i64> = std::collections::HashMap::new();
    for (name, value) in results {
        let period = if name.len() >= 7 {
            name[..7].to_string()
        } else {
            name
        };
        *period_map.entry(period).or_insert(0) += value;
    }

    let mut items: Vec<StatItem> = period_map
        .into_iter()
        .map(|(name, value)| StatItem { name, value })
        .collect();
    items.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(ApiResponse::success(Some(items)))
}

#[debug_handler]
#[utoipa::path(get, path = "/job/statistics/salary", tag = TAG, security(()), responses(
    (status = OK, body = ApiResponse<Vec<StatItem>>)
))]
pub async fn job_salary(
    State(AppState { conn }): State<AppState>,
) -> ApiResult<ApiResponse<Vec<StatItem>>> {
    let salary_ranges = vec![
        ("0-5k", 0f32, 5000f32),
        ("5k-10k", 5000f32, 10000f32),
        ("10k-15k", 10000f32, 15000f32),
        ("15k-20k", 15000f32, 20000f32),
        ("20k-30k", 20000f32, 30000f32),
        ("30k-50k", 30000f32, 50000f32),
        ("50k+", 50000f32, f32::MAX),
    ];

    let mut items = Vec::new();
    for (label, min, _max) in salary_ranges {
        let count: i64 = if min == 0f32 {
            Job::find()
                .filter(JobColumn::SalaryMax.lte(5000f32))
                .filter(JobColumn::SalaryMin.is_not_null())
                .count(&conn)
                .await? as i64
        } else if min == 5000f32 {
            Job::find()
                .filter(JobColumn::SalaryMin.gt(5000f32))
                .filter(JobColumn::SalaryMax.lte(10000f32))
                .filter(JobColumn::SalaryMin.is_not_null())
                .count(&conn)
                .await? as i64
        } else if min == 10000f32 {
            Job::find()
                .filter(JobColumn::SalaryMin.gt(10000f32))
                .filter(JobColumn::SalaryMax.lte(15000f32))
                .filter(JobColumn::SalaryMin.is_not_null())
                .count(&conn)
                .await? as i64
        } else if min == 15000f32 {
            Job::find()
                .filter(JobColumn::SalaryMin.gt(15000f32))
                .filter(JobColumn::SalaryMax.lte(20000f32))
                .filter(JobColumn::SalaryMin.is_not_null())
                .count(&conn)
                .await? as i64
        } else if min == 20000f32 {
            Job::find()
                .filter(JobColumn::SalaryMin.gt(20000f32))
                .filter(JobColumn::SalaryMax.lte(30000f32))
                .filter(JobColumn::SalaryMin.is_not_null())
                .count(&conn)
                .await? as i64
        } else if min == 30000f32 {
            Job::find()
                .filter(JobColumn::SalaryMin.gt(30000f32))
                .filter(JobColumn::SalaryMax.lte(50000f32))
                .filter(JobColumn::SalaryMin.is_not_null())
                .count(&conn)
                .await? as i64
        } else {
            Job::find()
                .filter(JobColumn::SalaryMin.gt(50000f32))
                .filter(JobColumn::SalaryMin.is_not_null())
                .count(&conn)
                .await? as i64
        };

        items.push(StatItem {
            name: label.to_string(),
            value: count,
        });
    }

    Ok(ApiResponse::success(Some(items)))
}

#[debug_handler]
#[utoipa::path(get, path = "/job/statistics/location", tag = TAG, security(()), responses(
    (status = OK, body = ApiResponse<Vec<StatItem>>)
))]
pub async fn job_location(
    State(AppState { conn }): State<AppState>,
) -> ApiResult<ApiResponse<Vec<StatItem>>> {
    let results: Vec<(String, i64)> = Job::find()
        .select_only()
        .column_as(
            Expr::col(JobColumn::LocationName).if_null("未知"),
            "location",
        )
        .column_as(JobColumn::Id.count(), "count")
        .filter(JobColumn::LocationName.is_not_null())
        .group_by(Expr::col(JobColumn::LocationName).if_null("未知"))
        .having(JobColumn::Id.count().gt(0))
        .order_by_desc(JobColumn::Id.count())
        .into_tuple::<(String, i64)>()
        .all(&conn)
        .await?;

    let mut city_map: std::collections::HashMap<String, i64> = std::collections::HashMap::new();
    for (location, count) in results {
        let city = extract_city(&location);
        *city_map.entry(city).or_insert(0) += count;
    }

    let mut items: Vec<StatItem> = city_map
        .into_iter()
        .map(|(name, value)| StatItem { name, value })
        .collect();
    items.sort_by(|a, b| b.value.cmp(&a.value));

    Ok(ApiResponse::success(Some(items)))
}

fn extract_city(location: &str) -> String {
    let location = location.trim();
    if location.is_empty() {
        return "未知".to_string();
    }

    let mut clean = location.to_string();
    while clean.ends_with('·')
        || clean.ends_with('-')
        || clean.ends_with('/')
        || clean.ends_with(' ')
    {
        clean.pop();
    }
    if clean.is_empty() {
        return "未知".to_string();
    }

    let separators = ['·', '-', '/'];
    for sep in separators {
        if let Some(idx) = clean.find(sep) {
            let part = clean[..idx].trim();
            if !part.is_empty() {
                return part.to_string();
            }
        }
    }

    clean.to_string()
}

#[debug_handler]
#[utoipa::path(get, path = "/job/statistics/platform", tag = TAG, security(()), responses(
    (status = OK, body = ApiResponse<Vec<StatItem>>)
))]
pub async fn job_platform(
    State(AppState { conn }): State<AppState>,
) -> ApiResult<ApiResponse<Vec<StatItem>>> {
    let results: Vec<(String, i64)> = Job::find()
        .select_only()
        .column_as(Expr::col(JobColumn::Platform).if_null("未知"), "platform")
        .column_as(JobColumn::Id.count(), "count")
        .group_by(Expr::col(JobColumn::Platform).if_null("未知"))
        .having(JobColumn::Id.count().gt(0))
        .order_by_desc(JobColumn::Id.count())
        .into_tuple::<(String, i64)>()
        .all(&conn)
        .await?;

    let items: Vec<StatItem> = results
        .into_iter()
        .map(|(name, value)| StatItem { name, value })
        .collect();
    Ok(ApiResponse::success(Some(items)))
}

#[debug_handler]
#[utoipa::path(get, path = "/job/statistics/degree", tag = TAG, security(()), responses(
    (status = OK, body = ApiResponse<Vec<StatItem>>)
))]
pub async fn job_degree(
    State(AppState { conn }): State<AppState>,
) -> ApiResult<ApiResponse<Vec<StatItem>>> {
    let results: Vec<(String, i64)> = Job::find()
        .select_only()
        .column_as(Expr::col(JobColumn::DegreeName).if_null("未知"), "degree")
        .column_as(JobColumn::Id.count(), "count")
        .filter(JobColumn::DegreeName.is_not_null())
        .group_by(Expr::col(JobColumn::DegreeName).if_null("未知"))
        .having(JobColumn::Id.count().gt(0))
        .order_by_desc(JobColumn::Id.count())
        .into_tuple::<(String, i64)>()
        .all(&conn)
        .await?;

    let mut degree_map: std::collections::HashMap<String, i64> = std::collections::HashMap::new();
    degree_map.insert("本科".to_string(), 0);
    degree_map.insert("大专".to_string(), 0);
    degree_map.insert("高中".to_string(), 0);
    degree_map.insert("硕士".to_string(), 0);
    degree_map.insert("博士".to_string(), 0);
    degree_map.insert("不限".to_string(), 0);
    degree_map.insert("其他".to_string(), 0);

    for (degree, count) in results {
        let category = categorize_degree(&degree);
        *degree_map.entry(category).or_insert(0) += count;
    }

    let mut items: Vec<StatItem> = degree_map
        .into_iter()
        .map(|(name, value)| StatItem { name, value })
        .collect();
    items.sort_by(|a, b| b.value.cmp(&a.value));

    Ok(ApiResponse::success(Some(items)))
}

fn categorize_degree(degree: &str) -> String {
    let degree = degree.trim().to_lowercase();

    if degree.is_empty() || degree == "未知" {
        return "其他".to_string();
    }

    let benke = ["本科", "学士", "大学本科"];
    let dazhuan = ["大专", "专科", "大学专科"];
    let gaozhong = [
        "高中",
        "中职",
        "中专",
        "中技",
        "职高",
        "技校",
        "初中",
        "初中及以下",
        "中等专科",
        "普通高中",
        "技工学校",
    ];
    let shuoshi = ["硕士", "研究生"];
    let boshi = ["博士", "博士后"];
    let buxian = ["不限", "学历不限", "无要求", "不限制"];

    for kw in benke {
        if degree.contains(kw) {
            return "本科".to_string();
        }
    }
    for kw in dazhuan {
        if degree.contains(kw) {
            return "大专".to_string();
        }
    }
    for kw in gaozhong {
        if degree.contains(kw) {
            return "高中".to_string();
        }
    }
    for kw in shuoshi {
        if degree.contains(kw) {
            return "硕士".to_string();
        }
    }
    for kw in boshi {
        if degree.contains(kw) {
            return "博士".to_string();
        }
    }
    for kw in buxian {
        if degree.contains(kw) {
            return "不限".to_string();
        }
    }

    "其他".to_string()
}

#[debug_handler]
#[utoipa::path(get, path = "/job/statistics/year", tag = TAG, security(()), responses(
    (status = OK, body = ApiResponse<Vec<StatItem>>)
))]
pub async fn job_year(
    State(AppState { conn }): State<AppState>,
) -> ApiResult<ApiResponse<Vec<StatItem>>> {
    let results: Vec<(Option<i32>, i64)> = Job::find()
        .select_only()
        .column_as(JobColumn::Year, "year")
        .column_as(JobColumn::Id.count(), "count")
        .group_by(JobColumn::Year)
        .order_by_desc(JobColumn::Id.count())
        .into_tuple::<(Option<i32>, i64)>()
        .all(&conn)
        .await?;

    let items: Vec<StatItem> = results
        .into_iter()
        .map(|(year, value)| {
            let name = match year {
                None => "不限".to_string(),
                Some(0) => "应届毕业生".to_string(),
                Some(y) if y <= 3 => "1-3年".to_string(),
                Some(y) if y <= 5 => "3-5年".to_string(),
                Some(y) if y <= 10 => "5-10年".to_string(),
                Some(_) => "10年+".to_string(),
            };
            StatItem { name, value }
        })
        .collect();
    Ok(ApiResponse::success(Some(items)))
}

#[debug_handler]
#[utoipa::path(get, path = "/company/statistics/insurance", tag = TAG, security(()), responses(
    (status = OK, body = ApiResponse<Vec<StatItem>>)
))]
pub async fn company_insurance(
    State(AppState { conn }): State<AppState>,
) -> ApiResult<ApiResponse<Vec<StatItem>>> {
    let insurance_ranges = vec![
        ("0", 0, 0),
        ("1-20", 1, 20),
        ("21-50", 21, 50),
        ("51-100", 51, 100),
        ("101-500", 101, 500),
        ("500+", 501, i32::MAX),
    ];

    let mut items = Vec::new();
    for (label, min, max) in insurance_ranges {
        let count: i64 = if min == 0 && max == 0 {
            Company::find()
                .filter(
                    CompanyColumn::InsuranceNum
                        .is_null()
                        .or(CompanyColumn::InsuranceNum.eq(0)),
                )
                .count(&conn)
                .await? as i64
        } else if max == i32::MAX {
            Company::find()
                .filter(CompanyColumn::InsuranceNum.gte(min))
                .count(&conn)
                .await? as i64
        } else {
            Company::find()
                .filter(CompanyColumn::InsuranceNum.gte(min))
                .filter(CompanyColumn::InsuranceNum.lte(max))
                .count(&conn)
                .await? as i64
        };

        items.push(StatItem {
            name: label.to_string(),
            value: count,
        });
    }

    Ok(ApiResponse::success(Some(items)))
}

#[debug_handler]
#[utoipa::path(get, path = "/company/statistics/industry", tag = TAG, security(()), responses(
    (status = OK, body = ApiResponse<Vec<StatItem>>)
))]
pub async fn company_industry(
    State(AppState { conn }): State<AppState>,
) -> ApiResult<ApiResponse<Vec<StatItem>>> {
    let results: Vec<(String, i64)> = Company::find()
        .select_only()
        .column_as(
            Expr::col(CompanyColumn::Industry).if_null("未知"),
            "industry",
        )
        .column_as(CompanyColumn::Id.count(), "count")
        .group_by(Expr::col(CompanyColumn::Industry).if_null("未知"))
        .having(CompanyColumn::Id.count().gt(0))
        .order_by_desc(CompanyColumn::Id.count())
        .limit(20)
        .into_tuple::<(String, i64)>()
        .all(&conn)
        .await?;

    let items: Vec<StatItem> = results
        .into_iter()
        .map(|(name, value)| StatItem { name, value })
        .collect();
    Ok(ApiResponse::success(Some(items)))
}

#[debug_handler]
#[utoipa::path(get, path = "/company/statistics/status", tag = TAG, security(()), responses(
    (status = OK, body = ApiResponse<Vec<StatItem>>)
))]
pub async fn company_status(
    State(AppState { conn }): State<AppState>,
) -> ApiResult<ApiResponse<Vec<StatItem>>> {
    let results: Vec<(String, i64)> = Company::find()
        .select_only()
        .column_as(Expr::col(CompanyColumn::Status).if_null("未知"), "status")
        .column_as(CompanyColumn::Id.count(), "count")
        .group_by(Expr::col(CompanyColumn::Status).if_null("未知"))
        .having(CompanyColumn::Id.count().gt(0))
        .order_by_desc(CompanyColumn::Id.count())
        .into_tuple::<(String, i64)>()
        .all(&conn)
        .await?;

    let items: Vec<StatItem> = results
        .into_iter()
        .map(|(name, value)| StatItem { name, value })
        .collect();
    Ok(ApiResponse::success(Some(items)))
}

#[debug_handler]
#[utoipa::path(get, path = "/company/statistics/source-update", tag = TAG, security(()), responses(
    (status = OK, body = ApiResponse<Vec<StatItem>>)
))]
pub async fn company_source_update(
    State(AppState { conn }): State<AppState>,
    Query(query): Query<YearQuery>,
) -> ApiResult<ApiResponse<Vec<StatItem>>> {
    let results: Vec<(String, i64)> = if let Some(year) = query.year {
        let pattern = format!("{}-%", year);
        Company::find()
            .select_only()
            .column_as(
                Expr::col(CompanyColumn::SourceRefreshDatetime)
                    .cast_as("TEXT")
                    .if_null("未知"),
                "period",
            )
            .column_as(CompanyColumn::Id.count(), "count")
            .filter(CompanyColumn::SourceRefreshDatetime.like(&pattern))
            .group_by(
                Expr::col(CompanyColumn::SourceRefreshDatetime)
                    .cast_as("TEXT")
                    .if_null("未知"),
            )
            .order_by_asc(
                Expr::col(CompanyColumn::SourceRefreshDatetime)
                    .cast_as("TEXT")
                    .if_null("未知"),
            )
            .into_tuple::<(String, i64)>()
            .all(&conn)
            .await?
    } else {
        Company::find()
            .select_only()
            .column_as(
                Expr::col(CompanyColumn::SourceRefreshDatetime)
                    .cast_as("TEXT")
                    .if_null("未知"),
                "period",
            )
            .column_as(CompanyColumn::Id.count(), "count")
            .group_by(
                Expr::col(CompanyColumn::SourceRefreshDatetime)
                    .cast_as("TEXT")
                    .if_null("未知"),
            )
            .order_by_asc(
                Expr::col(CompanyColumn::SourceRefreshDatetime)
                    .cast_as("TEXT")
                    .if_null("未知"),
            )
            .into_tuple::<(String, i64)>()
            .all(&conn)
            .await?
    };

    let mut period_map: std::collections::HashMap<String, i64> = std::collections::HashMap::new();
    for (name, value) in results {
        let period = if name.len() >= 7 {
            name[..7].to_string()
        } else {
            name
        };
        *period_map.entry(period).or_insert(0) += value;
    }

    let mut items: Vec<StatItem> = period_map
        .into_iter()
        .map(|(name, value)| StatItem { name, value })
        .collect();
    items.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(ApiResponse::success(Some(items)))
}
