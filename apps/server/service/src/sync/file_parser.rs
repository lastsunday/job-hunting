use calamine::{open_workbook, Data, Reader, Xlsx};
use std::fs::File;
use std::io::{BufReader, Cursor};

use crate::sync::types::ImportResult;

pub struct FileParser;

impl FileParser {
    pub fn parse_job_file(file_path: &str) -> Result<Vec<Vec<String>>, String> {
        Self::parse_excel(file_path)
    }

    pub fn parse_company_file(file_path: &str) -> Result<Vec<Vec<String>>, String> {
        Self::parse_excel(file_path)
    }

    fn parse_excel(file_path: &str) -> Result<Vec<Vec<String>>, String> {
        let mut workbook: Xlsx<BufReader<File>> =
            open_workbook(file_path).map_err(|e| format!("Failed to open workbook: {}", e))?;

        let sheet_names = workbook.sheet_names().to_vec();
        let sheet = sheet_names
            .first()
            .ok_or_else(|| "No sheets found in workbook".to_string())?;

        let range = workbook
            .worksheet_range(sheet)
            .map_err(|e| format!("Failed to read sheet: {}", e))?;

        let mut result = Vec::new();

        for row in range.rows() {
            let mut row_data = Vec::new();
            for cell in row {
                let value = Self::cell_to_string(cell);
                row_data.push(value);
            }
            result.push(row_data);
        }

        Ok(result)
    }

    pub fn parse_job_file_from_bytes(data: &[u8]) -> Result<Vec<Vec<String>>, String> {
        use std::io::Write;
        let mut temp_file = tempfile::NamedTempFile::new()
            .map_err(|e| format!("Failed to create temp file: {}", e))?;
        temp_file
            .write_all(data)
            .map_err(|e| format!("Failed to write temp file: {}", e))?;
        let path = temp_file
            .path()
            .to_str()
            .ok_or_else(|| "Invalid temp file path".to_string())?;
        Self::parse_excel(path)
    }

    pub fn parse_company_file_from_bytes(data: &[u8]) -> Result<Vec<Vec<String>>, String> {
        use std::io::Write;
        let mut temp_file = tempfile::NamedTempFile::new()
            .map_err(|e| format!("Failed to create temp file: {}", e))?;
        temp_file
            .write_all(data)
            .map_err(|e| format!("Failed to write temp file: {}", e))?;
        let path = temp_file
            .path()
            .to_str()
            .ok_or_else(|| "Invalid temp file path".to_string())?;
        Self::parse_excel(path)
    }

    fn cell_to_string(cell: &calamine::Data) -> String {
        use calamine::Data;
        match cell {
            Data::String(s) => s.clone(),
            Data::Float(f) => f.to_string(),
            Data::Int(i) => i.to_string(),
            Data::Bool(b) => b.to_string(),
            Data::DateTime(dt) => dt.to_string(),
            Data::DateTimeIso(s) => s.clone(),
            Data::DurationIso(s) => s.clone(),
            Data::Error(e) => format!("Error: {:?}", e),
            Data::Empty => String::new(),
        }
    }

    pub fn parse_job_headers(headers: &[String]) -> JobHeaderMapping {
        let mut mapping = JobHeaderMapping::default();

        for (i, header) in headers.iter().enumerate() {
            let h = header.trim();
            match h {
                "职位自编号" => mapping.job_id = Some(i),
                "发布平台" => mapping.platform = Some(i),
                "职位访问地址" => mapping.url = Some(i),
                "职位" => mapping.name = Some(i),
                "公司" => mapping.company_name = Some(i),
                "公司是否为全称" => mapping.is_full_company_name = Some(i),
                "地区" => mapping.location_name = Some(i),
                "地址" => mapping.address = Some(i),
                "经度" => mapping.longitude = Some(i),
                "纬度" => mapping.latitude = Some(i),
                "职位描述" => mapping.description = Some(i),
                "学历" => mapping.degree_name = Some(i),
                "所需经验" => mapping.year = Some(i),
                "技能" => mapping.skill_tag = Some(i),
                "福利" => mapping.welfare_tag = Some(i),
                "最低薪资" => mapping.salary_min = Some(i),
                "最高薪资" => mapping.salary_max = Some(i),
                "几薪" => mapping.salary_total_month = Some(i),
                "首次发布时间" => mapping.first_publish_datetime = Some(i),
                "招聘人" => mapping.boss_name = Some(i),
                "招聘公司" => mapping.boss_company_name = Some(i),
                "招聘者职位" => mapping.boss_position = Some(i),
                "首次扫描日期" => mapping.create_datetime = Some(i),
                "记录更新日期" => mapping.update_datetime = Some(i),
                _ => {}
            }
        }
        mapping
    }

