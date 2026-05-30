use std::collections::{HashMap, HashSet};

use chrono::{DateTime, FixedOffset, Utc};
use entity::company::{ActiveModel as CompanyActiveModel, Entity as Company};
use entity::company_source::{
    ActiveModel as CompanySourceActiveModel, Model as CompanySourceModel,
};

use crate::common::file_parser::{CompanyHeaderMapping, FileParser};
use crate::sync::common::{
    BATCH_SIZE, get_f64, get_field_value, get_i32, get_string, parse_datetime,
};
use crate::sync::error::ImportError;
use crate::sync::types::{ImportError as ImportErrorType, ImportResult};
use crate::util::{gen_company_id, gen_source_id};
use sea_orm::{
    ActiveModelTrait, ActiveValue, ColumnTrait, ConnectionTrait, DbErr, EntityTrait,
    IntoActiveModel, QueryFilter, TryIntoModel,
};

pub struct CompanyImporter;

impl CompanyImporter {
    pub async fn import<C: ConnectionTrait>(
        conn: &C,
        data: Vec<Vec<String>>,
        uri: &str,
    ) -> Result<ImportResult, ImportError> {
        let start_time = std::time::Instant::now();

        // 空数据处理
        if data.is_empty() {
            return Ok(ImportResult {
                success: true,
                valid_result: true,
                data_version: 0,
                actual_version: 0,
                lack_columns: vec![],
                valid_columns: vec![],
                total: 0,
                imported: 0,
                updated: 0,
                cost_time: 0,
                errors: vec![],
                warnings: vec![],
            });
        }

        let headers = &data[0];

        // 验证表头
        let (valid, version, actual_version, lack_columns, warnings) =
            FileParser::validate_company_headers(headers);
        if !valid {
            let errors: Vec<ImportErrorType> = lack_columns
                .iter()
                .map(|field| ImportErrorType::MissingRequiredField {
                    row: 1,
                    field: field.clone(),
                })
                .collect();
            return Ok(ImportResult {
                success: false,
                valid_result: false,
                data_version: version,
                actual_version,
                lack_columns: lack_columns.clone(),
                valid_columns: FileParser::get_company_valid_columns(actual_version),
                total: 0,
                imported: 0,
                updated: 0,
                cost_time: start_time.elapsed().as_millis() as i64,
                errors,
                warnings,
            });
        }

        let mapping = FileParser::parse_company_headers(headers, actual_version);
        let rows = data[1..].to_vec();
        let total = rows.len();
        let now = Utc::now();
        let mapping = mapping.clone();
        let headers = headers.clone();
        let uri = uri.to_string();
        let mut company_ids_from_data: HashSet<String> = HashSet::new();
        let mut company_source_map: HashMap<String, CompanySourceActiveModel> = HashMap::new();

        // 根据文件的rows构建company source列表
        let mut errors: Vec<ImportErrorType> = Vec::new();
        for (row_index, row) in rows.iter().enumerate() {
            let company_name = get_field_value(&mapping.name, row);
            if company_name.is_empty() {
                continue;
            }

            let company_id = gen_company_id(&company_name);
            let company_source_id = gen_source_id(&company_id, &uri);

            match Self::build_company_source(
                company_source_id.as_str(),
                company_id.as_str(),
                &mapping,
                &headers,
                row,
                &now,
                &uri,
                row_index + 1,
            ) {
                Ok(model) => {
                    company_ids_from_data.insert(company_source_id.clone());
                    company_source_map.insert(company_source_id.clone(), model);
                }
                Err(e) => {
                    if let Some(import_err) = e.downcast_ref::<ImportErrorType>() {
                        errors.push(import_err.clone());
                    } else {
                        errors.push(ImportErrorType::InvalidInteger {
                            row: row_index + 1,
                            field: "unknown".to_string(),
                            value: e.to_string(),
                        });
                    }
                }
            }
        }

        // 如果有解析错误，直接返回
        if !errors.is_empty() {
            return Ok(ImportResult {
                success: false,
                valid_result: true,
                data_version: version,
                actual_version,
                lack_columns: vec![],
                valid_columns: FileParser::get_company_valid_columns(actual_version),
                total,
                imported: 0,
                updated: 0,
                cost_time: start_time.elapsed().as_millis() as i64,
                errors,
                warnings: vec![],
            });
        }

        // 根据company_source id获取已存在的数据
        let exists_company_source =
            Self::batch_query_company_sources(company_ids_from_data.into_iter().collect(), conn)
                .await?;

        // 过滤数据库中已存在的company_source记录
        let exists_company_source_ids: Vec<String> = exists_company_source
            .iter()
            .map(|item| item.id.clone())
            .collect();
        for id in exists_company_source_ids {
            company_source_map.remove(&id);
        }

        let filter_company_source: Vec<entity::company_source::ActiveModel> =
            company_source_map.into_values().collect();

        // 保存过滤后的company_source记录
        Self::batch_insert_company_sources(filter_company_source.clone(), conn).await?;

        // 构建 company_id 到 company_source 的映射
        let mut filter_company_id_and_source_map = HashMap::new();
        let mut company_ids = Vec::new();
        for item in filter_company_source {
            let model = item
                .try_into_model()
                .map_err(|e| DbErr::Query(sea_orm::RuntimeErr::Internal(e.to_string())))?;
            let company_id = model.company_id.clone().ok_or_else(|| {
                DbErr::Query(sea_orm::RuntimeErr::Internal(
                    "company_id is empty".to_string(),
                ))
            })?;
            filter_company_id_and_source_map
                .insert(company_id.clone(), (model, company_id.clone()));
            company_ids.push(company_id);
        }

        // 查询已存在的company记录
        let exists_company = Self::batch_query_companies(company_ids, conn).await?;

        let exists_company_map: HashMap<&str, &entity::company::Model> = exists_company
            .iter()
            .map(|item| (item.id.as_str(), item))
            .collect();

        // 区分已存在和不存在company的记录
        let mut exists_company_source = Vec::new();
        let mut not_exists_company_source = Vec::new();
        for (_, company_id) in filter_company_id_and_source_map.values() {
            if exists_company_map.contains_key(company_id.as_str()) {
                exists_company_source.push(company_id.clone());
            } else {
                not_exists_company_source.push(company_id.clone());
            }
        }

        let mut insert_company = Vec::new();

        // 如果company不存在，则进行插入逻辑
        for company_id in not_exists_company_source {
            if let Some((source_model, _)) = filter_company_id_and_source_map.get(&company_id) {
                let now_fixed = now.fixed_offset();
                let company = Self::build_company(source_model, &now_fixed, &now_fixed)
                    .map_err(|e| DbErr::Query(sea_orm::RuntimeErr::Internal(e.to_string())))?;
                insert_company.push(company);
            }
        }

        let mut update_company_list = Vec::new();

        // 如果company已存在，则进行更新处理逻辑
        for company_id in exists_company_source {
            let (source_model, _) = filter_company_id_and_source_map
                .get(&company_id)
                .ok_or_else(|| {
                    DbErr::Query(sea_orm::RuntimeErr::Internal(
                        "can't find company source".to_string(),
                    ))
                })?;

            let existing_company =
                exists_company_map.get(company_id.as_str()).ok_or_else(|| {
                    DbErr::Query(sea_orm::RuntimeErr::Internal(
                        "can't find company".to_string(),
                    ))
                })?;

            let now_fixed = now.fixed_offset();
            let mut update_company = Self::build_company(source_model, &now_fixed, &now_fixed)
                .map_err(|e| DbErr::Query(sea_orm::RuntimeErr::Internal(e.to_string())))?;

            // 规则1: source_refresh_datetime更新时，从company_source重建company
            let existing_refresh = existing_company.source_refresh_datetime;
            let new_refresh = source_model.source_refresh_datetime;
            if let (Some(existing_dt), Some(new_dt)) = (existing_refresh, new_refresh)
                && new_dt > existing_dt
            {
                update_company = Self::build_company(source_model, &now_fixed, &now_fixed)
                    .map_err(|e| DbErr::Query(sea_orm::RuntimeErr::Internal(e.to_string())))?;
            }

            let active_model = update_company.into_active_model().reset_all();
            update_company_list.push(active_model);
        }

        let imported = insert_company.len();
        let updated = update_company_list.len();

        // 批量插入新company
        Self::batch_insert_companies(insert_company, conn).await?;

        // 更新已有company
        for item in update_company_list {
            item.update(conn).await?;
        }

        Ok(ImportResult {
            success: true,
            valid_result: true,
            data_version: version,
            actual_version,
            lack_columns: vec![],
            valid_columns: FileParser::get_company_valid_columns(actual_version),
            total,
            imported,
            updated,
            cost_time: start_time.elapsed().as_millis() as i64,
            errors: vec![],
            warnings,
        })
    }

