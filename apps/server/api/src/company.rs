use framework::{error::critical_code::CriticalErrorCode, prelude::*};

#[error]
pub enum CompanyErrorCode {
    NameRequired = 504001,
}

use crate::AppState;
use axum::{debug_handler, extract::Path, extract::State};
use entity::company::{self, Entity as Company};
use framework::{
    data::{ApiPageResult, ApiResponse, PageParam, valid::ValidJson},
    error::ApiResult,
};
use sea_orm::{
    ActiveValue::Set, ColumnTrait, EntityTrait, IntoActiveModel, PaginatorTrait, QueryFilter,
    QueryOrder, QueryTrait,
};
use utoipa::ToSchema;
use utoipa_axum::{
    router::{OpenApiRouter, UtoipaMethodRouterExt},
    routes,
};

const TAG: &str = "company";

pub fn create_routes(state: AppState) -> OpenApiRouter {
    OpenApiRouter::new()
        .routes(routes!(search).with_state(state.clone()))
        .routes(routes!(get_by_id).with_state(state.clone()))
        .routes(routes!(create).with_state(state.clone()))
        .routes(routes!(update).with_state(state.clone()))
        .route(
            "/company/{id}",
            axum::routing::delete(delete_company).with_state(state),
        )
}

#[debug_handler]
#[utoipa::path(post, path = "/company/search",tag=TAG,security(()),request_body = SearchParam,responses(
    (status=OK,body=ApiResponse<ApiPageResult<company::Model>>)
))]
pub async fn search(
    State(AppState { conn }): State<AppState>,
    ValidJson(param): ValidJson<SearchParam>,
) -> ApiResult<ApiResponse<ApiPageResult<company::Model>>> {
    let num = param.page.num;
    let size = param.page.size;
    let order_by = param.order_by.clone();
    let order_dir = param.order_dir.clone();
    let selection = Company::find().apply_if(Some(param), |query, v| {
        query
            .apply_if(v.name, |query, v| {
                query.filter(company::Column::Name.like(format!("%{}%", v)))
            })
            .apply_if(v.platform, |query, v| {
                query.filter(company::Column::SourcePlatform.like(format!("%{}%", v)))
            })
            .apply_if(v.industry, |query, v| {
                query.filter(company::Column::Industry.like(format!("%{}%", v)))
            })
            .apply_if(v.legal_person, |query, v| {
                query.filter(company::Column::LegalPerson.like(format!("%{}%", v)))
            })
            .apply_if(v.start_date_start, |query, v| {
                query.filter(company::Column::StartDate.gte(v))
            })
            .apply_if(v.start_date_end, |query, v| {
                query.filter(company::Column::StartDate.lt(v))
            })
            .apply_if(v.address, |query, v| {
                query.filter(company::Column::Address.like(format!("%{}%", v)))
            })
            .apply_if(v.status, |query, v| {
                query.filter(company::Column::Status.like(format!("%{}%", v)))
            })
    });
    let order_by = order_by.as_deref().unwrap_or("update_datetime");
    let order_dir = order_dir.as_deref().unwrap_or("desc");
    let is_asc = order_dir == "asc";
    let paginate = match order_by {
        "source_refresh_datetime" => {
            if is_asc {
                selection
                    .clone()
                    .order_by_asc(company::Column::SourceRefreshDatetime)
                    .order_by_asc(company::Column::Id)
                    .paginate(&conn, size)
            } else {
                selection
                    .clone()
                    .order_by_desc(company::Column::SourceRefreshDatetime)
                    .order_by_asc(company::Column::Id)
                    .paginate(&conn, size)
            }
        }
        "start_date" => {
            if is_asc {
                selection
                    .clone()
                    .order_by_asc(company::Column::StartDate)
                    .order_by_asc(company::Column::Id)
                    .paginate(&conn, size)
            } else {
                selection
                    .clone()
                    .order_by_desc(company::Column::StartDate)
                    .order_by_asc(company::Column::Id)
                    .paginate(&conn, size)
            }
        }
        "insurance_num" => {
            if is_asc {
                selection
                    .clone()
                    .order_by_asc(company::Column::InsuranceNum)
                    .order_by_asc(company::Column::Id)
                    .paginate(&conn, size)
            } else {
                selection
                    .clone()
                    .order_by_desc(company::Column::InsuranceNum)
                    .order_by_asc(company::Column::Id)
                    .paginate(&conn, size)
            }
        }
        "self_risk" => {
            if is_asc {
                selection
                    .clone()
                    .order_by_asc(company::Column::SelfRisk)
                    .order_by_asc(company::Column::Id)
                    .paginate(&conn, size)
            } else {
                selection
                    .clone()
                    .order_by_desc(company::Column::SelfRisk)
                    .order_by_asc(company::Column::Id)
                    .paginate(&conn, size)
            }
        }
        "union_risk" => {
            if is_asc {
                selection
                    .clone()
                    .order_by_asc(company::Column::UnionRisk)
                    .order_by_asc(company::Column::Id)
                    .paginate(&conn, size)
            } else {
                selection
                    .clone()
                    .order_by_desc(company::Column::UnionRisk)
                    .order_by_asc(company::Column::Id)
                    .paginate(&conn, size)
            }
        }
        _ => {
            if is_asc {
                selection
                    .clone()
                    .order_by_asc(company::Column::UpdateDatetime)
                    .order_by_asc(company::Column::Id)
                    .paginate(&conn, size)
            } else {
                selection
                    .clone()
                    .order_by_desc(company::Column::UpdateDatetime)
                    .order_by_asc(company::Column::Id)
                    .paginate(&conn, size)
            }
        }
    };
    let total = paginate.num_items().await?;
    let items = paginate.fetch_page(num - 1).await?;
    Ok(ApiResponse::success(Some(ApiPageResult::new(items, total))))
}

