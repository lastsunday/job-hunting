use sea_orm_migration::async_trait::async_trait;
pub use sea_orm_migration::prelude::*;

mod m20241230_000001_init;
mod m20241231_000001_add_company;

pub struct Migrator;

#[async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20241230_000001_init::Migration),
            Box::new(m20241231_000001_add_company::Migration),
        ]
    }
}