    // 根据company_source id批量查询
    async fn batch_query_company_sources<C>(
        ids: Vec<String>,
        conn: &C,
    ) -> Result<Vec<CompanySourceModel>, DbErr>
    where
        C: ConnectionTrait,
    {
        let mut results = Vec::new();
        for chunk in ids.chunks(BATCH_SIZE) {
            let batch_results = entity::company_source::Entity::find()
                .filter(entity::company_source::Column::Id.is_in(chunk.to_vec()))
                .all(conn)
                .await?;
            results.extend(batch_results);
        }
        Ok(results)
    }

    // 批量插入company_source记录
    async fn batch_insert_company_sources<C>(
        sources: Vec<entity::company_source::ActiveModel>,
        conn: &C,
    ) -> Result<(), DbErr>
    where
        C: ConnectionTrait,
    {
        for chunk in sources.chunks(BATCH_SIZE) {
            entity::company_source::Entity::insert_many(chunk.to_vec())
                .exec(conn)
                .await?;
        }
        Ok(())
    }

    // 根据company id批量查询
    async fn batch_query_companies<C>(
        ids: Vec<String>,
        conn: &C,
    ) -> Result<Vec<entity::company::Model>, DbErr>
    where
        C: ConnectionTrait,
    {
        let mut results = Vec::new();
        for chunk in ids.chunks(BATCH_SIZE) {
            let batch_results = Company::find()
                .filter(entity::company::Column::Id.is_in(chunk.to_vec()))
                .all(conn)
                .await?;
            results.extend(batch_results);
        }
        Ok(results)
    }

