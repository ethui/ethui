use heck:: ToSnakeCase as _;
use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, Ident};

#[proc_macro]
pub fn camel_to_snake(input: TokenStream) -> TokenStream {
    let ident = parse_macro_input!(input as Ident);
    let snake_case = ident.to_string().to_snake_case();
    let new_ident = Ident::new(&snake_case, ident.span());

    TokenStream::from(quote! {
        #new_ident
    })
}
