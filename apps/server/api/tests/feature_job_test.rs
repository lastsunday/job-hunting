use api::setup_default;
use api::setup_job;
use axum::extract::connect_info::MockConnectInfo;
use chrono::DateTime;
use chrono::Duration;
use chrono::FixedOffset;
use chrono::Local;
use common::datetime_to_str;
use common::get_from_value;
use common::get_json_paging_result_items;
use common::post_json;
use common::response_to_json;
use common::str_to_datetime;
use core::option::Option;
use cucumber::gherkin::Step;
use cucumber::then;
use cucumber::when;
use cucumber::{World, given};
use futures::FutureExt;
use serde_json::json;
use service::AppState;
use std::net::SocketAddr;
use utoipa_axum::router::OpenApiRouter;
mod common;
use common::{setup_database, tear_down};
use entity::job::{ActiveModel, Entity as Job};
use sea_orm::DatabaseConnection;
use sea_orm::EntityTrait;
use sea_orm::Set;
use testcontainers::ContainerAsync;
use testcontainers_modules::postgres::Postgres;
use uuid::Uuid;

use axum::{Router, http::StatusCode};

const SEARCH_API_URL: &str = "/api/job/search";

#[given("含有薪资的招聘职位表")]
async fn job_list_with_salary(world: &mut JobWorld, step: &Step) {
    let conn: DatabaseConnection = world.state.clone().unwrap().conn.clone();
    let now = Local::now().fixed_offset();
    let mut index: i64 = 0;
    if let Some(table) = step.table.as_ref() {
        for row in table.rows.iter().skip(1) {
            index += 1;
            let dt = (now + Duration::seconds(index)).fixed_offset();
            // NOTE: skip header
            let job_name: &String = &row[0];
            let job_salary_min = &row[1];
            let job_salary_max = &row[2];
            Job::insert(ActiveModel {
                id: Set(Uuid::new_v4().to_string()),
                name: Set(Some(job_name.to_owned())),
                salary_min: Set(Some(job_salary_min.parse::<f32>().unwrap())),
                salary_max: Set(Some(job_salary_max.parse::<f32>().unwrap())),
                create_datetime: Set(Some(dt)),
                update_datetime: Set(Some(dt)),
                ..Default::default()
            })
            .exec(&conn)
            .await
            .unwrap();
        }
    }
}

#[when(expr = "小明查询能给到{float}元每月薪资的职位")]
async fn search_by_salary(world: &mut JobWorld, salary: f32) {
    let param_json = json!({"page": {"num":1,"size":10},"salary":salary});
    let response = post_json(world.app.clone().unwrap(), SEARCH_API_URL, &param_json).await;
    assert_eq!(response.status(), StatusCode::OK);
    let jobs = get_json_paging_result_items(&response_to_json(response).await);
    let mut result = Vec::new();
    for job in jobs.iter() {
        result.push(JobItem {
            job_name: get_from_value(job, "name").unwrap(),
            job_salary_min: get_from_value(job, "salaryMin").unwrap(),
            job_salary_max: get_from_value(job, "salaryMax").unwrap(),
            ..Default::default()
        });
    }
    world.jobs = result;
}

#[then(expr = "小明应该能看到能给到{float}职位信息")]
async fn get_job_list_by_salary(world: &mut JobWorld, step: &Step, _salary: f32) {
    let jobs: &mut Vec<JobItem> = &mut world.jobs;
    if let Some(table) = step.table.as_ref() {
        assert_eq!(table.rows.len() - 1, jobs.len());
        for row in table.rows.iter().skip(1) {
            // NOTE: skip header
            let job = jobs.remove(0);
            assert_eq!(&row[0], job.job_name.as_str());
            assert_eq!(&row[1].parse::<f32>().unwrap(), &job.job_salary_min);
            assert_eq!(&row[2].parse::<f32>().unwrap(), &job.job_salary_max);
        }
    }
}

#[given("只有职位名的招聘职位表")]
async fn job_list_only_name(world: &mut JobWorld, step: &Step) {
    let conn: DatabaseConnection = world.state.clone().unwrap().conn;
    let now = Local::now().fixed_offset();
    let mut index: i64 = 0;
    if let Some(table) = step.table.as_ref() {
        for row in table.rows.iter().skip(1) {
            index += 1;
            let dt = (now + Duration::seconds(index)).fixed_offset();
            // NOTE: skip header
            let job_name: &String = &row[0];
            Job::insert(ActiveModel {
                id: Set(Uuid::new_v4().to_string()),
                name: Set(Some(job_name.to_owned())),
                create_datetime: Set(Some(dt)),
                update_datetime: Set(Some(dt)),
                ..Default::default()
            })
            .exec(&conn)
            .await
            .unwrap();
        }
    }
}

