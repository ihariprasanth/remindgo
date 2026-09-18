import { dbInstance } from './db/database';
import { LeetCodeData } from '../src/types';

const LEETCODE_GRAPHQL_ENDPOINT = 'https://leetcode.com/graphql';

// Verified current LeetCode GraphQL schema
const USER_PROFILE_QUERY = `
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

const DAILY_CHALLENGE_QUERY = `
query questionOfToday {
  activeDailyCodingChallengeQuestion {
    date
    link
    question {
      questionId
      questionFrontendId
      title
      titleSlug
      difficulty
    }
  }
}
`;

export async function fetchLeetCodeData(username: string, forceRefresh: boolean = false): Promise<LeetCodeData> {
  const cleanUsername = username.trim();
  if (!cleanUsername) {
    throw new Error('Please enter a valid LeetCode username.');
  }

  const cached = dbInstance.getLeetCodeCache(cleanUsername);

  // Return fresh cache if within 10 minutes and not forced
  if (cached && !forceRefresh) {
    const ageMs = Date.now() - new Date(cached.last_synced).getTime();
    if (ageMs < 10 * 60 * 1000) {
      return {
        ...cached.data,
        isOffline: false,
        lastSynced: cached.last_synced
      };
    }
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://leetcode.com',
      'Origin': 'https://leetcode.com'
    };

    const [userRes, dailyRes] = await Promise.all([
      fetch(LEETCODE_GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: USER_PROFILE_QUERY,
          variables: { username: cleanUsername }
        }),
        signal: controller.signal
      }),
      fetch(LEETCODE_GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: DAILY_CHALLENGE_QUERY
        }),
        signal: controller.signal
      })
    ]);

    clearTimeout(timeoutId);

    if (!userRes.ok) {
      throw new Error(`LeetCode server responded with status: ${userRes.status}`);
    }

    const userData = await userRes.json();
    const dailyData = dailyRes.ok ? await dailyRes.json() : null;

    // Handle user not found gracefully
    if (!userData.data || !userData.data.matchedUser) {
      throw new Error(`User "${cleanUsername}" was not found on LeetCode. Please check your username.`);
    }

    const matched = userData.data.matchedUser;
    const allCounts = userData.data.allQuestionsCount || [];
    const calendar = matched.userCalendar || {};
    const acSubmissions = matched.submitStatsGlobal?.acSubmissionNum || [];

    const getCount = (diff: string) => {
      const found = acSubmissions.find((s: any) => s.difficulty.toLowerCase() === diff.toLowerCase());
      return found ? found.count : 0;
    };

    const getTotalPossible = (diff: string) => {
      const found = allCounts.find((s: any) => s.difficulty.toLowerCase() === diff.toLowerCase());
      return found ? found.count : 0;
    };

    let dailyChallenge = undefined;
    if (dailyData?.data?.activeDailyCodingChallengeQuestion) {
      const q = dailyData.data.activeDailyCodingChallengeQuestion;
      dailyChallenge = {
        date: q.date,
        link: 'https://leetcode.com' + q.link,
        title: q.question.title,
        difficulty: q.question.difficulty,
        questionFrontendId: q.question.questionFrontendId
      };
    }

    let calendarMap: Record<string, number> = {};
    if (calendar.submissionCalendar) {
      try {
        calendarMap = JSON.parse(calendar.submissionCalendar);
      } catch {
        calendarMap = {};
      }
    }

    const resultData: LeetCodeData = {
      username: matched.username,
      realName: matched.profile?.realName || matched.username,
      userAvatar: matched.profile?.userAvatar || '',
      ranking: matched.profile?.ranking || 0,
      reputation: matched.profile?.reputation || 0,
      totalSolved: getCount('All'),
      totalQuestions: getTotalPossible('All'),
      easySolved: getCount('Easy'),
      totalEasy: getTotalPossible('Easy'),
      mediumSolved: getCount('Medium'),
      totalMedium: getTotalPossible('Medium'),
      hardSolved: getCount('Hard'),
      totalHard: getTotalPossible('Hard'),
      streak: calendar.streak || 0,
      totalActiveDays: calendar.totalActiveDays || 0,
      submissionCalendar: calendarMap,
      dailyChallenge,
      isOffline: false,
      lastSynced: new Date().toISOString()
    };

    dbInstance.setLeetCodeCache(cleanUsername, resultData);
    dbInstance.updateSettings({ leetcodeUsername: cleanUsername });

    return resultData;
  } catch (err: any) {
    console.warn('[LeetCode] Network error:', err.message);
    if (cached) {
      return {
        ...cached.data,
        isOffline: true,
        lastSynced: cached.last_synced,
        errorMessage: `Offline: Using cached stats from ${new Date(cached.last_synced).toLocaleString()}`
      };
    }
    throw new Error(err.message || 'Could not fetch LeetCode data. Check your internet connection.');
  }
}