    pub fn parse_company_headers(headers: &[String]) -> CompanyHeaderMapping {
        let mut mapping = CompanyHeaderMapping::default();

        for (i, header) in headers.iter().enumerate() {
            let h = header.trim();
            match h {
                "公司" => mapping.name = Some(i),
                "公司描述" => mapping.description = Some(i),
                "成立时间" => mapping.start_date = Some(i),
                "经营状态" => mapping.status = Some(i),
                "法人" => mapping.legal_person = Some(i),
                "统一社会信用代码" => mapping.unified_code = Some(i),
                "官网" => mapping.website = Some(i),
                "社保人数" => mapping.insurance_num = Some(i),
                "自身风险数" => mapping.self_risk = Some(i),
                "关联风险数" => mapping.union_risk = Some(i),
                "地址" => mapping.address = Some(i),
                "经营范围" => mapping.scope = Some(i),
                "纳税人识别号" => mapping.tax_no = Some(i),
                "所属行业" => mapping.industry = Some(i),
                "工商注册号" => mapping.license_number = Some(i),
                "经度" => mapping.longitude = Some(i),
                "纬度" => mapping.latitude = Some(i),
                "注册资本" => mapping.reg_capital_value = Some(i),
                "注册资本货币" => mapping.reg_capital_currency = Some(i),
                "数据来源地址" => mapping.source_url = Some(i),
                "数据来源平台" => mapping.platform = Some(i),
                "数据来源记录编号" => mapping.source_record_id = Some(i),
                "数据来源更新时间" => mapping.source_refresh_datetime = Some(i),
                "记录创建日期" => mapping.create_datetime = Some(i),
                "记录更新日期" => mapping.update_datetime = Some(i),
                _ => {}
            }
        }
        mapping
    }
}

#[derive(Default)]
pub struct JobHeaderMapping {
    pub job_id: Option<usize>,
    pub platform: Option<usize>,
    pub url: Option<usize>,
    pub name: Option<usize>,
    pub company_name: Option<usize>,
    pub is_full_company_name: Option<usize>,
    pub location_name: Option<usize>,
    pub address: Option<usize>,
    pub longitude: Option<usize>,
    pub latitude: Option<usize>,
    pub description: Option<usize>,
    pub degree_name: Option<usize>,
    pub year: Option<usize>,
    pub skill_tag: Option<usize>,
    pub welfare_tag: Option<usize>,
    pub salary_min: Option<usize>,
    pub salary_max: Option<usize>,
    pub salary_total_month: Option<usize>,
    pub first_publish_datetime: Option<usize>,
    pub boss_name: Option<usize>,
    pub boss_company_name: Option<usize>,
    pub boss_position: Option<usize>,
    pub create_datetime: Option<usize>,
    pub update_datetime: Option<usize>,
}

#[derive(Default)]
pub struct CompanyHeaderMapping {
    pub name: Option<usize>,
    pub description: Option<usize>,
    pub start_date: Option<usize>,
    pub status: Option<usize>,
    pub legal_person: Option<usize>,
    pub unified_code: Option<usize>,
    pub website: Option<usize>,
    pub insurance_num: Option<usize>,
    pub self_risk: Option<usize>,
    pub union_risk: Option<usize>,
    pub address: Option<usize>,
    pub scope: Option<usize>,
    pub tax_no: Option<usize>,
    pub industry: Option<usize>,
    pub license_number: Option<usize>,
    pub longitude: Option<usize>,
    pub latitude: Option<usize>,
    pub reg_capital_value: Option<usize>,
    pub reg_capital_currency: Option<usize>,
    pub source_url: Option<usize>,
    pub platform: Option<usize>,
    pub source_record_id: Option<usize>,
    pub source_refresh_datetime: Option<usize>,
    pub create_datetime: Option<usize>,
    pub update_datetime: Option<usize>,
}
