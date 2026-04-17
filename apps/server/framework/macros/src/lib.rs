use proc_macro::TokenStream;
use quote::{quote, quote_spanned};
use syn::{parse_macro_input, Ident, Item, Type};

#[proc_macro_attribute]
pub fn error(_attr: TokenStream, input: TokenStream) -> TokenStream {
    let input = parse_macro_input!(input as Item);
    let item = match &input {
        Item::Enum(e) => e,
        _ => panic!("error only works on enums"),
    };

    let name = &item.ident;
    let name_str = name.to_string();
    let vis = &item.vis;
    let generics = &item.generics;
    let (impl_generics, ty_generics, where_clause) = item.generics.split_for_impl();
    let variants = &item.variants;

    let module = infer_module(&name_str);
    let module_prefix = format!("{}_", module);

    let values: Vec<u32> = variants
        .iter()
        .filter_map(|v| v.discriminant.as_ref())
        .filter_map(|(_, expr)| parse_discriminant(expr))
        .collect();

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

    let variant_tokens: proc_macro2::TokenStream = variants
        .iter()
        .flat_map(|v| quote_spanned! { v.ident.span() => #v, })
        .collect();

    let target: Type = syn::parse_quote!(crate::error::ApiError);

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

fn infer_module(type_name: &str) -> String {
    let name = type_name.trim_end_matches("ErrorCode");
    to_snake_case_name(name)
}

fn to_snake_case(ident: &Ident) -> String {
    let s = ident.to_string();
    to_snake_case_name(&s)
}

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

fn parse_discriminant(expr: &syn::Expr) -> Option<u32> {
    match expr {
        syn::Expr::Lit(lit) => match &lit.lit {
            syn::Lit::Int(int) => int.base10_parse::<u32>().ok(),
            _ => None,
        },
        _ => None,
    }
}
