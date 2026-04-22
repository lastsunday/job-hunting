use framework::{error::critical_code::CriticalErrorCode, prelude::*};

#[error]
pub enum CompanyErrorCode {
    NameRequired = 504001,
    NameImmutable = 504002,
}

use crate::{AppState, sync::SyncErrorCode};
use axum::{debug_handler, extract::Extension, extract::Path, extract::State};
use entity::company::{self, Entity as Company};
use framework::{
    auth::Principal,
    data::{ApiPageResult, ApiResponse, PageParam, empty_string_as_none, valid::ValidJson},
    error::{ApiError, ApiResult},
    middleware::get_auth_layer,
};
use sea_orm::{
    ColumnTrait, EntityTrait, IntoActiveModel, PaginatorTrait, QueryFilter, QueryOrder, QueryTrait,
};
use service::sync::{CompanyImporter, FileParser, ImportError};
use service::util::hash::{gen_add_or_update_uri, gen_company_id};
use utoipa::ToSchema;
use utoipa_axum::{
    router::{OpenApiRouter, UtoipaMethodRouterExt},
    routes,
};

const TAG: &str = "company";

const COMPANY_CSV_VERSION: usize = 2;

pub fn convert_company_to_csv_data(
    param: &CreateCompanyRequest,
    existing: Option<&company::Model>,
) -> Vec<Vec<String>> {
    let headers = FileParser::get_company_valid_columns(COMPANY_CSV_VERSION);
    let ex = existing.as_ref();

    let name = param
        .name
        .clone()
        .unwrap_or_else(|| ex.and_then(|e| e.name.clone()).unwrap_or_default());
    let desc = param
        .desc
        .clone()
        .unwrap_or_else(|| ex.and_then(|e| e.desc.clone()).unwrap_or_default());
    let status = param
        .status
        .clone()
        .unwrap_or_else(|| ex.and_then(|e| e.status.clone()).unwrap_or_default());
    let legal_person = param
        .legal_person
        .clone()
        .unwrap_or_else(|| ex.and_then(|e| e.legal_person.clone()).unwrap_or_default());
    let unified_code = param
        .unified_code
        .clone()
        .unwrap_or_else(|| ex.and_then(|e| e.unified_code.clone()).unwrap_or_default());
    let web_site = param
        .web_site
        .clone()
        .unwrap_or_else(|| ex.and_then(|e| e.web_site.clone()).unwrap_or_default());
    let insurance_num = param
        .insurance_num
        .or(ex.and_then(|e| e.insurance_num))
        .map(|v| v.to_string())
        .unwrap_or_default();
    let self_risk = param
        .self_risk
        .or(ex.and_then(|e| e.self_risk))
        .map(|v| v.to_string())
        .unwrap_or_default();
    let union_risk = param
        .union_risk
        .or(ex.and_then(|e| e.union_risk))
        .map(|v| v.to_string())
        .unwrap_or_default();
    let address = param
        .address
        .clone()
        .unwrap_or_else(|| ex.and_then(|e| e.address.clone()).unwrap_or_default());
    let scope = param
        .scope
        .clone()
        .unwrap_or_else(|| ex.and_then(|e| e.scope.clone()).unwrap_or_default());
    let tax_no = param
        .tax_no
        .clone()
        .unwrap_or_else(|| ex.and_then(|e| e.tax_no.clone()).unwrap_or_default());
    let industry = param
        .industry
        .clone()
        .unwrap_or_else(|| ex.and_then(|e| e.industry.clone()).unwrap_or_default());
    let license_number = param.license_number.clone().unwrap_or_else(|| {
        ex.and_then(|e| e.license_number.clone())
            .unwrap_or_default()
    });
    let longitude = param
        .longitude
        .or(ex.and_then(|e| e.longitude))
        .map(|v| v.to_string())
        .unwrap_or_default();
    let latitude = param
        .latitude
        .or(ex.and_then(|e| e.latitude))
        .map(|v| v.to_string())
        .unwrap_or_default();
    let start_date = param
        .start_date
        .or(ex.and_then(|e| e.start_date))
        .map(|v| v.to_rfc3339())
        .unwrap_or_default();

    let reg_capital_value = param
        .reg_capital_value
        .or(ex.and_then(|e| e.reg_capital_value))
        .map(|v| v.to_string())
        .unwrap_or_default();
    let reg_capital_currency = param.reg_capital_currency.clone().unwrap_or_else(|| {
        ex.and_then(|e| e.reg_capital_currency.clone())
            .unwrap_or_default()
    });
    let source_url = param
        .source_url
        .clone()
        .unwrap_or_else(|| ex.and_then(|e| e.source_url.clone()).unwrap_or_default());
    let source_platform = param.source_platform.clone().unwrap_or_else(|| {
        ex.and_then(|e| e.source_platform.clone())
            .unwrap_or_default()
    });
    let source_refresh_datetime = param
        .source_refresh_datetime
        .or(ex.and_then(|e| e.source_refresh_datetime))
        .map(|v| v.to_rfc3339())
        .unwrap_or_default();
    let source_record_id = param.source_record_id.clone().unwrap_or_else(|| {
        ex.and_then(|e| e.source_record_id.clone())
            .unwrap_or_default()
    });
    let create_datetime = ex
        .and_then(|e| e.create_datetime)
        .map(|v| v.to_rfc3339())
        .unwrap_or_default();

    let row = vec![
        name,
        desc,
        start_date,
        status,
        legal_person,
        unified_code,
        web_site,
        insurance_num,
        self_risk,
        union_risk,
        address,
        scope,
        tax_no,
        industry,
        license_number,
        longitude,
        latitude,
        reg_capital_value,
        reg_capital_currency,
        source_url,
        source_platform,
        source_record_id,
        source_refresh_datetime,
        chrono::Utc::now().to_rfc3339(),
        create_datetime,
        chrono::Utc::now().to_rfc3339(),
    ];
    vec![headers, row]
}

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
        .route_layer(get_auth_layer())
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
        .ok_or(err!(CriticalErrorCode::ResourceNotFound))?;
    Ok(ApiResponse::success(Some(company)))
}

