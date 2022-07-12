const axios = require('axios');

const createGitHubRepo = async (repoName, GITHUB_TOKEN) => {
  try {
    const response = await axios.post(
      'https://api.github.com/user/repos',
      {
        name: repoName,
        private: false,
        auto_init: false,
        default_branch: 'main'
      },
      {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );
    return response.data.clone_url;
  } catch (error) {
    console.error(`Error creating repository ${repoName}:`, 
      error.response?.data || error.message
    );
    throw error;
  }
};

module.exports = { createGitHubRepo }; 