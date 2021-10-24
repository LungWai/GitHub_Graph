require('dotenv').config();
const simpleGit = require("simple-git");
const fs = require('fs');
const path = require('path');

// Import utility functions
const { createGitHubRepo } = require('./utils/github');
const { getAllFiles } = require('./utils/files');
const { makeCommit, checkGitIgnoredFiles } = require('./utils/commitHelpers');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_USERNAME = process.env.GITHUB_USERNAME;
const GITHUB_EMAIL = process.env.GITHUB_EMAIL;

const YEAR = 7;

// Modify the DEBUG_MODE constant to have a default value
const DEBUG_MODE = process.env.DEBUG_MODE === 'true' || false;

// Enhance the debugLog function to include timestamps and better formatting
const debugLog = (...args) => {
    if (DEBUG_MODE) {
        const timestamp = new Date().toISOString();
        console.log(`[DEBUG ${timestamp}]`, ...args);
    }
};

// Add an initial debug log to verify it's working
debugLog('Debug mode is enabled');

if (!GITHUB_TOKEN || !GITHUB_USERNAME || !GITHUB_EMAIL) {
   throw new Error('GitHub credentials not found in environment variables');
}

const PROJECT_FOLDER = '/home/lwsze/testfield';
const repos = fs.readdirSync(PROJECT_FOLDER)
  .map(repo => path.join(PROJECT_FOLDER, repo))
  .filter(repoPath => fs.statSync(repoPath).isDirectory());

const run = async () => {
    debugLog('Starting repository processing');
    try {
        for (const repo of repos) {
            const repoName = repo.split('/').pop();
            debugLog(`Processing repository: ${repoName}`);
            
            const git = simpleGit(repo);
            await git.init();
            await git.addConfig('user.name', GITHUB_USERNAME);
            await git.addConfig('user.email', GITHUB_EMAIL);
            
            debugLog(`Starting creation of GitHub repository: ${repoName}`);
            const cloneUrl = await createGitHubRepo(repoName, GITHUB_TOKEN);
            debugLog(`Successfully created repository: ${GITHUB_USERNAME}/${repoName}`);
            debugLog(`Clone URL: ${cloneUrl}`);
            
            const tokenUrl = cloneUrl.replace('https://', `https://${GITHUB_TOKEN}@`);
            await git.addRemote('origin', tokenUrl);
            
            const readmePath = path.join(repo, 'README.md');
            if (!fs.existsSync(readmePath)) {
                fs.writeFileSync(readmePath, `# ${repoName}\n`);
            }
            await git.add(readmePath);
            await git.commit('Initial commit', {
                '--author': `${GITHUB_USERNAME} <${GITHUB_EMAIL}>`
            });
            await git.branch(['-M', 'main']);
            
            await git.push('origin', 'main', ['--set-upstream']);
            
            debugLog(`Starting commit process for ${repoName}`);
            let files = getAllFiles(repo);
            
            // Filter out git-ignored files using the new function
            files = await checkGitIgnoredFiles(git, files, debugLog);
            debugLog("Non-ignored files found in repository:", files.length);
            
            const minCountPerRepo = 150;
            const commitBatchSize = 50;
            if (minCountPerRepo > files.length) {
                await makeCommit(repo, minCountPerRepo, repoName, YEAR, git, files, commitBatchSize, debugLog);
            } else {
                await makeCommit(repo, files.length, repoName, YEAR, git, files, commitBatchSize, debugLog);
            }
            debugLog(`Completed processing ${repoName}\n`);
        }
        debugLog('All repositories processed successfully');
    } catch (error) {
        console.error('Error in run function:', error);
        throw error;
    }
};

run().catch(console.error);