#[debug_handler]
#[utoipa::path(post, path = "/company",tag=TAG,security(()),request_body = CreateCompanyRequest,responses(
    (status=OK,body=ApiResponse<company::Model>)
))]
pub async fn create(
    State(AppState { conn }): State<AppState>,
    Extension(principal): Extension<Principal>,
    ValidJson(param): ValidJson<CreateCompanyRequest>,
) -> ApiResult<ApiResponse<company::Model>> {
    let company_id = {
        match &param.name {
            Some(name) => {
                if name.trim().is_empty() {
                    Err(err!(CompanyErrorCode::NameRequired))
                } else {
                    Ok(gen_company_id(name))
                }
            }
            None => Err(err!(CompanyErrorCode::NameRequired)),
        }
    }?;
    let csv_data = convert_company_to_csv_data(&param, None);
    let uri = gen_add_or_update_uri(&principal.name, COMPANY_CSV_VERSION, &csv_data);

    CompanyImporter::import(&conn, csv_data, &uri)
        .await
        .map_err(|e: service::sync::ImportError| match e {
            ImportError::Database(e) => ApiError::from(e),
            _ => err!(SyncErrorCode::ImportFailed),
        })?;

    let company = Company::find_by_id(&company_id)
        .one(&conn)
        .await?
        .ok_or(err!(CriticalErrorCode::ResourceNotFound))?;
    Ok(ApiResponse::success(Some(company)))
}

