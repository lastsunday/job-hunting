use std::collections::{HashMap, HashSet};

use chrono::{DateTime, FixedOffset, TimeZone, Utc};
use entity::company::{ActiveModel as CompanyActiveModel, Entity as Company};
use entity::company_source::{
    ActiveModel as CompanySourceActiveModel, Entity as CompanySource, Model as CompanySourceModel,
};

use crate::sync::error::ImportError;
use crate::sync::file_parser::{CompanyHeaderMapping, FileParser};
use crate::sync::types::{ImportError as ImportErrorType, ImportResult};
use crate::util::gen_sha256;
use sea_orm::{
    ActiveModelTrait, ActiveValue, ColumnTrait, ConnectionTrait, DatabaseConnection, DbErr,
    EntityTrait, IntoActiveModel, QueryFilter, TransactionTrait, TryIntoModel,
};

pub struct CompanyImporter;

impl CompanyImporter {
    const BATCH_SIZE: usize = 900;

    async fn batch_query_company_sources<C>(
        ids: Vec<String>,
        conn: &C,
    ) -> Result<Vec<CompanySourceModel>, DbErr>
    where
        C: ConnectionTrait,
    {
        let mut results = Vec::new();
        for chunk in ids.chunks(Self::BATCH_SIZE) {
            let batch_results = CompanySource::find()
                .filter(entity::company_source::Column::Id.is_in(chunk.to_vec()))
                .all(conn)
                .await?;
            results.extend(batch_results);
        }
        Ok(results)
    }

    async fn batch_insert_company_sources<C>(
        sources: Vec<entity::company_source::ActiveModel>,
        conn: &C,
    ) -> Result<(), DbErr>
    where
        C: ConnectionTrait,
    {
        for chunk in sources.chunks(Self::BATCH_SIZE) {
            entity::company_source::Entity::insert_many(chunk.to_vec())
                .exec(conn)
                .await?;
        }
        Ok(())
    }

    async fn batch_insert_companys<C>(
        companys: Vec<entity::company::ActiveModel>,
        conn: &C,
    ) -> Result<(), DbErr>
    where
        C: ConnectionTrait,
    {
        for chunk in companys.chunks(Self::BATCH_SIZE) {
            entity::company::Entity::insert_many(chunk.to_vec())
                .exec(conn)
                .await?;
        }
        Ok(())
    }

