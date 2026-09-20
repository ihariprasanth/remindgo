const https = require('https');

function testQuery(username) {
  const query = `
    query userPublicProfile($username: String!) {
      matchedUser(username: $username) {
        username
        githubUrl
        profile {
          ranking
          userAvatar
          realName
          reputation
        }
        submitStatsGlobal {
          acSubmissionNum {
            difficulty
            count
          }
        }
        userCalendar {
          streak
          totalActiveDays
          submissionCalendar
        }
      }
      allQuestionsCount {
        difficulty
        count
      }
    }
  `;

  const payload = JSON.stringify({
    query,
    variables: { username }
  });

  return new Promise((resolve, reject) => {
    const req = https.request('https://leetcode.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://leetcode.com',
        'Origin': 'https://leetcode.com'
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        console.log('Response:', body.slice(0, 600));
        resolve();
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

testQuery('neal_wu').catch(console.error);