#[debug_handler]
#[utoipa::path(put, path = "/company/{id}",tag=TAG,security(()),request_body = UpdateCompanyRequest,responses(
    (status=OK,body=ApiResponse<company::Model>)
))]
pub async fn update(
    State(AppState { conn }): State<AppState>,
    Extension(principal): Extension<Principal>,
    Path(id): Path<String>,
    ValidJson(param): ValidJson<UpdateCompanyRequest>,
) -> ApiResult<ApiResponse<company::Model>> {
    let existing = Company::find_by_id(&id)
        .one(&conn)
        .await?
        .ok_or(err!(CriticalErrorCode::ResourceNotFound))?;

    let param_name = param.name.clone();
    let param_desc = param.desc.clone();
    let param_status = param.status.clone();
    let param_start_date = param.start_date;
    let param_legal_person = param.legal_person.clone();
    let param_unified_code = param.unified_code.clone();
    let param_web_site = param.web_site.clone();
    let param_source_platform = param.source_platform.clone();
    let param_source_refresh_datetime = param.source_refresh_datetime;
    let param_insurance_num = param.insurance_num;
    let param_self_risk = param.self_risk;
    let param_union_risk = param.union_risk;
    let param_address = param.address.clone();
    let param_scope = param.scope.clone();
    let param_tax_no = param.tax_no.clone();
    let param_industry = param.industry.clone();
    let param_license_number = param.license_number.clone();
    let param_longitude = param.longitude;
    let param_latitude = param.latitude;
    let param_reg_capital_value = param.reg_capital_value;
    let param_reg_capital_currency = param.reg_capital_currency.clone();
    let param_source_url = param.source_url.clone();
    let param_source_record_id = param.source_record_id.clone();
    let param_paidin_capital_value = param.paidin_capital_value;
    let param_paidin_capital_currency = param.paidin_capital_currency.clone();
    let param_uri = param.uri;

    if let Some(ref new_name) = param_name
        && existing.name.as_deref() != Some(new_name)
    {
        return Err(err!(CompanyErrorCode::NameImmutable));
    }

    let param: CreateCompanyRequest = CreateCompanyRequest {
        id: Some(id.clone()),
        name: param_name,
        desc: param_desc,
        start_date: param_start_date,
        status: param_status,
        legal_person: param_legal_person,
        unified_code: param_unified_code,
        web_site: param_web_site,
        source_platform: param_source_platform,
        source_refresh_datetime: param_source_refresh_datetime,
        insurance_num: param_insurance_num,
        self_risk: param_self_risk,
        union_risk: param_union_risk,
        address: param_address,
        scope: param_scope,
        tax_no: param_tax_no,
        industry: param_industry,
        license_number: param_license_number,
        longitude: param_longitude,
        latitude: param_latitude,
        reg_capital_value: param_reg_capital_value,
        reg_capital_currency: param_reg_capital_currency,
        source_url: param_source_url,
        source_record_id: param_source_record_id,
        paidin_capital_value: param_paidin_capital_value,
        paidin_capital_currency: param_paidin_capital_currency,
        uri: param_uri,
    };
    let csv_data = convert_company_to_csv_data(&param, Some(&existing));
    let uri = gen_add_or_update_uri(&principal.name, COMPANY_CSV_VERSION, &csv_data);

    CompanyImporter::import(&conn, csv_data, &uri)
        .await
        .map_err(|e: service::sync::ImportError| match e {
            ImportError::Database(e) => ApiError::from(e),
            _ => err!(SyncErrorCode::ImportFailed),
        })?;

    let company = Company::find_by_id(&id)
        .one(&conn)
        .await?
        .ok_or(err!(CriticalErrorCode::ResourceNotFound))?;
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
        .ok_or(err!(CriticalErrorCode::ResourceNotFound))?;
    Company::delete(company.into_active_model())
        .exec(&conn)
        .await?;
    Ok(ApiResponse::success(Some("Deleted".to_string())))
}

use chrono::{DateTime, FixedOffset};
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
    #[serde(default, deserialize_with = "empty_string_as_none")]
    pub start_date_start: Option<DateTime<FixedOffset>>,
    #[serde(default, deserialize_with = "empty_string_as_none")]
    pub start_date_end: Option<DateTime<FixedOffset>>,
    pub address: Option<String>,
    pub status: Option<String>,
    pub order_by: Option<String>,
    pub order_dir: Option<String>,
}

#[derive(Default, Deserialize, Serialize, Debug, Clone, Validate, ToSchema)]
pub struct CreateCompanyRequest {
    pub id: Option<String>,
    pub name: Option<String>,
    pub desc: Option<String>,
    #[serde(default, deserialize_with = "empty_string_as_none")]
    pub start_date: Option<DateTime<FixedOffset>>,
    pub status: Option<String>,
    pub legal_person: Option<String>,
    pub unified_code: Option<String>,
    pub web_site: Option<String>,
    pub source_platform: Option<String>,
    #[serde(default, deserialize_with = "empty_string_as_none")]
    pub source_refresh_datetime: Option<DateTime<FixedOffset>>,
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
    pub paidin_capital_value: Option<f64>,
    pub paidin_capital_currency: Option<String>,
    pub uri: Option<String>,
}

#[derive(Default, Deserialize, Serialize, Debug, Clone, Validate, ToSchema)]
pub struct UpdateCompanyRequest {
    pub name: Option<String>,
    pub desc: Option<String>,
    #[serde(default, deserialize_with = "empty_string_as_none")]
    pub start_date: Option<DateTime<FixedOffset>>,
    pub status: Option<String>,
    pub legal_person: Option<String>,
    pub unified_code: Option<String>,
    pub web_site: Option<String>,
    pub source_platform: Option<String>,
    #[serde(default, deserialize_with = "empty_string_as_none")]
    pub source_refresh_datetime: Option<DateTime<FixedOffset>>,
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
    pub paidin_capital_value: Option<f64>,
    pub paidin_capital_currency: Option<String>,
    pub uri: Option<String>,
}
