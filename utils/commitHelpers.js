const fs = require('fs');
const path = require('path');
const moment = require('moment');
const { writeCommitDates } = require('./files');
const { getValidDate } = require('./dateHelpers');

const writeDummyFile = async (git, DummyFile_path, DATE) => {
    writeCommitDates(DummyFile_path, DATE);
    const commitMessage = `Update data ${moment(DATE).format('YYYY-MM-DD')}`;
    await git.add(DummyFile_path);
    await git.commit(commitMessage, {
        '--date': DATE
    });
};

const writeRealFile = async (git, filePath, DATE, debugLog) => {
    const fileName = path.basename(filePath);
    const commitMessage = `Update ${fileName}`;

    const ignorePatterns = new Set([
        '/.git', 
        '/node_modules', 
        '/.next', 
        '/.vscode', 
        '/.env', 
        '.cursorignore', 
        '__pycache__/', 
        '*.py[cod]', 
        '.ipynb_checkpoints/', 
        'env/', 
        'venv/', 
        'ENV/', 
        '.venv/', 
        '/.idea/', 
        '/.pytest_cache/', 
        '/.DS_Store', 
        '*.log', 
        '*.tmp', 
        '*.bak', 
        '*.swp', 
        '*.swo', 
        '*.pem', 
        '.Identifier',
        '/build/', 
        '/dist/',
        '*.env',
        '*.config',
        '*credentials*',
        '*secret*',
        '*.pem',
        '*.key'
    ]);
    
    const isIgnored = [...ignorePatterns].some(pattern => 
        pattern.startsWith('*') 
            ? path.extname(filePath) === pattern.slice(1)
            : filePath.includes(pattern)
    );

    if (!isIgnored && fs.existsSync(filePath)) {
        try {
            const isGitIgnored = await git.checkIgnore([filePath]);
            if (isGitIgnored.length === 0) {
                await git.add(filePath);
                await git.commit(commitMessage, {
                    '--date': DATE
                });
                debugLog("Successfully committed file:", filePath);
            } else {
                debugLog("Skipping git-ignored file:", filePath);
            }
        } catch (error) {
            if (!error.message.includes('ignored by one of your .gitignore files')) {
                debugLog(`Failed to commit file ${filePath}:`, error);
            }
        }
    }
};

const makeCommit = async (repoPath, totalCommits, repoName, year, git, files, batchSize, debugLog) => {
    try {
        const fileCount = files.length;
        const DummyFile_path = path.join(repoPath, 'commit_dates.json');
        const dummyCount = totalCommits - fileCount;

        for (let i = 0; i < dummyCount; i++) {
            const randomValue = Math.random();
            const yearsToSubtract = year < 4 ? (randomValue < 0.5 ? 1 : 2) : 
                                (randomValue < 0.4 ? 1 : 
                                randomValue < 0.6 ? 2 : 
                                randomValue < 0.8 ? 3 : 
                                randomValue < 0.9 ? 4 : year);
            const DATE = getValidDate(year, yearsToSubtract).format();
            await writeDummyFile(git, DummyFile_path, DATE);
            
            if((i + 1) % batchSize === 0 || i === dummyCount - 1) {
                await git.push('origin', 'main');
                debugLog(`Pushed batch of ${Math.min(batchSize, i + 1)} commits`);
            }
        }

        for (let i = 0; i < fileCount; i++) {
            const randomValue = Math.random();
            const yearsToSubtract = year < 4 ? (randomValue < 0.5 ? 1 : 2) : 
                                (randomValue < 0.4 ? 1 : 
                                randomValue < 0.6 ? 2 : 
                                randomValue < 0.8 ? 3 : 
                                randomValue < 0.9 ? 4 : year);
            const DATE = getValidDate(year, yearsToSubtract).format();
            const filePath = files[i];
            
            try {
                await writeRealFile(git, filePath, DATE, debugLog);
                
                if((i + 1) % batchSize === 0 || i === fileCount - 1) {
                    try {
                        await git.push('origin', 'main');
                        debugLog(`Pushed batch of ${Math.min(batchSize, i + 1)} commits`);
                    } catch (pushError) {
                        if (pushError.message.includes('repository rule violations') || 
                            pushError.message.includes('secret-scanning')) {
                            debugLog(`Skipping push due to secret detection in repository: ${repoName}`);
                            return;
                        }
                        throw pushError;
                    }
                }
            } catch (error) {
                debugLog(`Error processing file ${filePath}:`, error);
                continue;
            }
        }
    } catch (error) {
        console.error(`Error in makeCommit for ${repoName}:`, error);
        debugLog(`Skipping remaining operations for ${repoName} due to error`);
    }
};

const checkGitIgnoredFiles = async (git, files, debugLog, batchSize = 1000) => {
    const gitIgnoredFiles = new Set();
    
    for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        try {
            const ignoredBatch = await git.checkIgnore(batch);
            ignoredBatch.forEach(file => gitIgnoredFiles.add(file));
        } catch (error) {
            debugLog(`Error checking batch ${i}-${i + batchSize}:`, error);
            continue;
        }
    }
    
    return files.filter(file => !gitIgnoredFiles.has(file));
};

module.exports = {
    writeDummyFile,
    writeRealFile,
    makeCommit,
    checkGitIgnoredFiles
}; 