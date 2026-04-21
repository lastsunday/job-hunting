#[tokio::test]
async fn test_parse_excel() {
    use service::sync::file_parser::FileParser;

    let data = std::fs::read("tests/resources/data/job-v1.xlsx").unwrap();
    let result = FileParser::parse_excel(&data).unwrap();

    assert!(!result.is_empty(), "Should have at least header row");

    let headers = &result[0];
    assert!(headers.contains(&"职位自编号".to_string()));
    assert!(headers.contains(&"发布平台".to_string()));
    assert!(headers.contains(&"职位".to_string()));
    assert!(headers.contains(&"公司".to_string()));

    assert!(result.len() > 1, "Should have data rows");
}

#[tokio::test]
async fn test_parse_version() {
    use service::sync::file_parser::FileParser;

    let headers = vec!["职位自编号".to_string(), "发布平台".to_string()];
    assert_eq!(FileParser::parse_version(&headers), 0);

    let headers = vec!["__VERSION_1".to_string(), "职位自编号".to_string()];
    assert_eq!(FileParser::parse_version(&headers), 1);

    let headers = vec!["职位自编号".to_string(), "__VERSION_2".to_string()];
    assert_eq!(FileParser::parse_version(&headers), 2);
}

#[tokio::test]
async fn test_validate_job_headers() {
    use service::sync::file_parser::FileParser;

    let v0_headers = vec![
        "职位自编号".to_string(),
        "发布平台".to_string(),
        "职位访问地址".to_string(),
        "职位".to_string(),
        "公司".to_string(),
        "公司是否为全称".to_string(),
        "地区".to_string(),
        "地址".to_string(),
        "经度".to_string(),
        "纬度".to_string(),
        "职位描述".to_string(),
        "学历".to_string(),
        "所需经验".to_string(),
        "最低薪资".to_string(),
        "最高薪资".to_string(),
        "首次发布时间".to_string(),
        "招聘人".to_string(),
        "招聘公司".to_string(),
        "招聘者职位".to_string(),
        "首次扫描日期".to_string(),
        "记录更新日期".to_string(),
    ];
    let (valid, version, actual_version, lack_columns, warnings) =
        FileParser::validate_job_headers(&v0_headers);
    assert!(valid);
    assert_eq!(version, 0);
    assert_eq!(actual_version, 0);
    assert!(lack_columns.is_empty());
    assert!(warnings.is_empty());

    let mut v1_headers = v0_headers.clone();
    v1_headers.push("技能".to_string());
    v1_headers.push("福利".to_string());
    let (_valid, _version, _actual_version, _lack_columns, _warnings) =
        FileParser::validate_job_headers(&v1_headers);
    assert!(_valid);
    assert_eq!(_version, 0);
    assert_eq!(_actual_version, 0);
    assert!(_lack_columns.is_empty());

    let v1_headers_with_version = vec![
        "__VERSION_1".to_string(),
        "职位自编号".to_string(),
        "发布平台".to_string(),
        "职位访问地址".to_string(),
        "职位".to_string(),
        "公司".to_string(),
        "公司是否为全称".to_string(),
        "地区".to_string(),
        "地址".to_string(),
        "经度".to_string(),
        "纬度".to_string(),
        "职位描述".to_string(),
        "学历".to_string(),
        "所需经验".to_string(),
        "技能".to_string(),
        "福利".to_string(),
        "最低薪资".to_string(),
        "最高薪资".to_string(),
        "首次发布时间".to_string(),
        "招聘人".to_string(),
        "招聘公司".to_string(),
        "招聘者职位".to_string(),
        "首次扫描日期".to_string(),
        "记录更新日期".to_string(),
    ];
    let (valid, version, actual_version, lack_columns, warnings) =
        FileParser::validate_job_headers(&v1_headers_with_version);
    assert!(valid);
    assert_eq!(version, 1);
    assert_eq!(actual_version, 1);
    assert!(lack_columns.is_empty());
    assert!(warnings.is_empty());

    let incomplete_headers = vec![
        "职位自编号".to_string(),
        "发布平台".to_string(),
        "职位".to_string(),
    ];
    let (_valid, _version, _actual_version, _lack_columns, _warnings) =
        FileParser::validate_job_headers(&incomplete_headers);
    assert!(!_valid);
    assert!(!_lack_columns.is_empty());

    let v99_headers = vec!["__VERSION_99".to_string(), "职位自编号".to_string()];
    let (_valid, _version, _actual_version, _lack_columns, _warnings) =
        FileParser::validate_job_headers(&v99_headers);
    assert_eq!(_version, 99);
    assert_eq!(_actual_version, 1);
    assert!(!_warnings.is_empty());
}

