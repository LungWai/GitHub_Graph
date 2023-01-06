const axios = require('axios');
require('dotenv').config();
// GitHub Personal Access Token
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_USERNAME = process.env.GITHUB_USERNAME;

async function setAllReposPrivate() {
    try {
        // Get all repositories with pagination
        let page = 1;
        let allRepos = [];
        
        while (true) {
            const reposResponse = await axios.get('https://api.github.com/user/repos', {
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json'
                },
                params: {
                    per_page: 100,
                    page: page,
                    affiliation: 'owner',
                    visibility: 'all'
                }
            });

            if (reposResponse.data.length === 0) break;
            allRepos = allRepos.concat(reposResponse.data);
            page++;
        }

        console.log('Retrieved repositories:', allRepos.length);

        // Set each repository to private only if it is not already private
        for (const repo of allRepos) {
            const repoName = repo.name;
            if (!repo.private) {
                await axios.patch(`https://api.github.com/repos/${GITHUB_USERNAME}/${repoName}`, {
                    private: true
                }, {
                    headers: {
                        'Authorization': `token ${GITHUB_TOKEN}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
                console.log(`Set ${repoName} to private`);
            } else {
                console.log(`${repoName} is already private`);
            }
        }

        console.log('All applicable repositories have been set to private');
    } catch (error) {
        console.error('Error setting repositories to private:', error.response?.data || error.message);
    }
}

setAllReposPrivate();
