use sea_orm_migration::async_trait::async_trait;
pub use sea_orm_migration::prelude::*;

mod m20260000_000000_init;
mod m20260605_000001_add_indexes;

pub struct Migrator;

#[async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20260000_000000_init::Migration),
            Box::new(m20260605_000001_add_indexes::Migration),
        ]
    }
}