#[tokio::test]
async fn test_validate_company_headers() {
    use service::sync::file_parser::FileParser;

    let v0_headers = vec![
        "公司".to_string(),
        "公司描述".to_string(),
        "成立时间".to_string(),
        "经营状态".to_string(),
        "法人".to_string(),
        "统一社会信用代码".to_string(),
        "官网".to_string(),
        "社保人数".to_string(),
        "自身风险数".to_string(),
        "关联风险数".to_string(),
        "地址".to_string(),
        "经营范围".to_string(),
        "纳税人识别号".to_string(),
        "所属行业".to_string(),
        "工商注册号".to_string(),
        "经度".to_string(),
        "纬度".to_string(),
        "数据来源地址".to_string(),
        "数据来源平台".to_string(),
        "数据来源记录编号".to_string(),
        "数据来源更新时间".to_string(),
    ];
    let (valid, version, actual_version, lack_columns, warnings) =
        FileParser::validate_company_headers(&v0_headers);
    assert!(valid);
    assert_eq!(version, 0);
    assert_eq!(actual_version, 0);
    assert!(lack_columns.is_empty());
    assert!(warnings.is_empty());

    let mut v1_headers = v0_headers.clone();
    v1_headers.push("记录创建日期".to_string());
    v1_headers.push("记录更新日期".to_string());
    let (_valid, _version, _actual_version, _lack_columns, _warnings) =
        FileParser::validate_company_headers(&v1_headers);
    assert!(_valid);
    assert_eq!(_version, 0);
    assert_eq!(_actual_version, 0);

    let v1_headers_with_version = vec![
        "__VERSION_1".to_string(),
        "公司".to_string(),
        "公司描述".to_string(),
        "成立时间".to_string(),
        "经营状态".to_string(),
        "法人".to_string(),
        "统一社会信用代码".to_string(),
        "官网".to_string(),
        "社保人数".to_string(),
        "自身风险数".to_string(),
        "关联风险数".to_string(),
        "地址".to_string(),
        "经营范围".to_string(),
        "纳税人识别号".to_string(),
        "所属行业".to_string(),
        "工商注册号".to_string(),
        "经度".to_string(),
        "纬度".to_string(),
        "数据来源地址".to_string(),
        "数据来源平台".to_string(),
        "数据来源记录编号".to_string(),
        "数据来源更新时间".to_string(),
        "记录创建日期".to_string(),
        "记录更新日期".to_string(),
    ];
    let (_valid, _version, _actual_version, _lack_columns, _warnings) =
        FileParser::validate_company_headers(&v1_headers_with_version);
    assert!(_valid);
    assert_eq!(_version, 1);
    assert_eq!(_actual_version, 1);
    assert!(_lack_columns.is_empty());

    let mut v2_headers = v1_headers_with_version.clone();
    v2_headers.push("注册资本".to_string());
    v2_headers.push("注册资本货币".to_string());
    let v2_headers_with_version: Vec<String> = std::iter::once("__VERSION_2".to_string())
        .chain(v2_headers.into_iter().skip(1))
        .collect();
    let (_valid, _version, _actual_version, _lack_columns, _warnings) =
        FileParser::validate_company_headers(&v2_headers_with_version);
    assert!(_valid);
    assert_eq!(_version, 2);
    assert_eq!(_actual_version, 2);
    assert!(_warnings.is_empty());

    let incomplete_headers = vec!["公司".to_string(), "公司描述".to_string()];
    let (_valid, _version, _actual_version, _lack_columns, _warnings) =
        FileParser::validate_company_headers(&incomplete_headers);
    assert!(!_valid);
    assert!(!_lack_columns.is_empty());

    let v99_headers = vec!["__VERSION_99".to_string(), "公司".to_string()];
    let (_valid, _version, _actual_version, _lack_columns, _warnings) =
        FileParser::validate_company_headers(&v99_headers);
    assert_eq!(_version, 99);
    assert_eq!(_actual_version, 2);
    assert!(!_warnings.is_empty());
}
