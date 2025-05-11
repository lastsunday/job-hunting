import { expect, test } from "vitest";
import { GithubApi, _fetch as githubFetch } from "@/common/api/github";

const skipOnlineTest = !(import.meta.env.TEST_ENABLE_ONLINE_TEST === "true");
const accessToken = import.meta.env.TEST_GITHUB_APP_ACCESS_TOKEN;
const refreshToken = import.meta.env.TEST_GITHUB_APP_REFRESH_TOKEN;
const owner = import.meta.env.TEST_GITHUB_APP_USERNAME;
const repo = "job-hunting-data";
const treeSha = "HEAD";

test('get tree return repo tree data', { timeout: 30000, skip: skipOnlineTest }, async () => {
    let tokenDTO = {
        accessToken, refreshToken
    }
    const result = await GithubApi.getTree(owner, repo, treeSha,
        {
            getTokenFunction: async () => { return tokenDTO },
            setTokenFunction: async (token) => { tokenDTO = token }
        })
    expect(result.tree.length).gte(0);
})

test('fetch return response object', { timeout: 30000, skip: skipOnlineTest }, async () => {
    let tokenDTO = {
        accessToken, refreshToken
    }
    const response = await githubFetch("https://api.github.com/user", {
        getTokenFunction: async () => { return tokenDTO },
        setTokenFunction: async (token) => { tokenDTO = token }
    })
    expect(response.status).toBe(200);
})