    // 批量插入company记录
    async fn batch_insert_companies<C>(
        companies: Vec<entity::company::ActiveModel>,
        conn: &C,
    ) -> Result<(), DbErr>
    where
        C: ConnectionTrait,
    {
        for chunk in companies.chunks(BATCH_SIZE) {
            entity::company::Entity::insert_many(chunk.to_vec())
                .exec(conn)
                .await?;
        }
        Ok(())
    }

    // 根据CSV行构建company_source模型
    fn build_company_source(
        id: &str,
        company_id: &str,
        mapping: &CompanyHeaderMapping,
        headers: &[String],
        row: &[String],
        now: &DateTime<Utc>,
        uri: &str,
        row_index: usize,
    ) -> Result<CompanySourceActiveModel, Box<dyn std::error::Error>> {
        let row_idx = row_index + 1;

        let mut model = CompanySourceActiveModel {
            id: ActiveValue::set(id.to_string()),
            company_id: ActiveValue::set(Some(company_id.to_string())),
            name: ActiveValue::set(get_string(row, mapping.name)),
            desc: ActiveValue::set(get_string(row, mapping.description)),
            start_date: ActiveValue::set(
                parse_datetime(get_field_value(&mapping.start_date, row).as_str())?
                    .map(|dt| dt.fixed_offset()),
            ),
            status: ActiveValue::set(get_string(row, mapping.status)),
            legal_person: ActiveValue::set(get_string(row, mapping.legal_person)),
            unified_code: ActiveValue::set(get_string(row, mapping.unified_code)),
            web_site: ActiveValue::set(get_string(row, mapping.website)),
            insurance_num: ActiveValue::set(Some(get_i32(
                row,
                headers,
                mapping.insurance_num,
                row_idx,
            )?)),
            self_risk: ActiveValue::set(Some(get_i32(row, headers, mapping.self_risk, row_idx)?)),
            union_risk: ActiveValue::set(Some(get_i32(row, headers, mapping.union_risk, row_idx)?)),
            address: ActiveValue::set(get_string(row, mapping.address)),
            scope: ActiveValue::set(get_string(row, mapping.scope)),
            tax_no: ActiveValue::set(get_string(row, mapping.tax_no)),
            industry: ActiveValue::set(get_string(row, mapping.industry)),
            license_number: ActiveValue::set(get_string(row, mapping.license_number)),
            longitude: ActiveValue::set(Some(get_f64(row, headers, mapping.longitude, row_idx)?)),
            latitude: ActiveValue::set(Some(get_f64(row, headers, mapping.latitude, row_idx)?)),
            source_url: ActiveValue::set(get_string(row, mapping.source_url)),
            source_platform: ActiveValue::set(get_string(row, mapping.platform)),
            source_record_id: ActiveValue::set(get_string(row, mapping.source_record_id)),
            source_refresh_datetime: ActiveValue::Set(None),
            reg_capital_value: ActiveValue::set(Some(get_f64(
                row,
                headers,
                mapping.reg_capital_value,
                row_idx,
            )?)),
            reg_capital_currency: ActiveValue::set(get_string(row, mapping.reg_capital_currency)),
            paidin_capital_value: ActiveValue::set(None),
            paidin_capital_currency: ActiveValue::set(None),
            uri: ActiveValue::set(Some(uri.to_string())),
            publish_datetime: ActiveValue::set(None),
            create_datetime: ActiveValue::set(None),
            update_datetime: ActiveValue::set(None),
        };

        // 解析 source_refresh_datetime
        if let Some(dt_str) = get_string(row, mapping.source_refresh_datetime) {
            if let Ok(dt) = DateTime::parse_from_rfc3339(&dt_str) {
                model.source_refresh_datetime =
                    ActiveValue::Set(Some(dt.with_timezone(&Utc).fixed_offset()));
            } else {
                model.source_refresh_datetime = ActiveValue::Set(Some(now.fixed_offset()));
            }
        }

        // 解析 create_datetime
        if let Some(dt_str) = get_string(row, mapping.create_datetime)
            && let Ok(dt) = DateTime::parse_from_rfc3339(&dt_str)
        {
            model.create_datetime = ActiveValue::Set(Some(dt.with_timezone(&Utc).fixed_offset()));
            model.update_datetime = ActiveValue::Set(Some(dt.with_timezone(&Utc).fixed_offset()));
            model.publish_datetime = ActiveValue::Set(Some(dt.with_timezone(&Utc).fixed_offset()));
        } else {
            model.publish_datetime = ActiveValue::Set(Some(now.fixed_offset()));
        }

        model.create_datetime = ActiveValue::Set(Some(now.fixed_offset()));
        model.update_datetime = ActiveValue::Set(Some(now.fixed_offset()));

        Ok(model)
    }

