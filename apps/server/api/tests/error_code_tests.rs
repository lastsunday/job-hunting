// ==================== IMPORTANT NOTES ====================
// 1. This test depends on i18n directory structure: locales/{locale}/{module}.json
// 2. Each ErrorCode type must have a corresponding JSON file (module name derived from type name)
// 3. JSON keys must match ErrorCode variant names (snake_case)
// 4. Adding new ErrorCode: automatically covered by tests
// 5. Adding new JSON file: will cause test_module_count_matches_json_files to fail
// 6. Deleting JSON file: will cause test_all_i18n_keys_exist to fail
// ============================================================

use api::{company::CompanyErrorCode, job::JobErrorCode, sync::SyncErrorCode, user::UserErrorCode};

use framework::error::{
    auth_code::AuthErrorCode, base_code::BaseErrorCode, critical_code::CriticalErrorCode,
    framework_code::FrameworkErrorCode, third_party_code::ThirdPartyErrorCode,
};
use serde_json::Value;

fn get_base_path() -> std::path::PathBuf {
    std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../i18n/locales")
}

fn load_json(locale: &str, module: &str) -> Value {
    let base = get_base_path();
    serde_json::from_str(
        &std::fs::read_to_string(base.join(locale).join(format!("{}.json", module))).unwrap(),
    )
    .unwrap()
}

fn get_locales() -> Vec<String> {
    let base = get_base_path();
    std::fs::read_dir(base)
        .unwrap()
        .filter_map(|e| e.ok())
        .filter(|e| e.path().is_dir())
        .map(|e| e.file_name().to_string_lossy().to_string())
        .collect()
}

fn to_snake_case(s: &str) -> String {
    let mut r = String::new();
    for (i, c) in s.chars().enumerate() {
        if c.is_uppercase() && i > 0 {
            r.push('_');
        }
        r.push(c.to_ascii_lowercase());
    }
    r
}

fn derive_module<T: 'static>() -> String {
    to_snake_case(
        std::any::type_name::<T>()
            .split("::")
            .last()
            .unwrap()
            .trim_end_matches("ErrorCode"),
    )
}

// ==================== TEST DESCRIPTIONS ====================
// test_all_error_codes_unique:
//   - Verifies all ErrorCode values are unique across all error code types
//   - Prevents duplicate error codes that could cause client parsing issues
//
// test_all_i18n_keys_exist:
//   - Verifies each ErrorCode variant has a corresponding i18n key
//   - Dynamically scans locales directory (supports adding new languages)
//   - Automatically derives module name from type name (FrameworkErrorCode -> "framework")
//
// test_module_count_matches_json_files:
//   - Verifies ErrorCode type count equals i18n module count
//   - Prevents adding ErrorCode without creating corresponding JSON file
//   - Uses HashSet to deduplicate, ensuring module names are unique
// ============================================================

macro_rules! error_tests {
    ($($m:ident),*) => {
        #[test]
        fn test_all_error_codes_unique() {
            let codes: Vec<u32> = vec![$($m::all_codes(),)*].concat();
            let mut sorted = codes.clone(); sorted.sort(); sorted.dedup();
            assert_eq!(codes.len(), sorted.len());
        }

        #[test]
        fn test_all_i18n_keys_exist() {
            $(
                let module = derive_module::<$m>();
                for (i, _) in $m::all_codes().iter().enumerate() {
                    let key = to_snake_case($m::all_variant_names()[i]);
                    for locale in get_locales() {
                        let json = load_json(&locale, &module);
                        assert!(json.get(&key).is_some(), "Missing '{}' in {}/{}", key, locale, module);
                    }
                }
            )*
        }

        #[test]
        fn test_module_count_matches_json_files() {
            const ERROR_CODE_COUNT: usize = [$(stringify!($m)),*].len();
            let base = get_base_path();
            let mut modules = std::collections::HashSet::new();
            if let Ok(locales) = std::fs::read_dir(&base) {
                for locale in locales.flatten() {
                    if locale.path().is_dir() {
                        if let Ok(files) = std::fs::read_dir(&locale.path()) {
                            for f in files.flatten() {
                                if let Some(name) = f.path().file_stem() {
                                    modules.insert(name.to_string_lossy().to_string());
                                }
                            }
                        }
                    }
                }
            }
            assert_eq!(modules.len(), ERROR_CODE_COUNT, "Modules ({}) should match ErrorCode count ({})", modules.len(), ERROR_CODE_COUNT);
        }
    };
}

error_tests! {
    BaseErrorCode,
    FrameworkErrorCode,
    ThirdPartyErrorCode,
    CriticalErrorCode,
    AuthErrorCode,
    UserErrorCode,
    CompanyErrorCode,
    JobErrorCode,
    SyncErrorCode
}
