const axios = require('axios');
const readline = require('readline');
require('dotenv').config();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_USERNAME = process.env.GITHUB_USERNAME;
const SECURE_MODE = process.env.SECURE_MODE === 'false'; // Ensure SECURE_MODE is set to true

// Create readline interface for user confirmation
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function confirmDeletion(repoCount) {
    // Skip confirmation if secure mode is disabled
    if (!SECURE_MODE) {
        return true;
    }
    
    return new Promise((resolve) => {
        rl.question(
            `⚠️  WARNING: This will delete ${repoCount} repositories from your GitHub account.\n` +
            'This action cannot be undone!\n' +
            'Type "DELETE" to confirm: ',
            (answer) => {
                resolve(answer === 'DELETE');
            }
        );
    });
}

async function getAllRepositories() {
    let page = 1;
    let allRepos = [];
    
    while (true) {
        const response = await axios.get(
            'https://api.github.com/user/repos', {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            },
            params: {
                per_page: 100,
                page: page,
                affiliation: 'owner', // Only get repos owned by the user
                visibility: 'all'     // Get both private and public repos
            }
        });
        
        if (response.data.length === 0) break;
        allRepos = allRepos.concat(response.data);
        page++;
    }
    
    return allRepos;
}

async function verifyTokenPermissions() {
    try {
        const tokenResponse = await axios.get('https://api.github.com/user', {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`
            }
        });
        const scopes = tokenResponse.headers['x-oauth-scopes'];
        console.log('Token scopes:', scopes);
        
        if (!scopes.includes('repo') || !scopes.includes('delete_repo')) {
            console.error('⚠️  Warning: Token missing required scopes (repo and delete_repo)');
            console.error('Current scopes:', scopes);
            process.exit(1);
        }
    } catch (error) {
        console.error('Error verifying token:', error.message);
        process.exit(1);
    }
}

async function deleteAllRepos() {
    try {
        await verifyTokenPermissions();
        const repos = await getAllRepositories();
        
        const privateRepos = repos.filter(repo => repo.private).length;
        const publicRepos = repos.filter(repo => !repo.private).length;
        
        console.log('Total repositories found:', repos.length);
        console.log(`- Private repositories: ${privateRepos}`);
        console.log(`- Public repositories: ${publicRepos}`);

        // Get user confirmation before proceeding
        const confirmed = await confirmDeletion(repos.length);
        
        if (!confirmed) {
            console.log('Operation cancelled by user');
            rl.close();
            return;
        }

        // Delete each repository
        for (const repo of repos) {
            const repoName = repo.name;
            const repoOwner = repo.owner.login;
            const visibility = repo.private ? 'private' : 'public';
            
            try {
                await axios.delete(`https://api.github.com/repos/${repoOwner}/${repoName}`, {
                    headers: {
                        'Authorization': `token ${GITHUB_TOKEN}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
                console.log(`✓ Successfully deleted ${repoName} (${visibility})`);
            } catch (deleteError) {
                console.error(`✗ Failed to delete ${repoName}:`, deleteError.response?.data?.message || deleteError.message);
                
                if (repo.fork) {
                    try {
                        await axios.delete(`https://api.github.com/repos/${repoOwner}/${repoName}`, {
                            headers: {
                                'Authorization': `token ${GITHUB_TOKEN}`,
                                'Accept': 'application/vnd.github.v3+json'
                            },
                            data: {
                                delete_branch: true
                            }
                        });
                        console.log(`✓ Successfully deleted fork ${repoName}`);
                    } catch (forkDeleteError) {
                        console.error(`✗ Failed to delete fork ${repoName}`);
                    }
                }
            }
            
            // Add a small delay between deletions to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log('Repository deletion process completed');
    } catch (error) {
        console.error('Error:', error.response?.data?.message || error.message);
    } finally {
        rl.close();
    }
}

// Check if required environment variables are set
if (!GITHUB_TOKEN || !GITHUB_USERNAME) {
    console.error('Error: GITHUB_TOKEN and GITHUB_USERNAME must be set in .env file');
    process.exit(1);
}

// Add warning if secure mode is disabled
if (!SECURE_MODE) {
    console.warn('⚠️  Warning: Running in non-secure mode - deletion confirmation is disabled');
}

deleteAllRepos(); 