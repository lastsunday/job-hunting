use sea_orm_migration::{async_trait::async_trait, prelude::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_index(
                Index::create()
                    .name("idx-file-update-datetime")
                    .table(File::Table)
                    .col(File::UpdateDatetime)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx-file-is-delete")
                    .table(File::Table)
                    .col(File::IsDelete)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx-task-data-download-data-id")
                    .table(TaskDataDownload::Table)
                    .col(TaskDataDownload::DataId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx-task-data-merge-data-id")
                    .table(TaskDataMerge::Table)
                    .col(TaskDataMerge::DataId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx-task-data-id")
                    .table(Task::Table)
                    .col(Task::DataId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx-job-first-publish-datetime")
                    .table(Job::Table)
                    .col(Job::FirstPublishDatetime)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx-job-update-datetime")
                    .table(Job::Table)
                    .col(Job::UpdateDatetime)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx-job-create-datetime")
                    .table(Job::Table)
                    .col(Job::CreateDatetime)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx-job-first-scan-datetime")
                    .table(Job::Table)
                    .col(Job::FirstScanDatetime)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx-job-platform")
                    .table(Job::Table)
                    .col(Job::Platform)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx-company-update-datetime")
                    .table(Company::Table)
                    .col(Company::UpdateDatetime)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx-company-source-refresh-datetime")
                    .table(Company::Table)
                    .col(Company::SourceRefreshDatetime)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx-task-plan-id")
                    .table(Task::Table)
                    .col(Task::PlanId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx-task-status-update-datetime")
                    .table(Task::Table)
                    .col(Task::Status)
                    .col(Task::UpdateDatetime)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx-task-plan-enable")
                    .table(TaskPlan::Table)
                    .col(TaskPlan::Enable)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx-task-plan-type")
                    .table(TaskPlan::Table)
                    .col(TaskPlan::Type)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx-task-data-plan-plan-id")
                    .table(TaskDataPlan::Table)
                    .col(TaskDataPlan::PlanId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx-task-data-download-user-repo-type-datetime")
                    .table(TaskDataDownload::Table)
                    .col(TaskDataDownload::UserName)
                    .col(TaskDataDownload::RepoName)
                    .col(TaskDataDownload::Type)
                    .col(TaskDataDownload::Datetime)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx-job-source-job-id")
                    .table(JobSource::Table)
                    .col(JobSource::JobId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx-company-source-company-id")
                    .table(CompanySource::Table)
                    .col(CompanySource::CompanyId)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_index(Index::drop().name("idx-file-update-datetime").table(File::Table).to_owned())
            .await?;
        manager
            .drop_index(Index::drop().name("idx-file-is-delete").table(File::Table).to_owned())
            .await?;
        manager
            .drop_index(
                Index::drop()
                    .name("idx-task-data-download-data-id")
                    .table(TaskDataDownload::Table)
                    .to_owned(),
            )
            .await?;
        manager
            .drop_index(
                Index::drop()
                    .name("idx-task-data-merge-data-id")
                    .table(TaskDataMerge::Table)
                    .to_owned(),
            )
            .await?;
        manager
            .drop_index(Index::drop().name("idx-task-data-id").table(Task::Table).to_owned())
            .await?;
        manager
            .drop_index(Index::drop().name("idx-job-first-publish-datetime").table(Job::Table).to_owned())
            .await?;
        manager
            .drop_index(Index::drop().name("idx-job-update-datetime").table(Job::Table).to_owned())
            .await?;
        manager
            .drop_index(Index::drop().name("idx-job-create-datetime").table(Job::Table).to_owned())
            .await?;
        manager
            .drop_index(Index::drop().name("idx-job-first-scan-datetime").table(Job::Table).to_owned())
            .await?;
        manager
            .drop_index(Index::drop().name("idx-job-platform").table(Job::Table).to_owned())
            .await?;
        manager
            .drop_index(Index::drop().name("idx-company-update-datetime").table(Company::Table).to_owned())
            .await?;
        manager
            .drop_index(Index::drop().name("idx-company-source-refresh-datetime").table(Company::Table).to_owned())
            .await?;
        manager
            .drop_index(Index::drop().name("idx-task-plan-id").table(Task::Table).to_owned())
            .await?;
        manager
            .drop_index(Index::drop().name("idx-task-status-update-datetime").table(Task::Table).to_owned())
            .await?;
        manager
            .drop_index(Index::drop().name("idx-task-plan-enable").table(TaskPlan::Table).to_owned())
            .await?;
        manager
            .drop_index(Index::drop().name("idx-task-plan-type").table(TaskPlan::Table).to_owned())
            .await?;
        manager
            .drop_index(Index::drop().name("idx-task-data-plan-plan-id").table(TaskDataPlan::Table).to_owned())
            .await?;
        manager
            .drop_index(Index::drop().name("idx-task-data-download-user-repo-type-datetime").table(TaskDataDownload::Table).to_owned())
            .await?;
        manager
            .drop_index(Index::drop().name("idx-job-source-job-id").table(JobSource::Table).to_owned())
            .await?;
        manager
            .drop_index(Index::drop().name("idx-company-source-company-id").table(CompanySource::Table).to_owned())
            .await?;
        Ok(())
    }
}

#[derive(DeriveIden)]
enum File {
    Table,
    IsDelete,
    UpdateDatetime,
}

#[derive(DeriveIden)]
enum Task {
    Table,
    PlanId,
    Status,
    DataId,
    UpdateDatetime,
}

#[derive(DeriveIden)]
enum TaskDataDownload {
    Table,
    UserName,
    RepoName,
    Type,
    Datetime,
    DataId,
}

#[derive(DeriveIden)]
enum TaskDataMerge {
    Table,
    DataId,
}

#[derive(DeriveIden)]
enum Job {
    Table,
    FirstPublishDatetime,
    UpdateDatetime,
    CreateDatetime,
    FirstScanDatetime,
    Platform,
}

#[derive(DeriveIden)]
enum Company {
    Table,
    UpdateDatetime,
    SourceRefreshDatetime,
}

#[derive(DeriveIden)]
enum TaskPlan {
    Table,
    Enable,
    Type,
}

#[derive(DeriveIden)]
enum TaskDataPlan {
    Table,
    PlanId,
}

#[derive(DeriveIden)]
enum JobSource {
    Table,
    JobId,
}

#[derive(DeriveIden)]
enum CompanySource {
    Table,
    CompanyId,
}