#[when(expr = "小明查询职位名含有 {} 的职位")]
async fn search_by_name(world: &mut JobWorld, name: String) {
    let param_json = json!({"page":{"num":1,"size":10},"name":name});
    let response = post_json(world.app.clone().unwrap(), SEARCH_API_URL, &param_json).await;
    assert_eq!(response.status(), StatusCode::OK);
    let jobs = get_json_paging_result_items(&response_to_json(response).await);
    let mut result = Vec::new();
    for job in jobs.iter() {
        result.push(JobItem {
            job_name: get_from_value(job, "name").unwrap(),
            ..Default::default()
        });
    }
    world.jobs = result;
}

#[then(expr = "小明应该能看到职位名为 {} 职位信息")]
async fn get_job_list_by_name(world: &mut JobWorld, step: &Step, _name: String) {
    let jobs: &mut Vec<JobItem> = &mut world.jobs;
    if let Some(table) = step.table.as_ref() {
        assert_eq!(table.rows.len() - 1, jobs.len());
        for row in table.rows.iter().skip(1) {
            let job = jobs.remove(0);
            assert_eq!(&row[0], job.job_name.as_str());
        }
    }
}

#[given("含有地址的招聘职位表")]
async fn job_list_with_address(world: &mut JobWorld, step: &Step) {
    let conn: DatabaseConnection = world.state.clone().unwrap().conn;
    let now = Local::now().fixed_offset();
    let mut index: i64 = 0;
    if let Some(table) = step.table.as_ref() {
        for row in table.rows.iter().skip(1) {
            index += 1;
            let dt = (now + Duration::seconds(index)).fixed_offset();
            // NOTE: skip header
            Job::insert(ActiveModel {
                id: Set(Uuid::new_v4().to_string()),
                name: Set(Some(row[0].to_string())),
                address: Set(Some(row[1].to_string())),
                create_datetime: Set(Some(dt)),
                update_datetime: Set(Some(dt)),
                ..Default::default()
            })
            .exec(&conn)
            .await
            .unwrap();
        }
    }
}

#[when(expr = "小明查询地址含有 {} 的职位")]
async fn search_by_address(world: &mut JobWorld, name: String) {
    let param_json = json!({"page":{"num":1,"size":10},"address":name});
    let response = post_json(world.app.clone().unwrap(), SEARCH_API_URL, &param_json).await;
    assert_eq!(response.status(), StatusCode::OK);
    let jobs = get_json_paging_result_items(&response_to_json(response).await);
    let mut result = Vec::new();
    for job in jobs.iter() {
        result.push(JobItem {
            job_name: get_from_value(job, "name").unwrap(),
            address: get_from_value(job, "address").unwrap(),
            ..Default::default()
        });
    }
    world.jobs = result;
}

#[then(expr = "小明应该能看到地址含有 {} 职位信息")]
async fn get_job_list_by_address(world: &mut JobWorld, step: &Step, _name: String) {
    let jobs: &mut Vec<JobItem> = &mut world.jobs;
    if let Some(table) = step.table.as_ref() {
        assert_eq!(table.rows.len() - 1, jobs.len());
        for row in table.rows.iter().skip(1) {
            let job = jobs.remove(0);
            assert_eq!(&row[0], job.job_name.as_str());
            assert_eq!(&row[1], job.address.as_str());
        }
    }
}

#[given("含有发布时间的招聘职位表")]
async fn job_list_with_publish_datetime(world: &mut JobWorld, step: &Step) {
    let conn: DatabaseConnection = world.state.clone().unwrap().conn;
    let now = Local::now().fixed_offset();
    let mut index: i64 = 0;
    if let Some(table) = step.table.as_ref() {
        for row in table.rows.iter().skip(1) {
            index += 1;
            let dt = (now + Duration::seconds(index)).fixed_offset();
            // NOTE: skip header
            Job::insert(ActiveModel {
                id: Set(Uuid::new_v4().to_string()),
                name: Set(Some(row[0].to_string())),
                first_publish_datetime: Set(str_to_datetime(row[1].clone())),
                create_datetime: Set(Some(dt)),
                update_datetime: Set(Some(dt)),
                ..Default::default()
            })
            .exec(&conn)
            .await
            .unwrap();
        }
    }
}

#[when(expr = "小明查询发布时间范围{}至{}的职位")]
async fn search_by_publish_datetime(
    world: &mut JobWorld,
    start_datetime: String,
    end_datetime: String,
) {
    let start_datetime = str_to_datetime(start_datetime);
    let end_datetime = str_to_datetime(end_datetime);
    // tracing::info!("{:?},{:?}",start_datetime,end_datetime);
    let param_json = json!({
        "page":{"num":1,"size":10},
        "publishDatetimeStart":datetime_to_str(start_datetime),
        "publishDatetimeEnd":datetime_to_str(end_datetime)
    });
    let response = post_json(world.app.clone().unwrap(), SEARCH_API_URL, &param_json).await;
    // tracing::info!("{:?}",from_utf8(&response.into_body().collect().await.unwrap().to_bytes()));
    assert_eq!(response.status(), StatusCode::OK);
    let jobs = get_json_paging_result_items(&response_to_json(response).await);
    let mut result = Vec::new();
    for job in jobs.iter() {
        result.push(JobItem {
            job_name: get_from_value(job, "name").unwrap(),
            first_publish_datetime: str_to_datetime(
                get_from_value(job, "firstPublishDatetime").unwrap(),
            ),
            ..Default::default()
        });
    }
    world.jobs = result;
}