#[debug_handler]
#[utoipa::path(get, path = "/company/{id}",tag=TAG,security(()),responses(
    (status=OK,body=ApiResponse<company::Model>)
))]
pub async fn get_by_id(
    State(AppState { conn }): State<AppState>,
    Path(id): Path<String>,
) -> ApiResult<ApiResponse<company::Model>> {
    let company = Company::find_by_id(&id)
        .one(&conn)
        .await?
        .ok_or(CriticalErrorCode::ResourceNotFound)?;
    Ok(ApiResponse::success(Some(company)))
}

#[debug_handler]
#[utoipa::path(post, path = "/company",tag=TAG,security(()),request_body = CreateCompanyRequest,responses(
    (status=OK,body=ApiResponse<company::Model>)
))]
pub async fn create(
    State(AppState { conn }): State<AppState>,
    ValidJson(param): ValidJson<CreateCompanyRequest>,
) -> ApiResult<ApiResponse<company::Model>> {
    let now: chrono::DateTime<chrono::Utc> = chrono::Utc::now();
    let active_model = company::ActiveModel {
        id: Set(param.id.unwrap_or_else(|| xid::new().to_string())),
        name: Set(param.name),
        desc: Set(param.desc),
        start_date: Set(param.start_date),
        status: Set(param.status),
        legal_person: Set(param.legal_person),
        unified_code: Set(param.unified_code),
        web_site: Set(param.web_site),
        source_platform: Set(param.source_platform),
        insurance_num: Set(param.insurance_num),
        self_risk: Set(param.self_risk),
        union_risk: Set(param.union_risk),
        address: Set(param.address),
        scope: Set(param.scope),
        tax_no: Set(param.tax_no),
        industry: Set(param.industry),
        license_number: Set(param.license_number),
        longitude: Set(param.longitude),
        latitude: Set(param.latitude),
        reg_capital_value: Set(param.reg_capital_value),
        reg_capital_currency: Set(param.reg_capital_currency),
        source_url: Set(param.source_url),
        source_record_id: Set(param.source_record_id),
        source_refresh_datetime: Set(param.source_refresh_datetime),
        paidin_capital_value: Set(param.paidin_capital_value),
        paidin_capital_currency: Set(param.paidin_capital_currency),
        uri: Set(param.uri),
        create_datetime: Set(Some(now.into())),
        update_datetime: Set(Some(now.into())),
    };
    let result = Company::insert(active_model).exec(&conn).await?;
    let company = Company::find_by_id(result.last_insert_id)
        .one(&conn)
        .await?
        .ok_or(CriticalErrorCode::ResourceNotFound)?;
    Ok(ApiResponse::success(Some(company)))
}

#[debug_handler]
#[utoipa::path(put, path = "/company/{id}",tag=TAG,security(()),request_body = UpdateCompanyRequest,responses(
    (status=OK,body=ApiResponse<company::Model>)
))]
pub async fn update(
    State(AppState { conn }): State<AppState>,
    Path(id): Path<String>,
    ValidJson(param): ValidJson<UpdateCompanyRequest>,
) -> ApiResult<ApiResponse<company::Model>> {
    let existing = Company::find_by_id(&id)
        .one(&conn)
        .await?
        .ok_or(CriticalErrorCode::ResourceNotFound)?;

    let active_model = company::ActiveModel {
        id: Set(id.clone()),
        name: Set(param.name.or(existing.name)),
        desc: Set(param.desc.or(existing.desc)),
        start_date: Set(param.start_date.or(existing.start_date)),
        status: Set(param.status.or(existing.status)),
        legal_person: Set(param.legal_person.or(existing.legal_person)),
        unified_code: Set(param.unified_code.or(existing.unified_code)),
        web_site: Set(param.web_site.or(existing.web_site)),
        source_platform: Set(param.source_platform.or(existing.source_platform)),
        insurance_num: Set(param.insurance_num.or(existing.insurance_num)),
        self_risk: Set(param.self_risk.or(existing.self_risk)),
        union_risk: Set(param.union_risk.or(existing.union_risk)),
        address: Set(param.address.or(existing.address)),
        scope: Set(param.scope.or(existing.scope)),
        tax_no: Set(param.tax_no.or(existing.tax_no)),
        industry: Set(param.industry.or(existing.industry)),
        license_number: Set(param.license_number.or(existing.license_number)),
        longitude: Set(param.longitude.or(existing.longitude)),
        latitude: Set(param.latitude.or(existing.latitude)),
        reg_capital_value: Set(param.reg_capital_value.or(existing.reg_capital_value)),
        reg_capital_currency: Set(param.reg_capital_currency.or(existing.reg_capital_currency)),
        source_url: Set(param.source_url.or(existing.source_url)),
        source_record_id: Set(param.source_record_id.or(existing.source_record_id)),
        source_refresh_datetime: Set(param
            .source_refresh_datetime
            .or(existing.source_refresh_datetime)),
        update_datetime: Set(Some(chrono::Utc::now().into())),
        ..Default::default()
    };
    Company::update(active_model).exec(&conn).await?;
    let company = Company::find_by_id(&id)
        .one(&conn)
        .await?
        .ok_or(CriticalErrorCode::ResourceNotFound)?;
    Ok(ApiResponse::success(Some(company)))
}

