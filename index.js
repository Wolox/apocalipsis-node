const fs = require('fs');
const runGitChecks = require('@wolox/git-metrics');
const axios = require('axios');
const shell = require('shelljs');
const rimraf = require('rimraf');
require('dotenv').config();

const PWD = process.cwd();

const OAUTH_TOKEN = process.env.GITHUB_OAUTH_TOKEN;

const oneMillion = 1000000;

const hundread = 100;

const api = axios.create({
  baseURL: process.env.API_BASE_URL,
  timeout: 10000,
  headers: { Authorization: process.env.API_KEY }
});

// eslint-disable-next-line no-magic-numbers, no-mixed-operators
const calculatePercentage = (points) => 224.888 - 25.564 * Math.log(201.242 * points - 130.662);

const pointsToPercentage = (points) => {
  const result = calculatePercentage(points / oneMillion);
  if (isNaN(result) || result > hundread) {
    return hundread;
  }
  if (result < 0) {
    return 0;
  }
  return result;
};

const groupIssuesInFiles = (acc, { location, remediation_points: remediationPoints }) => {
  if (!remediationPoints) {
    return acc;
  }
  const { path } = location;
  const points = (acc[path] || 0) + remediationPoints;
  return { ...acc, [path]: points };
};

const runCodeclimate = (repoName) => 
  `docker run \
  --env CODECLIMATE_CODE="${process.env.HOST_PATH}/projects/${repoName}" \
  --volume "${process.env.HOST_PATH}/projects/${repoName}":/code \
  --volume /var/run/docker.sock:/var/run/docker.sock \
  --volume /tmp/cc:/tmp/cc wolox/codeclimate \
  > "./projects/${repoName}/code_quality.json"`

function executeCodeClimate(repoName) {
  shell.exec(`${runCodeclimate(repoName)}`)
  
  try {
    const data = JSON.parse(fs.readFileSync(`./projects/${repoName}/code_quality.json`));

    const reducedByPaths = data.reduce(groupIssuesInFiles, {});

    const percentages = Object.values(reducedByPaths).map((points) => pointsToPercentage(points));

    const resultForFilesWithIssues = percentages.reduce((acc, elem) => acc + elem, 0) / percentages.length;

    return { name: 'code-quality', value: resultForFilesWithIssues, version: '1.0' };
  } catch (e) {
    console.error(e);
    return { name: 'code-quality', value: NaN, version: '1.0' };
  }
}

function getCoveragePercentage(repoName) {
  try {
    const data = JSON.parse(fs.readFileSync(`./projects/${repoName}/code_coverage.json`));
    return { name: 'code-coverage', value: data.total, version: '1.0' };
  } catch (e) {
    console.error(e);
    return { name: 'code-coverage', value: NaN, version: '1.0' };
  }
}

async function getAllMetrics({ repoName, org = 'wolox', provider = 'github', tech, id }) {
  const codeQuality = executeCodeClimate(repoName);

  const codeCoverage = getCoveragePercentage(repoName);

  const gitMetrics = await runGitChecks(provider, OAUTH_TOKEN)(repoName, org);

  const pullRequestBody = { pull_requests: gitMetrics.filter((pr) => pr.review_time && pr.pick_up_time) };

  // axiosApi
  //   .post(`/repositories/${id}/pull_requests`, pullRequestBody, { headers: { Authorization: apiKey } })
  //   .catch(error => console.log(`Error: ${error}`));

  const metrics = [codeQuality, codeCoverage].filter(({ value }) => !isNaN(value));

  const body = {
    env: 'development',
    tech,
    repo_name: repoName,
    metrics
  };
  console.log('Metricas a persistir', body);
  // axiosApi
  //   .post('/metrics', body, { headers: { Authorization: apiKey } })
  //   .catch(error => console.log(`Error: ${error}`));
}

const httpsIndex = 8;

api
  .get('/repositories')
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .then(async (response) => {
    const repositories = response.data.filter((e) => e.download_url);
    for (const repository of repositories) {
      try {
        const downloadUrl = repository.download_url;
        const authUrl = `${downloadUrl.slice(0, httpsIndex)}${OAUTH_TOKEN}@${downloadUrl.slice(httpsIndex)}`;
        shell.exec(`git clone ${authUrl} projects/${repository.name}`);
        await getAllMetrics({ repoName: repository.name, tech: repository.tech, , id: repository.id });
        rimraf.sync(`./projects/${repository.name}`);
      } catch (e) {
        console.error(e);
      }
    }
  });
