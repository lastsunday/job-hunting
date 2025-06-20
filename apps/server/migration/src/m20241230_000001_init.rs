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
                    .table(Config::Table)
                    .if_not_exists()
                    .col(string_uniq(Config::Id))
                    .col(string_uniq(Config::Key))
                    .col(json_binary_null(Config::Value))
                    .col(timestamp_with_time_zone_null(Config::CreateDatetime))
                    .col(timestamp_with_time_zone_null(Config::UpdateDatetime))
                    .primary_key(Index::create().name("pk-config-id").col(Config::Id))
                    .to_owned(),
            )
            .await?;
        manager
            .create_table(
                Table::create()
                    .table(User::Table)
                    .if_not_exists()
                    .col(string_uniq(User::Id))
                    .col(string_uniq(User::Account))
                    .col(string(User::Password))
                    .col(string_null(User::Email))
                    .col(boolean(User::Enable))
                    .col(timestamp_with_time_zone_null(User::CreateDatetime))
                    .col(timestamp_with_time_zone_null(User::UpdateDatetime))
                    .primary_key(Index::create().name("pk-user-id").col(User::Id))
                    .to_owned(),
            )
            .await?;
        let root_user = user::ActiveModel {
            account: Set("root".to_string()),
            password: Set(
                "$2b$12$n7NaDXwHdpCQI5LlsM1viuDJWZWofuhz/HnGAi8X.BmPRIuHvaXUy".to_string(),
            ),
            enable: Set(true),
            ..Default::default()
        };
        root_user.insert(db).await?;
        manager
            .create_table(
                Table::create()
                    .table(Job::Table)
                    .if_not_exists()
                    .col(string(Job::Id))
                    .col(string_null(Job::Platform))
                    .col(string_null(Job::Url))
                    .col(string_null(Job::Name))
                    .col(string_null(Job::CompanyName))
                    .col(string_null(Job::LocationName))
                    .col(string_null(Job::Address))
                    .col(double_null(Job::Longitude))
                    .col(double_null(Job::Latitude))
                    .col(string_null(Job::Description))
                    .col(string_null(Job::DegreeName))
                    .col(integer_null(Job::Year))
                    .col(float_null(Job::SalaryMin))
                    .col(float_null(Job::SalaryMax))
                    .col(integer_null(Job::SalaryTotalMonth))
                    .col(timestamp_with_time_zone_null(Job::FirstPublishDatetime))
                    .col(string_null(Job::BossName))
                    .col(string_null(Job::BossCompanyName))
                    .col(string_null(Job::BossPosition))
                    .col(timestamp_with_time_zone_null(Job::CreateDatetime))
                    .col(timestamp_with_time_zone_null(Job::UpdateDatetime))
                    .col(boolean_null(Job::IsFullCompanyName))
                    .col(string_null(Job::SkillTag))
                    .col(string_null(Job::WelfareTag))
                    .primary_key(Index::create().name("pk-job-id").col(Job::Id))
                    .to_owned(),
            )
            .await?;
        manager
            .create_table(
                Table::create()
                    .table(Tag::Table)
                    .if_not_exists()
                    .col(string(Tag::Id))
                    .col(string_null(Tag::Name))
                    .col(timestamp_with_time_zone_null(Tag::CreateDatetime))
                    .col(timestamp_with_time_zone_null(Tag::UpdateDatetime))
                    .primary_key(Index::create().name("pk-tag-id").col(Tag::Id))
                    .to_owned(),
            )
            .await?;
        manager
            .create_table(
                Table::create()
                    .table(JobTag::Table)
                    .if_not_exists()
                    .col(string(JobTag::Id))
                    .col(string(JobTag::JobId))
                    .col(string(JobTag::TagId))
                    .col(integer_null(JobTag::SourceType))
                    .col(string_null(JobTag::Source))
                    .col(integer_null(JobTag::Seq))
                    .col(timestamp_with_time_zone_null(JobTag::CreateDatetime))
                    .col(timestamp_with_time_zone_null(JobTag::UpdateDatetime))
                    .primary_key(Index::create().name("pk-job-tag-id").col(JobTag::Id))
                    .to_owned(),
            )
            .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Config::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(User::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Job::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Tag::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(JobTag::Table).to_owned())
            .await?;
        Ok(())
    }
}

#[derive(DeriveIden)]
enum Config {
    Table,
    Id,
    Key,
    Value,
    CreateDatetime,
    UpdateDatetime,
}

#[derive(DeriveIden)]
enum User {
    Table,
    Id,
    Account,
    Password,
    Email,
    Enable,
    CreateDatetime,
    UpdateDatetime,
}

#[derive(DeriveIden)]
enum Job {
    Table,
    Id,
    Platform,
    Url,
    Name,
    CompanyName,
    LocationName,
    Address,
    Longitude,
    Latitude,
    Description,
    DegreeName,
    Year,
    SalaryMin,
    SalaryMax,
    SalaryTotalMonth,
    FirstPublishDatetime,
    BossName,
    BossCompanyName,
    BossPosition,
    CreateDatetime,
    UpdateDatetime,
    IsFullCompanyName,
    SkillTag,
    WelfareTag,
}

#[derive(DeriveIden)]
enum Tag {
    Table,
    Id,
    Name,
    CreateDatetime,
    UpdateDatetime,
}

#[derive(DeriveIden)]
enum JobTag {
    Table,
    Id,
    JobId,
    TagId,
    SourceType,
    Source,
    Seq,
    CreateDatetime,
    UpdateDatetime,
}
