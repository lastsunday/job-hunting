use crate::AppState;
use axum::{debug_handler, extract::State, extract::Path};
use entity::company::{self, Entity as Company};
use framework::{
    data::{ApiPageResult, ApiResponse, PageParam, valid::ValidJson},
    error::ApiResult,
};
use sea_orm::{ColumnTrait, EntityTrait, IntoActiveModel, PaginatorTrait, QueryFilter, QueryOrder, QueryTrait, ActiveValue::Set};
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
        .route("/company/{id}", axum::routing::delete(delete_company).with_state(state))
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
    let selection = Company::find().apply_if(Some(param), |query, v| {
        query
            .apply_if(v.name, |query, v| {
                query.filter(company::Column::Name.like(format!("%{}%", v)))
            })
            .apply_if(v.platform, |query, v| {
                query.filter(company::Column::Platform.like(format!("%{}%", v)))
            })
            .apply_if(v.industry, |query, v| {
                query.filter(company::Column::Industry.like(format!("%{}%", v)))
            })
    });
    let paginate = selection
        .clone()
        .order_by_desc(company::Column::UpdateDatetime)
        .order_by_asc(company::Column::Id)
        .paginate(&conn, size);
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
        .ok_or_else(|| framework::error::ApiError::NotFound)?;
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
        platform: Set(param.platform),
        name: Set(param.name),
        description: Set(param.description),
        start_date: Set(param.start_date),
        status: Set(param.status),
        legal_person: Set(param.legal_person),
        unified_code: Set(param.unified_code),
        website: Set(param.website),
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
        create_datetime: Set(Some(now.into())),
        update_datetime: Set(Some(now.into())),
    };
    let result = Company::insert(active_model).exec(&conn).await?;
    let company = Company::find_by_id(result.last_insert_id)
        .one(&conn)
        .await?
        .ok_or_else(|| framework::error::ApiError::NotFound)?;
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
        .ok_or_else(|| framework::error::ApiError::NotFound)?;
    
    let active_model = company::ActiveModel {
        id: Set(id.clone()),
        platform: Set(param.platform.or(existing.platform)),
        name: Set(param.name.or(existing.name)),
        description: Set(param.description.or(existing.description)),
        start_date: Set(param.start_date.or(existing.start_date)),
        status: Set(param.status.or(existing.status)),
        legal_person: Set(param.legal_person.or(existing.legal_person)),
        unified_code: Set(param.unified_code.or(existing.unified_code)),
        website: Set(param.website.or(existing.website)),
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
        source_refresh_datetime: Set(param.source_refresh_datetime.or(existing.source_refresh_datetime)),
        update_datetime: Set(Some(chrono::Utc::now().into())),
        ..Default::default()
    };
    Company::update(active_model).exec(&conn).await?;
    let company = Company::find_by_id(&id)
        .one(&conn)
        .await?
        .ok_or_else(|| framework::error::ApiError::NotFound)?;
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
        .ok_or_else(|| framework::error::ApiError::NotFound)?;
    Company::delete(company.into_active_model()).exec(&conn).await?;
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
}

#[derive(Default, Deserialize, Serialize, Debug, Clone, Validate, ToSchema)]
pub struct CreateCompanyRequest {
    pub id: Option<String>,
    pub platform: Option<String>,
    pub name: Option<String>,
    pub description: Option<String>,
    pub start_date: Option<NaiveDate>,
    pub status: Option<String>,
    pub legal_person: Option<String>,
    pub unified_code: Option<String>,
    pub website: Option<String>,
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
}

#[derive(Default, Deserialize, Serialize, Debug, Clone, Validate, ToSchema)]
pub struct UpdateCompanyRequest {
    pub platform: Option<String>,
    pub name: Option<String>,
    pub description: Option<String>,
    pub start_date: Option<NaiveDate>,
    pub status: Option<String>,
    pub legal_person: Option<String>,
    pub unified_code: Option<String>,
    pub website: Option<String>,
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
}
