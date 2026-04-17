rust_i18n::i18n!("locales");

pub use rust_i18n::locale;

pub fn init() {
    rust_i18n::set_locale("en");
}

pub fn set_locale(locale: &str) {
    if locale.starts_with("zh") {
        rust_i18n::set_locale("zh");
    } else {
        rust_i18n::set_locale("en");
    }
}

pub fn get_current_locale() -> String {
    rust_i18n::locale().to_string()
}

pub fn translate(key: &str) -> String {
    rust_i18n::t!(key).to_string()
}