    pub async fn import(
        conn: &DatabaseConnection,
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
        let now = Utc::now().with_timezone(&FixedOffset::west_opt(0).unwrap());

        // 使用闭包事务，自动处理提交/回滚
        let result = conn
            .transaction::<_, _, DbErr>(|txn| {
                let mapping = mapping.clone();
                let headers = headers.clone();
                let uri = uri.to_string();
                Box::pin(async move {
                    let mut company_ids_from_data: HashSet<String> = HashSet::new();
                    let mut company_source_map: HashMap<String, CompanySourceActiveModel> =
                        HashMap::new();

                    // 根据文件的rows构建company source列表
                    let mut errors: Vec<ImportErrorType> = Vec::new();
                    for (row_index, row) in rows.iter().enumerate() {
                        let company_name = Self::get_field_value(&mapping.name, row);
                        if company_name.is_empty() {
                            continue;
                        }

                        let company_id = Self::gen_company_id(&company_name);
                        let company_source_id = Self::gen_company_source_id(&company_id, &uri);

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
                    let exists_company_source = Self::batch_query_company_sources(
                        company_ids_from_data.into_iter().collect(),
                        txn,
                    )
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
                    Self::batch_insert_company_sources(filter_company_source.clone(), txn).await?;

                    // 构建 company_id 到 company_source 的映射
                    let mut filter_company_id_and_source_map = HashMap::new();
                    let mut company_ids = Vec::new();
                    for item in filter_company_source {
                        let model = item.try_into_model().map_err(|e| {
                            DbErr::Query(sea_orm::RuntimeErr::Internal(e.to_string()))
                        })?;
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
                    let exists_company = Self::batch_query_companys(company_ids, txn).await?;

                    let exists_company_map: HashMap<&str, &entity::company::Model> = exists_company
                        .iter()
                        .map(|item| (item.id.as_str(), item))
                        .collect();

                    let mut exists_company_source = Vec::new();
                    let mut not_exists_company_source = Vec::new();
                    for (_, (_, company_id)) in &filter_company_id_and_source_map {
                        if exists_company_map.contains_key(company_id.as_str()) {
                            exists_company_source.push(company_id.clone());
                        } else {
                            not_exists_company_source.push(company_id.clone());
                        }
                    }

                    let mut insert_company = Vec::new();

                    // 如果company不存在，则进行插入逻辑
                    for company_id in not_exists_company_source {
                        if let Some((source_model, _)) =
                            filter_company_id_and_source_map.get(&company_id)
                        {
                            let company =
                                Self::build_company(source_model, &now, &now).map_err(|e| {
                                    DbErr::Query(sea_orm::RuntimeErr::Internal(e.to_string()))
                                })?;
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

                        let mut update_company = Self::build_company(source_model, &now, &now)
                            .map_err(|e| {
                                DbErr::Query(sea_orm::RuntimeErr::Internal(e.to_string()))
                            })?;

                        // 规则1: source_refresh_datetime更新时，从company_source重建company
                        let existing_refresh = existing_company.source_refresh_datetime;
                        let new_refresh = source_model.source_refresh_datetime;
                        if let (Some(existing_dt), Some(new_dt)) = (existing_refresh, new_refresh) {
                            if new_dt > existing_dt {
                                // 从 company_source 重建
                                update_company = Self::build_company(source_model, &now, &now)
                                    .map_err(|e| {
                                        DbErr::Query(sea_orm::RuntimeErr::Internal(e.to_string()))
                                    })?;
                            }
                        }

                        let active_model = update_company.into_active_model().reset_all();
                        update_company_list.push(active_model);
                    }

                    let imported = insert_company.len();
                    let updated = update_company_list.len();

                    // 批量插入新company
                    Self::batch_insert_companys(insert_company, txn).await?;

                    // 更新已有company
                    for item in update_company_list {
                        item.update(txn).await?;
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
                })
            })
            .await
            .map_err(|e| match e {
                sea_orm::TransactionError::Connection(db_err) => db_err,
                sea_orm::TransactionError::Transaction(db_err) => db_err,
            })?;

        Ok(result)
    }

    async fn batch_query_companys<C>(
        ids: Vec<String>,
        conn: &C,
    ) -> Result<Vec<entity::company::Model>, DbErr>
    where
        C: ConnectionTrait,
    {
        let mut results = Vec::new();
        for chunk in ids.chunks(Self::BATCH_SIZE) {
            let batch_results = Company::find()
                .filter(entity::company::Column::Id.is_in(chunk.to_vec()))
                .all(conn)
                .await?;
            results.extend(batch_results);
        }
        Ok(results)
    }

    fn get_field_value(field_idx: &Option<usize>, row: &[String]) -> String {
        match field_idx {
            Some(idx) if *idx < row.len() => row[*idx].clone(),
            _ => String::new(),
        }
    }

    fn gen_company_id(company_name: &str) -> String {
        let converted = company_name.replace('（', "(").replace('）', ")");
        gen_sha256(converted.as_str())
    }

    fn gen_company_source_id(company_id: &str, uri: &str) -> String {
        gen_sha256(format!("{}_{}", company_id, uri).as_str())
    }

    fn build_company_source(
        id: &str,
        company_id: &str,
        mapping: &CompanyHeaderMapping,
        headers: &[String],
        row: &[String],
        now: &DateTime<FixedOffset>,
        uri: &str,
        row_index: usize,
    ) -> Result<CompanySourceActiveModel, Box<dyn std::error::Error>> {
        let get_string = |idx: Option<usize>| -> Option<String> {
            idx.and_then(|i| row.get(i).map(|s| s.trim().to_string()))
                .filter(|s| !s.is_empty())
        };

        let get_field_name = |idx: Option<usize>| -> String {
            idx.and_then(|i| headers.get(i).map(|s| s.trim().to_string()))
                .unwrap_or_default()
        };

        let get_f64 = |idx: Option<usize>| -> Result<f64, Box<dyn std::error::Error>> {
            let field_name = get_field_name(idx);
            match idx {
                Some(i) if i < row.len() => {
                    let s = &row[i];
                    let trimmed = s.trim();
                    if trimmed.is_empty() {
                        Ok(0.0)
                    } else {
                        trimmed.parse::<f64>()
                            .map_err(|_| {
                                ImportErrorType::InvalidFloat {
                                    row: row_index + 1,
                                    field: field_name,
                                    value: trimmed.to_string(),
                                }
                            }.into())
                    }
                }
                _ => Ok(0.0),
            }
        };

        let get_i32 = |idx: Option<usize>| -> Result<i32, Box<dyn std::error::Error>> {
            let field_name = get_field_name(idx);
            match idx {
                Some(i) if i < row.len() => {
                    let s = &row[i];
                    let trimmed = s.trim();
                    if trimmed.is_empty() {
                        Ok(0)
                    } else {
                        trimmed.parse::<i32>()
                            .map_err(|_| {
                                ImportErrorType::InvalidInteger {
                                    row: row_index + 1,
                                    field: field_name,
                                    value: trimmed.to_string(),
                                }
                            }.into())
                    }
                }
                _ => Ok(0),
            }
        };

        let mut model = CompanySourceActiveModel {
            id: ActiveValue::set(id.to_string()),
            company_id: ActiveValue::set(Some(company_id.to_string())),
            name: ActiveValue::set(get_string(mapping.name)),
            desc: ActiveValue::set(get_string(mapping.description)),
            start_date: ActiveValue::set(Self::parse_datetime(
                Self::get_field_value(&mapping.start_date, row).as_str(),
            )?),
            status: ActiveValue::set(get_string(mapping.status)),
            legal_person: ActiveValue::set(get_string(mapping.legal_person)),
            unified_code: ActiveValue::set(get_string(mapping.unified_code)),
            web_site: ActiveValue::set(get_string(mapping.website)),
            insurance_num: ActiveValue::set(Some(get_i32(mapping.insurance_num)?)),
            self_risk: ActiveValue::set(Some(get_i32(mapping.self_risk)?)),
            union_risk: ActiveValue::set(Some(get_i32(mapping.union_risk)?)),
            address: ActiveValue::set(get_string(mapping.address)),
            scope: ActiveValue::set(get_string(mapping.scope)),
            tax_no: ActiveValue::set(get_string(mapping.tax_no)),
            industry: ActiveValue::set(get_string(mapping.industry)),
            license_number: ActiveValue::set(get_string(mapping.license_number)),
            longitude: ActiveValue::set(Some(get_f64(mapping.longitude)?)),
            latitude: ActiveValue::set(Some(get_f64(mapping.latitude)?)),
            source_url: ActiveValue::set(get_string(mapping.source_url)),
            source_platform: ActiveValue::set(get_string(mapping.platform)),
            source_record_id: ActiveValue::set(get_string(mapping.source_record_id)),
            source_refresh_datetime: ActiveValue::Set(None),
            reg_capital_value: ActiveValue::set(Some(get_f64(mapping.reg_capital_value)?)),
            reg_capital_currency: ActiveValue::set(get_string(mapping.reg_capital_currency)),
            paidin_capital_value: ActiveValue::set(None),
            paidin_capital_currency: ActiveValue::set(None),
            uri: ActiveValue::set(Some(uri.to_string())),
            publish_datetime: ActiveValue::set(None),
            create_datetime: ActiveValue::set(None),
            update_datetime: ActiveValue::set(None),
        };

        // 解析 source_refresh_datetime
        if let Some(dt_str) = get_string(mapping.source_refresh_datetime) {
            if let Ok(dt) = DateTime::parse_from_rfc3339(&dt_str) {
                model.source_refresh_datetime = ActiveValue::Set(Some(dt));
            } else {
                model.source_refresh_datetime = ActiveValue::Set(Some(*now));
            }
        }

        // 解析 create_datetime
        if let Some(dt_str) = get_string(mapping.create_datetime) {
            if let Ok(dt) = DateTime::parse_from_rfc3339(&dt_str) {
                model.create_datetime = ActiveValue::Set(Some(dt));
            }
        }

        // 解析 update_datetime
        if let Some(dt_str) = get_string(mapping.update_datetime) {
            if let Ok(dt) = DateTime::parse_from_rfc3339(&dt_str) {
                model.update_datetime = ActiveValue::Set(Some(dt));
                model.publish_datetime = ActiveValue::Set(Some(dt));
            } else {
                model.publish_datetime = ActiveValue::Set(Some(*now));
            }
        }

        model.create_datetime = ActiveValue::Set(Some(*now));
        model.update_datetime = ActiveValue::Set(Some(*now));

        Ok(model)
    }

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
            create_datetime: ActiveValue::set(Some(*create_datetime)),
            update_datetime: ActiveValue::set(Some(*update_datetime)),
        })
    }

    fn parse_datetime(
        s: &str,
    ) -> Result<Option<DateTime<FixedOffset>>, Box<dyn std::error::Error>> {
        if s.trim().is_empty() {
            return Ok(None);
        }
        if let Ok(dt) = DateTime::parse_from_rfc3339(s) {
            return Ok(Some(dt));
        }
        let naive = chrono::NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S")?;
        let offset = FixedOffset::east_opt(0).unwrap();
        Ok(Some(offset.from_utc_datetime(&naive)))
    }
}
