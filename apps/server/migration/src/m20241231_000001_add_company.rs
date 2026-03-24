use entity::*;
use sea_orm::entity::*;
use sea_orm::Set;
use sea_orm_migration::{async_trait::async_trait, prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();
        manager
            .create_table(
                Table::create()
                    .table(Company::Table)
                    .if_not_exists()
                    .col(string(Company::Id))
                    .col(string_null(Company::Platform))
                    .col(string_null(Company::Name))
                    .col(text_null(Company::Description))
                    .col(date_null(Company::StartDate))
                    .col(string_null(Company::Status))
                    .col(string_null(Company::LegalPerson))
                    .col(string_null(Company::UnifiedCode))
                    .col(string_null(Company::Website))
                    .col(integer_null(Company::InsuranceNum))
                    .col(integer_null(Company::SelfRisk))
                    .col(integer_null(Company::UnionRisk))
                    .col(text_null(Company::Address))
                    .col(text_null(Company::Scope))
                    .col(string_null(Company::TaxNo))
                    .col(string_null(Company::Industry))
                    .col(string_null(Company::LicenseNumber))
                    .col(double_null(Company::Longitude))
                    .col(double_null(Company::Latitude))
                    .col(double_null(Company::RegCapitalValue))
                    .col(string_null(Company::RegCapitalCurrency))
                    .col(string_null(Company::SourceUrl))
                    .col(string_null(Company::SourceRecordId))
                    .col(timestamp_with_time_zone_null(Company::SourceRefreshDatetime))
                    .col(timestamp_with_time_zone_null(Company::CreateDatetime))
                    .col(timestamp_with_time_zone_null(Company::UpdateDatetime))
                    .primary_key(Index::create().name("pk-company-id").col(Company::Id))
                    .to_owned(),
            )
            .await?;
        manager
            .create_table(
                Table::create()
                    .table(CompanyTag::Table)
                    .if_not_exists()
                    .col(string(CompanyTag::Id))
                    .col(string(CompanyTag::CompanyId))
                    .col(string(CompanyTag::TagId))
                    .col(integer_null(CompanyTag::SourceType))
                    .col(string_null(CompanyTag::Source))
                    .col(integer_null(CompanyTag::Seq))
                    .col(timestamp_with_time_zone_null(CompanyTag::CreateDatetime))
                    .col(timestamp_with_time_zone_null(CompanyTag::UpdateDatetime))
                    .primary_key(Index::create().name("pk-company-tag-id").col(CompanyTag::Id))
                    .to_owned(),
            )
            .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Company::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(CompanyTag::Table).to_owned())
            .await?;
        Ok(())
    }
}

#[derive(DeriveIden)]
enum Company {
    Table,
    Id,
    Platform,
    Name,
    Description,
    StartDate,
    Status,
    LegalPerson,
    UnifiedCode,
    Website,
    InsuranceNum,
    SelfRisk,
    UnionRisk,
    Address,
    Scope,
    TaxNo,
    Industry,
    LicenseNumber,
    Longitude,
    Latitude,
    RegCapitalValue,
    RegCapitalCurrency,
    SourceUrl,
    SourceRecordId,
    SourceRefreshDatetime,
    CreateDatetime,
    UpdateDatetime,
}

#[derive(DeriveIden)]
enum CompanyTag {
    Table,
    Id,
    CompanyId,
    TagId,
    SourceType,
    Source,
    Seq,
    CreateDatetime,
    UpdateDatetime,
}
