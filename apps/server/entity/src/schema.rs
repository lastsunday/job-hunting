use utoipa::openapi::{
    KnownFormat, SchemaFormat, Type,
    schema::{Object, ObjectBuilder, SchemaType},
};

//TODO: delete this if merge https://github.com/juhaku/utoipa/pull/1367 and update crate version
pub fn date_time_with_time_zone_or_null_schema() -> Object {
    ObjectBuilder::new()
        .schema_type(SchemaType::from_iter([Type::String, Type::Null]))
        .format(Some(SchemaFormat::KnownFormat(KnownFormat::DateTime)))
        .build()
}

//TODO: delete this if merge https://github.com/juhaku/utoipa/pull/1367 and update crate version
pub fn date_time_with_time_zone_schema() -> Object {
    ObjectBuilder::new()
        .schema_type(SchemaType::Type(Type::String))
        .format(Some(SchemaFormat::KnownFormat(KnownFormat::DateTime)))
        .build()
}
