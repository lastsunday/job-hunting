mod config;
mod implement;
mod utils;

use proc_macro::TokenStream;
use syn::{
    Error, ItemFn, ItemStruct, Meta,
    parse::{Parse, Parser},
    parse_macro_input,
};

pub(crate) type Result<T> = std::result::Result<T, Error>;

#[proc_macro_attribute]
pub fn implement(args: TokenStream, input: TokenStream) -> TokenStream {
    attribute_macro::<ItemFn, _>(args, input, implement::implement)
}

#[proc_macro_attribute]
pub fn config_example_generator(args: TokenStream, input: TokenStream) -> TokenStream {
    attribute_macro::<ItemStruct, _>(args, input, config::example_generator)
}

fn attribute_macro<I, F>(args: TokenStream, input: TokenStream, func: F) -> TokenStream
where
    F: Fn(I, &[Meta]) -> Result<TokenStream>,
    I: Parse,
{
    let item = parse_macro_input!(input as I);
    syn::punctuated::Punctuated::<Meta, syn::Token![,]>::parse_terminated
        .parse(args)
        .map(|args| args.iter().cloned().collect::<Vec<_>>())
        .and_then(|ref args| func(item, args))
        .unwrap_or_else(|e| e.to_compile_error().into())
}