#[debug_handler]
#[utoipa::path(delete, path = "/company/{id}",tag=TAG,security(()),responses(
    (status=OK,body=ApiResponse<String>)
))]
pub async fn delete_company(
    State(AppState { conn }): State<AppState>,
    Path(id): Path<String>,
) -> ApiResult<ApiResponse<String>> {
    let company = Company::find_by_id(&id)
        .one(&conn)
        .await?
        .ok_or(CriticalErrorCode::ResourceNotFound)?;
    Company::delete(company.into_active_model())
        .exec(&conn)
        .await?;
    Ok(ApiResponse::success(Some("Deleted".to_string())))
}

use chrono::{DateTime, FixedOffset, NaiveDate};
use serde::{Deserialize, Serialize};
use validator::Validate;

#[derive(Default, Deserialize, Serialize, Debug, Clone, Validate, ToSchema)]
pub struct SearchParam {
    #[validate(nested)]
    pub page: PageParam,
    pub name: Option<String>,
    pub platform: Option<String>,
    pub industry: Option<String>,
    pub legal_person: Option<String>,
    pub start_date_start: Option<DateTime<FixedOffset>>,
    pub start_date_end: Option<DateTime<FixedOffset>>,
    pub address: Option<String>,
    pub status: Option<String>,
    pub order_by: Option<String>,
    pub order_dir: Option<String>,
}

#[derive(Default, Deserialize, Serialize, Debug, Clone, Validate, ToSchema)]
pub struct CreateCompanyRequest {
    pub id: Option<String>,
    pub platform: Option<String>,
    pub name: Option<String>,
    pub desc: Option<String>,
    pub start_date: Option<NaiveDate>,
    pub status: Option<String>,
    pub legal_person: Option<String>,
    pub unified_code: Option<String>,
    pub web_site: Option<String>,
    pub source_platform: Option<String>,
    pub insurance_num: Option<i32>,
    pub self_risk: Option<i32>,
    pub union_risk: Option<i32>,
    pub address: Option<String>,
    pub scope: Option<String>,
    pub tax_no: Option<String>,
    pub industry: Option<String>,
    pub license_number: Option<String>,
    pub longitude: Option<f64>,
    pub latitude: Option<f64>,
    pub reg_capital_value: Option<f64>,
    pub reg_capital_currency: Option<String>,
    pub source_url: Option<String>,
    pub source_record_id: Option<String>,
    pub source_refresh_datetime: Option<DateTime<FixedOffset>>,
    pub paidin_capital_value: Option<f64>,
    pub paidin_capital_currency: Option<String>,
    pub uri: Option<String>,
}

#[derive(Default, Deserialize, Serialize, Debug, Clone, Validate, ToSchema)]
pub struct UpdateCompanyRequest {
    pub platform: Option<String>,
    pub name: Option<String>,
    pub desc: Option<String>,
    pub start_date: Option<NaiveDate>,
    pub status: Option<String>,
    pub legal_person: Option<String>,
    pub unified_code: Option<String>,
    pub web_site: Option<String>,
    pub source_platform: Option<String>,
    pub insurance_num: Option<i32>,
    pub self_risk: Option<i32>,
    pub union_risk: Option<i32>,
    pub address: Option<String>,
    pub scope: Option<String>,
    pub tax_no: Option<String>,
    pub industry: Option<String>,
    pub license_number: Option<String>,
    pub longitude: Option<f64>,
    pub latitude: Option<f64>,
    pub reg_capital_value: Option<f64>,
    pub reg_capital_currency: Option<String>,
    pub source_url: Option<String>,
    pub source_record_id: Option<String>,
    pub source_refresh_datetime: Option<DateTime<FixedOffset>>,
    pub paidin_capital_value: Option<f64>,
    pub paidin_capital_currency: Option<String>,
    pub uri: Option<String>,
}
