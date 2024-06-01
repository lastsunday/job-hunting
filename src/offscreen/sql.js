export const SQL_JOB_SEARCH_QUERY = "SELECT job_id AS jobId,job_platform AS jobPlatform,job_url AS jobUrl,job_name AS jobName,job_company_name AS jobCompanyName,job_location_name AS jobLocationName,job_address AS jobAddress,job_longitude AS jobLongitude,job_latitude AS jobLatitude,job_description AS jobDescription,job_degree_name AS jobDegreeName,job_year AS jobYear,job_salary_min AS jobSalaryMin,job_salary_max AS jobSalaryMax,job_salary_total_month AS jobSalaryTotalMonth,job_first_publish_datetime AS jobFirstPublishDatetime,boss_name AS bossName,boss_company_name AS bossCompanyName,boss_position AS bossPosition,create_datetime AS createDatetime,update_datetime AS updateDatetime FROM job";

export const SQL_GROUP_BY_COUNT_AVG_SALARY = `
SELECT 
	t2.levels,
	COUNT(t2.levels) AS total
FROM
	(
	SELECT
		(CASE
			WHEN t1.avgsalary<3000 THEN '<3k'
			WHEN t1.avgsalary >= 3000
			AND t1.avgsalary<6000 THEN '3k-6k'
			WHEN t1.avgsalary >= 6000
			AND t1.avgsalary<9000 THEN '6k-9k'
			WHEN t1.avgsalary >= 9000
			AND t1.avgsalary<12000 THEN '9k-12k'
			WHEN t1.avgsalary >= 12000
			AND t1.avgsalary<15000 THEN '12k-15k'
			WHEN t1.avgsalary >= 15000
			AND t1.avgsalary<18000 THEN '15k-18k'
			WHEN t1.avgsalary >= 18000
			AND t1.avgsalary<21000 THEN '18k-21k'
			WHEN t1.avgsalary >= 21000
			AND t1.avgsalary<24000 THEN '21k-24k'
			ELSE '>24k'
		END) AS levels
	FROM
		(
		SELECT
			(t0.jobSalaryMin + t0.jobSalaryMax)/ 2 AS avgsalary
		FROM
			(#{injectSql}) AS t0
		where
			avgsalary > 0) AS t1
) AS t2
GROUP BY
	t2.levels;
`;