    // 根据company_source构建company模型
    fn build_company(
        source: &CompanySourceModel,
        update_datetime: &DateTime<FixedOffset>,
        create_datetime: &DateTime<FixedOffset>,
    ) -> Result<CompanyActiveModel, Box<dyn std::error::Error>> {
        Ok(CompanyActiveModel {
            id: ActiveValue::set(
                source
                    .company_id
                    .clone()
                    .ok_or("company_source company_id is required")?,
            ),
            name: ActiveValue::set(source.name.clone()),
            desc: ActiveValue::set(source.desc.clone()),
            start_date: ActiveValue::set(source.start_date),
            status: ActiveValue::set(source.status.clone()),
            legal_person: ActiveValue::set(source.legal_person.clone()),
            unified_code: ActiveValue::set(source.unified_code.clone()),
            web_site: ActiveValue::set(source.web_site.clone()),
            insurance_num: ActiveValue::set(source.insurance_num),
            self_risk: ActiveValue::set(source.self_risk),
            union_risk: ActiveValue::set(source.union_risk),
            address: ActiveValue::set(source.address.clone()),
            scope: ActiveValue::set(source.scope.clone()),
            tax_no: ActiveValue::set(source.tax_no.clone()),
            industry: ActiveValue::set(source.industry.clone()),
            license_number: ActiveValue::set(source.license_number.clone()),
            longitude: ActiveValue::set(source.longitude),
            latitude: ActiveValue::set(source.latitude),
            source_url: ActiveValue::set(source.source_url.clone()),
            source_platform: ActiveValue::set(source.source_platform.clone()),
            source_record_id: ActiveValue::set(source.source_record_id.clone()),
            source_refresh_datetime: ActiveValue::set(source.source_refresh_datetime),
            reg_capital_value: ActiveValue::set(source.reg_capital_value),
            reg_capital_currency: ActiveValue::set(source.reg_capital_currency.clone()),
            paidin_capital_value: ActiveValue::set(source.paidin_capital_value),
            paidin_capital_currency: ActiveValue::set(source.paidin_capital_currency.clone()),
            uri: ActiveValue::set(source.uri.clone()),
            publish_datetime: ActiveValue::set(source.publish_datetime),
            create_datetime: ActiveValue::set(Some(*create_datetime)),
            update_datetime: ActiveValue::set(Some(*update_datetime)),
        })
    }
}
