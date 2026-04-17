// Proc-macro attribute for automatically implementing standard error code enums.
// Only works on enums, automatically implements AppErrorCode trait
// and generates all_codes(), all_variant_names(), i18n_key(), code() methods.
#[proc_macro_attribute]
pub fn error(_attr: TokenStream, input: TokenStream) -> TokenStream {
    let input = parse_macro_input!(input);
    let item = match input {
        syn::Item::Enum(e) => e,
        _ => panic!("error only works on enums"),
    };

    let name = &item.ident;
    let name_str = name.to_string();
    let vis = &item.vis;
    let generics = &item.generics;
    let (impl_generics, ty_generics, where_clause) = item.generics.split_for_impl();
    let variants = &item.variants;

    // Infer module name from type name, e.g., ErrorCode1001 -> app
    let module = infer_module(&name_str);
    // i18n key prefix, e.g., app_xxx
    let module_prefix = format!("{}_", module);

    // Collect all explicitly specified discriminant values
    let values: Vec<u32> = variants
        .iter()
        .filter_map(|v| v.discriminant.as_ref())
        .filter_map(|(_, expr)| parse_discriminant(expr))
        .collect();

    // Generate match arms for i18n_key method, key format: module_variant
    // E.g., AppErrorCode::NotFound -> "app_not_found"
    let i18n_key_arms: Vec<proc_macro2::TokenStream> = variants
        .iter()
        .map(|v| {
            let variant_name = &v.ident;
            let key = format!("{}{}", module_prefix, to_snake_case(&variant_name));
            let key_str = syn::LitStr::new(&key, variant_name.span());
            quote_spanned! { variant_name.span() =>
                #name::#variant_name => #key_str,
            }
        })
        .collect();

    let variant_names: Vec<String> = variants.iter().map(|v| v.ident.to_string()).collect();

    let variant_name_strs: Vec<&str> = variant_names.iter().map(|s| s.as_str()).collect();

    // Extract variants for enum definition generation
    let variant_tokens: proc_macro2::TokenStream = variants
        .iter()
        .flat_map(|v| quote_spanned! { v.ident.span() => #v, })
        .collect();

    let target: Type = syn::parse_quote!(crate::error::ApiError);

    // Skip From impl for framework module (direct usage)
    let from_impl = if module == "framework" {
        quote! {}
    } else {
        quote! {
            impl #impl_generics From<#name #ty_generics> for #target #where_clause {
                fn from(err: #name #ty_generics) -> Self {
                    #target::from_app_error(err)
                }
            }
        }
    };

    // Generated code structure:
    // 1. derive Debug, Clone, Copy, PartialEq, Eq, IntoStaticStr, Display
    // 2. repr(u32) ensures enum backed by u32
    // 3. Original enum definition
    // 4. all_codes() - returns all discriminant values
    // 5. all_variant_names() - returns all variant names
    // 6. i18n_key() - returns i18n key
    // 7. code() - returns enum value as u32
    // 8. AppErrorCode trait implementation
    // 9. Optional From<Enum> for ApiError implementation
    let expanded = quote! {
        #[derive(Debug, Clone, Copy, PartialEq, Eq, strum_macros::IntoStaticStr, strum_macros::Display)]
        #[repr(u32)]
        #vis enum #name #generics {
            #variant_tokens
        }

        impl #impl_generics #name #ty_generics #where_clause {
            pub const fn all_codes() -> &'static [u32] {
                &[#(#values),*]
            }

            pub const fn all_variant_names() -> &'static [&'static str] {
                &[#(#variant_name_strs),*]
            }

            pub fn i18n_key(&self) -> &'static str {
                match self {
                    #(#i18n_key_arms)*
                }
            }

            pub fn code(&self) -> u32 {
                *self as u32
            }
        }

        impl #impl_generics crate::error::AppErrorCode for #name #ty_generics #where_clause {
            fn code(&self) -> u32 {
                *self as u32
            }

            fn i18n_key(&self) -> &'static str {
                #name::i18n_key(self)
            }
        }

        #from_impl
    };

    TokenStream::from(expanded)
}

// Infers module name from type name, e.g., ErrorCode1001 -> app, FrameworkErrorCode -> framework
// Logic: strips trailing "ErrorCode" suffix, converts to snake_case
fn infer_module(type_name: &str) -> String {
    let name = type_name.trim_end_matches("ErrorCode");
    to_snake_case_name(name)
}

// Converts an Ident to snake_case
fn to_snake_case(ident: &Ident) -> String {
    let s = ident.to_string();
    to_snake_case_name(&s)
}

// Converts a string to snake_case format
// Rule: prepend underscore before each uppercase letter, then lowercase
// E.g., ErrorCode1001 -> error_code1001, OAuthError -> oauth_error
fn to_snake_case_name(name: &str) -> String {
    let mut result = String::new();
    for (i, c) in name.chars().enumerate() {
        if c.is_uppercase() && i > 0 {
            result.push('_');
        }
        result.push(c.to_ascii_lowercase());
    }
    result
}

// Parses enum discriminant expression, only supports literal integers
fn parse_discriminant(expr: &syn::Expr) -> Option<u32> {
    match expr {
        syn::Expr::Lit(lit) => match &lit.lit {
            syn::Lit::Int(int) => int.base10_parse::<u32>().ok(),
            _ => None,
        },
        _ => None,
    }
}
