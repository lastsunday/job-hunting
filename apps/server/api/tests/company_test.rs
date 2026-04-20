#[cfg(test)]
mod tests {
    use api::company::{CreateCompanyRequest, convert_company_to_csv_data};
    use chrono::{DateTime, NaiveDate};

    // 基于 company-v2.xlsx 第2行数据
    fn get_xlsx_row2_request() -> CreateCompanyRequest {
        CreateCompanyRequest {
            // 索引0
            name: Some("史伟莎管理咨询(上海)有限公司深圳分公司".to_string()),
            // 索引1
            desc: Some("史伟莎管理咨询（上海）有限公司深圳分公司成立于2024年06月13日，注册地位于深圳市福田区沙头街道天安社区泰然九路盛唐商务大厦东座602，法定代表人为饶永康。经营范围包括企业管理咨询；技术服务、技术开发、技术咨询、技术交流、技术转让、技术推广；白蚁防治服务；专用化学产品制造（不含危险化学品）；专业保洁、清洗、消毒服务；环境应急治理服务；服装服饰批发；鞋帽批发；纸制品销售；销售代理；消毒剂销售（不含危险化学品）；日用化学产品销售；专用化学产品销售（不含危险化学品）；卫生用杀虫剂销售；卫生用品和一次性使用医疗用品销售；环境保护专用设备销售；气体、液体分离及纯净设备销售；机械设备租赁；货物进出口；技术进出口。（除依法须经批准的项目外，凭营业执照依法自主开展经营活动）^无".to_string()),
            // 索引2 (xlsx列3经营状态)
            start_date: Some(DateTime::parse_from_rfc3339("2024-06-13T00:00:00+08:00").unwrap()), 
            // 索引3 (xlsx列4法人)
            status: Some("开业".to_string()),
            // 索引4
            legal_person: Some("饶永康".to_string()),
            // 索引5
            unified_code: Some("91440300MADN0ABF14".to_string()),
            // 索引6
            web_site: Some("-".to_string()),
            // 索引7 (社保人数 None -> 0)
            insurance_num: None,
            // 索引8
            self_risk: Some(0),
            // 索引9
            union_risk: Some(0),
            // 索引10
            address: Some("深圳市福田区沙头街道天安社区泰然九路盛唐商务大厦东座602".to_string()),
            // 索引11
            scope: Some("企业管理咨询；技术服务、技术开发、技术咨询、技术交流、技术转让、技术推广；白蚁防治服务；专用化学产品制造（不含危险化学品）；专业保洁、清洗、消毒服务；环境应急治理服务；服装服饰批发；鞋帽批发；纸制品销售；销售代理；消毒剂销售（不含危险化学品）；日用化学产品销售；专用化学产品销售（不含危险化学品）；卫生用杀虫剂销售；卫生用品和一次性使用医疗用品销售；环境保护专用设备销售；气体、液体分离及纯净设备销售；机械设备租赁；货物进出口；技术进出口。（除依法须经批准的项目外，凭营业执照依法自主开展经营活动）^无".to_string()),
            // 索引12
            tax_no: Some("91440300MADN0ABF14".to_string()),
            // 索引13
            industry: Some("批发业".to_string()),
            // 索引14
            license_number: Some("440300280603441".to_string()),
            // 索引15
            longitude: Some(114.0195182122345),
            // 索引16
            latitude: Some(22.5327829340728),
            // 索引17 (注册资本 None -> 空)
            reg_capital_value: None,
            // 索引18 (注册资本货币 None -> 空)
            reg_capital_currency: None,
            // 索引19
            source_url: Some("https://aiqicha.baidu.com/company_detail_53470251078081".to_string()),
            // 索引20
            source_platform: Some("AIQICHA".to_string()),
            // 索引21
            source_record_id: Some("53470251078081".to_string()),
            // 其余字段
            id: Some("test_id".to_string()),
            platform: Some("AIQICHA".to_string()),
            paidin_capital_value: None,
            paidin_capital_currency: None,
            uri: None,
        }
    }

