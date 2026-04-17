use api::company::CompanyErrorCode;
use api::job::JobErrorCode;
use api::sync::SyncErrorCode;
use api::user::UserErrorCode;
use framework::error_code::FrameworkErrorCode;

use serde_json::Value;

const I18N_BASE_PATH: &str = "../../../apps/server/i18n/locales";

fn load_json(locale: &str, module: &str) -> Value {
    let path = format!("{}/{}/{}.json", I18N_BASE_PATH, locale, module);
    let content = std::fs::read_to_string(&path).unwrap_or_else(|e| {
        panic!("Failed to read {}: {}", path, e);
    });
    serde_json::from_str(&content).unwrap_or_else(|e| {
        panic!("Failed to parse {}: {}", path, e);
    })
}

fn get_all_locales() -> Vec<&'static str> {
    vec!["en", "zh"]
}

#[test]
fn test_all_error_codes_unique() {
    let all_codes: Vec<u32> = FrameworkErrorCode::all_codes()
        .iter()
        .chain(UserErrorCode::all_codes().iter())
        .chain(CompanyErrorCode::all_codes().iter())
        .chain(JobErrorCode::all_codes().iter())
        .chain(SyncErrorCode::all_codes().iter())
        .copied()
        .collect();

    eprintln!("FrameworkErrorCode: {:?}", FrameworkErrorCode::all_codes());
    eprintln!("UserErrorCode: {:?}", UserErrorCode::all_codes());
    eprintln!("CompanyErrorCode: {:?}", CompanyErrorCode::all_codes());
    eprintln!("JobErrorCode: {:?}", JobErrorCode::all_codes());
    eprintln!("SyncErrorCode: {:?}", SyncErrorCode::all_codes());
    eprintln!("All codes: {:?}", all_codes);
    eprintln!("Total: {}", all_codes.len());

    let mut sorted = all_codes.clone();
    sorted.sort();
    sorted.dedup();

    let duplicates: Vec<u32> = all_codes
        .iter()
        .filter(|x| sorted.iter().filter(|y| x == y).count() > 1)
        .copied()
        .collect();

    assert_eq!(
        all_codes.len(),
        sorted.len(),
        "Duplicate error codes found: {:?}",
        duplicates
    );
}

/// Error code structure:
/// - Category (1 digit): 1=STD, 2=LIB, 3=BIZ
/// - Module (2 digits): module code
/// - Sequence (3 digits): sequential number within module
fn validate_error_code_structure(code: u32, module_name: &str) -> Result<(), String> {
    let category = code / 100000;
    let sequence = code % 1000;

    let valid_categories = match module_name {
        "FrameworkErrorCode" => vec![1, 2, 3],
        "UserErrorCode" => vec![3],
        "CompanyErrorCode" => vec![4],
        "JobErrorCode" | "SyncErrorCode" => vec![4],
        _ => vec![],
    };

    if !valid_categories.contains(&category) {
        return Err(format!(
            "{}: Invalid category {}, expected {:?}",
            module_name, category, valid_categories
        ));
    }

    if sequence < 1 || sequence > 999 {
        return Err(format!(
            "{}: Invalid sequence {}, expected 1-999",
            module_name, sequence
        ));
    }

    Ok(())
}

#[test]
fn test_framework_error_codes_structure() {
    for &code in FrameworkErrorCode::all_codes() {
        validate_error_code_structure(code, "FrameworkErrorCode").unwrap();
    }
}

#[test]
fn test_user_error_codes_structure() {
    for &code in UserErrorCode::all_codes() {
        let result = validate_error_code_structure(code, "UserErrorCode");
        assert!(
            result.is_ok(),
            "UserErrorCode {} failed structure validation: {}",
            code,
            result.unwrap_err()
        );
    }
}

#[test]
fn test_company_error_codes_structure() {
    for &code in CompanyErrorCode::all_codes() {
        let result = validate_error_code_structure(code, "CompanyErrorCode");
        assert!(
            result.is_ok(),
            "CompanyErrorCode {} failed structure validation: {}",
            code,
            result.unwrap_err()
        );
    }
}

#[test]
fn test_job_error_codes_structure() {
    for &code in JobErrorCode::all_codes() {
        let result = validate_error_code_structure(code, "JobErrorCode");
        assert!(
            result.is_ok(),
            "JobErrorCode {} failed structure validation: {}",
            code,
            result.unwrap_err()
        );
    }
}

#[test]
fn test_sync_error_codes_structure() {
    for &code in SyncErrorCode::all_codes() {
        let result = validate_error_code_structure(code, "SyncErrorCode");
        assert!(
            result.is_ok(),
            "SyncErrorCode {} failed structure validation: {}",
            code,
            result.unwrap_err()
        );
    }
}

fn check_i18n_keys_for_module(module_name: &str, all_codes: &[u32], variant_names: &[&str]) {
    for (i, &code) in all_codes.iter().enumerate() {
        let variant_name = *variant_names.get(i).unwrap_or(&"unknown");
        let json_key = to_snake_case(variant_name);

        for locale in get_all_locales() {
            let json = load_json(locale, module_name);

            assert!(
                json.get(&json_key).is_some(),
                "Missing i18n key '{}' in {}/{}.json for {} (code: {})",
                json_key,
                locale,
                module_name,
                variant_name,
                code
            );
        }
    }
}

fn to_snake_case(s: &str) -> String {
    let mut result = String::new();
    for (i, c) in s.chars().enumerate() {
        if c.is_uppercase() && i > 0 {
            result.push('_');
        }
        result.push(c.to_ascii_lowercase());
    }
    result
}

#[test]
fn test_user_i18n_keys_exist() {
    check_i18n_keys_for_module(
        "user",
        UserErrorCode::all_codes(),
        &[
            "Invalid",
            "ClientInvalid",
            "GrantInvalid",
            "AccountNotFound",
            "OldPasswordIncorrect",
        ],
    );
}

#[test]
fn test_company_i18n_keys_exist() {
    check_i18n_keys_for_module("company", CompanyErrorCode::all_codes(), &["NameRequired"]);
}

#[test]
fn test_job_i18n_keys_exist() {
    check_i18n_keys_for_module(
        "job",
        JobErrorCode::all_codes(),
        &["TitleRequired", "UrlRequired", "CompanyNameRequired"],
    );
}

#[test]
fn test_sync_i18n_keys_exist() {
    check_i18n_keys_for_module(
        "sync",
        SyncErrorCode::all_codes(),
        &[
            "FileInvalid",
            "ExcelParseFailed",
            "ImportFailed",
            "DataTypeInvalid",
        ],
    );
}

#[test]
fn test_framework_i18n_keys_exist() {
    check_i18n_keys_for_module(
        "framework",
        FrameworkErrorCode::all_codes(),
        &[
            "QueryInvalid",
            "PathInvalid",
            "JsonInvalid",
            "ValidationInvalid",
            "MethodNotAllowed",
            "DbError",
            "JwtError",
            "PasswordError",
            "InternalError",
            "ResourceNotFound",
            "Unauthenticated",
            "AuthHeaderMissing",
            "AuthHeaderInvalid",
            "BearerRequired",
            "TokenInvalid",
        ],
    );
}