#[then(expr = "小明应该能看到指定时间范围内发布的职位")]
async fn get_job_list_by_publish_datetime(world: &mut JobWorld, step: &Step) {
    let jobs: &mut Vec<JobItem> = &mut world.jobs;
    if let Some(table) = step.table.as_ref() {
        assert_eq!(table.rows.len() - 1, jobs.len());
        for row in table.rows.iter().skip(1) {
            let job = jobs.remove(0);
            assert_eq!(&row[0], job.job_name.as_str());
            assert_eq!(str_to_datetime(row[1].clone()), job.first_publish_datetime);
        }
    }
}

#[given("含有职位发现时间的招聘职位表")]
async fn job_list_with_create_datetime(world: &mut JobWorld, step: &Step) {
    let conn: DatabaseConnection = world.state.clone().unwrap().conn;
    let now = Local::now().fixed_offset();
    let mut index: i64 = 0;
    if let Some(table) = step.table.as_ref() {
        for row in table.rows.iter().skip(1) {
            index += 1;
            let dt = (now + Duration::seconds(index)).fixed_offset();
            // NOTE: skip header
            Job::insert(ActiveModel {
                id: Set(Uuid::new_v4().to_string()),
                name: Set(Some(row[0].to_string())),
                create_datetime: Set(str_to_datetime(row[1].clone())),
                update_datetime: Set(Some(dt)),
                ..Default::default()
            })
            .exec(&conn)
            .await
            .unwrap();
        }
    }
}

#[when(expr = "小明查询职位发现范围时间{}至{}的职位")]
async fn search_by_create_datetime(
    world: &mut JobWorld,
    start_datetime: String,
    end_datetime: String,
) {
    let start_datetime = str_to_datetime(start_datetime);
    let end_datetime = str_to_datetime(end_datetime);
    // tracing::info!("{:?},{:?}",start_datetime,end_datetime);
    let param_json = json!({
        "page":{ "num":1,"size":10},
        "createDatetimeStart":datetime_to_str(start_datetime),
        "createDatetimeEnd":datetime_to_str(end_datetime)
    });
    let response = post_json(world.app.clone().unwrap(), SEARCH_API_URL, &param_json).await;
    // tracing::info!("{:?}",from_utf8(&response.into_body().collect().await.unwrap().to_bytes()));
    assert_eq!(response.status(), StatusCode::OK);
    let jobs = get_json_paging_result_items(&response_to_json(response).await);
    let mut result = Vec::new();
    for job in jobs.iter() {
        result.push(JobItem {
            job_name: get_from_value(job, "name").unwrap(),
            create_datetime: str_to_datetime(get_from_value(job, "createDatetime").unwrap()),
            ..Default::default()
        });
    }
    world.jobs = result;
}

#[then(expr = "小明应该能看到指定时间范围内发现的职位")]
async fn get_job_list_by_create_datetime(world: &mut JobWorld, step: &Step) {
    let jobs: &mut Vec<JobItem> = &mut world.jobs;
    if let Some(table) = step.table.as_ref() {
        assert_eq!(table.rows.len() - 1, jobs.len());
        for row in table.rows.iter().skip(1) {
            let job = jobs.remove(0);
            assert_eq!(&row[0], job.job_name.as_str());
            assert_eq!(str_to_datetime(row[1].clone()), job.create_datetime);
        }
    }
}

#[derive(Debug, Default)]
struct JobItem {
    pub job_name: String,
    pub job_salary_min: f32,
    pub job_salary_max: f32,
    pub address: String,
    pub first_publish_datetime: Option<DateTime<FixedOffset>>,
    pub create_datetime: Option<DateTime<FixedOffset>>,
}

#[derive(Debug, Default, World)]
pub struct JobWorld {
    jobs: Vec<JobItem>,
    container: Option<ContainerAsync<Postgres>>,
    app: Option<Router>,
    state: Option<AppState>,
}

#[tokio::test]
async fn main() {
    JobWorld::cucumber()
        // .init_tracing()
        .before(|_feature, _rule, _scenario, world| {
            async move {
                let (container, state) = setup_database().await;
                world.container = container;
                world.state = Some(state.clone());
                let app = OpenApiRouter::new();
                let app = setup_job(app, state).split_for_parts().0;
                let app = setup_default(app);
                let app = app.layer(MockConnectInfo(SocketAddr::from(([0, 0, 0, 0], 1337))));
                world.app = Some(app);
            }
            .boxed()
        })
        .after(|_feature, _rule, _scenario, _ev, world| {
            async move {
                if let Some(world) = world.as_ref() {
                    tear_down(&world.container).await;
                }
            }
            .boxed()
        })
        .run("tests/features/job/get_info/search.feature")
        .await;
}
