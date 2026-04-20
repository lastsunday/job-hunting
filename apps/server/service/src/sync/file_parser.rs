use std::io::Cursor;

use calamine::{Reader, Sheets, open_workbook_auto_from_rs};

use crate::sync::error::ImportError;
use crate::util::gen_bytes_sha256;

const HEADER_VERSION_PREFIX: &str = "__VERSION_";

pub struct FileParser;

impl FileParser {
    pub fn gen_version_header(version: usize) -> String {
        format!("{}{}", HEADER_VERSION_PREFIX, version)
    }

    pub fn parse_excel(data: &[u8]) -> Result<Vec<Vec<String>>, ImportError> {
        if data.is_empty() {
            return Err(ImportError::FileEmpty);
        }
        let data: Cursor<Vec<u8>> = Cursor::new(data.to_vec());
        let mut sheets: Sheets<_> = open_workbook_auto_from_rs(data)
            .map_err(|e| ImportError::ExcelParseFailed(e.to_string()))?;
        let sheet_names = sheets.sheet_names().to_vec();
        let sheet = sheet_names.first().ok_or(ImportError::NoSheetsFound)?;

        let range = sheets
            .worksheet_range(sheet)
            .map_err(|e| ImportError::ExcelParseFailed(e.to_string()))?;

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

    pub fn gen_file_sha256(value: &Vec<u8>) -> String {
        gen_bytes_sha256(value)
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

    pub fn parse_version(headers: &[String]) -> usize {
        for header in headers {
            let h = header.trim();
            if h.starts_with(HEADER_VERSION_PREFIX) {
                let number_string = h.replace(HEADER_VERSION_PREFIX, "");
                if let Ok(number) = number_string.parse::<usize>() {
                    return number;
                }
            }
        }
        0
    }

    pub fn get_job_headers(version: usize) -> Vec<String> {
        Self::get_valid_columns(version, Self::JOB_FILE_HEADER)
    }

    const JOB_FILE_HEADER: &[&[&str]] = &[
        &[
            "职位自编号",
            "发布平台",
            "职位访问地址",
            "职位",
            "公司",
            "公司是否为全称",
            "地区",
            "地址",
            "经度",
            "纬度",
            "职位描述",
            "学历",
            "所需经验",
            "最低薪资",
            "最高薪资",
            "首次发布时间",
            "招聘人",
            "招聘公司",
            "招聘者职位",
            "首次扫描日期",
            "记录更新日期",
        ],
        &[
            "职位自编号",
            "发布平台",
            "职位访问地址",
            "职位",
            "公司",
            "公司是否为全称",
            "地区",
            "地址",
            "经度",
            "纬度",
            "职位描述",
            "学历",
            "所需经验",
            "技能",
            "福利",
            "最低薪资",
            "最高薪资",
            "首次发布时间",
            "招聘人",
            "招聘公司",
            "招聘者职位",
            "首次扫描日期",
            "记录更新日期",
        ],
    ];

    const COMPANY_FILE_HEADER: &[&[&str]] = &[
        &[
            "公司",
            "公司描述",
            "成立时间",
            "经营状态",
            "法人",
            "统一社会信用代码",
            "官网",
            "社保人数",
            "自身风险数",
            "关联风险数",
            "地址",
            "经营范围",
            "纳税人识别号",
            "所属行业",
            "工商注册号",
            "经度",
            "纬度",
            "数据来源地址",
            "数据来源平台",
            "数据来源记录编号",
            "数据来源更新时间",
        ],
        &[
            "公司",
            "公司描述",
            "成立时间",
            "经营状态",
            "法人",
            "统一社会信用代码",
            "官网",
            "社保人数",
            "自身风险数",
            "关联风险数",
            "地址",
            "经营范围",
            "纳税人识别号",
            "所属行业",
            "工商注册号",
            "经度",
            "纬度",
            "数据来源地址",
            "数据来源平台",
            "数据来源记录编号",
            "数据来源更新时间",
            "记录创建日期",
            "记录更新日期",
        ],
        &[
            "公司",
            "公司描述",
            "成立时间",
            "经营状态",
            "法人",
            "统一社会信用代码",
            "官网",
            "社保人数",
            "自身风险数",
            "关联风险数",
            "地址",
            "经营范围",
            "纳税人识别号",
            "所属行业",
            "工商注册号",
            "经度",
            "纬度",
            "注册资本",
            "注册资本货币",
            "数据来源地址",
            "数据来源平台",
            "数据来源记录编号",
            "数据来源更新时间",
            "记录创建日期",
            "记录更新日期",
        ],
    ];

    pub fn validate_job_headers(
        headers: &[String],
    ) -> (bool, usize, usize, Vec<String>, Vec<String>) {
        Self::validate_headers(headers, Self::JOB_FILE_HEADER, "职位")
    }

    pub fn validate_company_headers(
        headers: &[String],
    ) -> (bool, usize, usize, Vec<String>, Vec<String>) {
        Self::validate_headers(headers, Self::COMPANY_FILE_HEADER, "公司")
    }

    fn validate_headers(
        headers: &[String],
        file_headers: &[&[&str]],
        file_name: &str,
    ) -> (bool, usize, usize, Vec<String>, Vec<String>) {
        let version = Self::parse_version(headers);
        let max_supported_version = file_headers.len() - 1;

        let actual_version = if version <= max_supported_version {
            version
        } else {
            max_supported_version
        };

        let mut warnings = Vec::new();
        if version > max_supported_version {
            warnings.push(format!(
                "{}文件版本号v{}超出系统支持v{},将使用v{}字段验证",
                file_name, version, max_supported_version, max_supported_version
            ));
        }

        let valid_fields = if version < file_headers.len() {
            file_headers[version]
        } else {
            file_headers.last().unwrap()
        };

        let header_set: std::collections::HashSet<&str> =
            headers.iter().map(|h| h.trim()).collect();

        let lack_columns: Vec<String> = valid_fields
            .iter()
            .filter(|f| !header_set.contains(*f))
            .map(|f| f.to_string())
            .collect();

        let valid = lack_columns.is_empty();
        (valid, version, actual_version, lack_columns, warnings)
    }

    pub fn get_job_valid_columns(version: usize) -> Vec<String> {
        Self::get_valid_columns(version, Self::JOB_FILE_HEADER)
    }

    pub fn get_company_valid_columns(version: usize) -> Vec<String> {
        Self::get_valid_columns(version, Self::COMPANY_FILE_HEADER)
    }

    fn get_valid_columns(version: usize, file_headers: &[&[&str]]) -> Vec<String> {
        let mut result: Vec<String> = {
            if version < file_headers.len() {
                file_headers[version]
                    .iter()
                    .map(|s| s.to_string())
                    .collect()
            } else {
                file_headers
                    .last()
                    .unwrap()
                    .iter()
                    .map(|s| s.to_string())
                    .collect()
            }
        };
        result.push(Self::gen_version_header(version));
        result
    }

    pub fn parse_job_headers(headers: &[String], version: usize) -> JobHeaderMapping {
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
                "技能" if version >= 1 => mapping.skill_tag = Some(i),
                "福利" if version >= 1 => mapping.welfare_tag = Some(i),
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

    pub fn parse_company_headers(headers: &[String], version: usize) -> CompanyHeaderMapping {
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
                "注册资本" if version >= 2 => mapping.reg_capital_value = Some(i),
                "注册资本货币" if version >= 2 => mapping.reg_capital_currency = Some(i),
                "数据来源地址" => mapping.source_url = Some(i),
                "数据来源平台" => mapping.platform = Some(i),
                "数据来源记录编号" => mapping.source_record_id = Some(i),
                "数据来源更新时间" => mapping.source_refresh_datetime = Some(i),
                "记录创建日期" if version >= 1 => mapping.create_datetime = Some(i),
                "记录更新日期" if version >= 1 => mapping.update_datetime = Some(i),
                _ => {}
            }
        }
        mapping
    }
}

#[derive(Default, Clone)]
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

#[derive(Default, Clone)]
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