    #[test]
    fn test_convert_company_all_24_fields() {
        let param = get_xlsx_row2_request();
        let csv_data = convert_company_to_csv_data(&param, None);

        assert_eq!(csv_data.len(), 2, "应有header和data两行");
        let headers = &csv_data[0];
        let row = &csv_data[1];

        assert_eq!(headers.len(), 25, "应有25列");

        // 验证所有24个字段 (基于代码的字段顺序)
        assert_eq!(
            row[0], "史伟莎管理咨询(上海)有限公司深圳分公司",
            "row[0] name"
        );
        assert!(row[1].starts_with("史伟莎管理咨询"), "row[1] desc");
        assert_eq!(row[2], "2024-06-13", "row[2] start_date");
        assert_eq!(row[3], "开业", "row[3] status");
        assert_eq!(row[4], "饶永康", "row[4] legal_person");
        assert_eq!(row[5], "91440300MADN0ABF14", "row[5] unified_code");
        assert_eq!(row[6], "-", "row[6] web_site");
        assert_eq!(row[7], "", "row[7] insurance_num (None->空)");
        assert_eq!(row[8], "0", "row[8] self_risk");
        assert_eq!(row[9], "0", "row[9] union_risk");
        assert_eq!(
            row[10], "深圳市福田区沙头街道天安社区泰然九路盛唐商务大厦东座602",
            "row[10] address"
        );
        assert!(row[11].starts_with("企业管理咨询"), "row[11] scope");
        assert_eq!(row[12], "91440300MADN0ABF14", "row[12] tax_no");
        assert_eq!(row[13], "批发业", "row[13] industry");
        assert_eq!(row[14], "440300280603441", "row[14] license_number");
        assert_eq!(row[15], "114.0195182122345", "row[15] longitude");
        assert_eq!(row[16], "22.5327829340728", "row[16] latitude");
        assert_eq!(row[17], "", "row[17] reg_capital_value (None->空)");
        assert_eq!(row[18], "", "row[18] reg_capital_currency (None->空)");
        assert_eq!(
            row[19], "https://aiqicha.baidu.com/company_detail_53470251078081",
            "row[19] source_url"
        );
        assert_eq!(row[20], "AIQICHA", "row[20] source_platform");
        assert_eq!(row[21], "53470251078081", "row[21] source_record_id");
        assert_eq!(
            row[22], "2025-04-23T14:31:29+08:00",
            "row[22] source_refresh_datetime"
        );
    }

    #[test]
    fn test_convert_update_preserves_existing() {
        let existing = entity::company::Model {
            id: "id1".to_string(),
            name: Some("原公司".to_string()),
            desc: Some("原描述".to_string()),
            start_date: Some(DateTime::parse_from_rfc3339("2020-01-01T00:00:00+08:00").unwrap()),
            status: Some("存续".to_string()),
            legal_person: Some("原法人".to_string()),
            unified_code: Some("原代码".to_string()),
            web_site: Some("-".to_string()),
            insurance_num: Some(10),
            self_risk: Some(2),
            union_risk: Some(1),
            address: Some("原地址".to_string()),
            scope: Some("原范围".to_string()),
            tax_no: Some("原税".to_string()),
            industry: Some("原行业".to_string()),
            license_number: Some("原执照".to_string()),
            longitude: Some(100.0),
            latitude: Some(20.0),
            source_url: Some("https://old.com".to_string()),
            source_platform: Some("old_plat".to_string()),
            source_record_id: Some("old_rec".to_string()),
            source_refresh_datetime: Some(
                DateTime::parse_from_rfc3339("2020-01-01T00:00:00+08:00").unwrap(),
            ),
            reg_capital_value: Some(50.0),
            reg_capital_currency: Some("美元".to_string()),
            paidin_capital_value: None,
            paidin_capital_currency: None,
            uri: None,
            create_datetime: None,
            update_datetime: None,
        };

        // 只更新name
        let param: CreateCompanyRequest = CreateCompanyRequest {
            id: None,
            platform: None,
            name: Some("新公司".to_string()),
            desc: None,
            start_date: None,
            status: None,
            legal_person: None,
            unified_code: None,
            web_site: None,
            source_platform: None,
            insurance_num: None,
            self_risk: None,
            union_risk: None,
            address: None,
            scope: None,
            tax_no: None,
            industry: None,
            license_number: None,
            longitude: None,
            latitude: None,
            reg_capital_value: None,
            reg_capital_currency: None,
            source_url: None,
            source_record_id: None,
            paidin_capital_value: None,
            paidin_capital_currency: None,
            uri: None,
        };

        let csv_data = convert_company_to_csv_data(&param, Some(&existing));
        let row = &csv_data[1];

        // 新值
        assert_eq!(row[0], "新公司", "row[0] name(新值)");
        // 保留原值
        assert_eq!(row[1], "原描述", "row[1] desc(保留)");
        assert_eq!(row[2], "2020-01-01", "row[2] start_date(保留)");
        assert_eq!(row[3], "存续", "row[3] status(保留)");
        assert_eq!(row[4], "原法人", "row[4] legal_person(保留)");
    }
}
