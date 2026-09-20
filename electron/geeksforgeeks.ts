import { dbInstance } from './db/database';
import { GeeksForGeeksData } from '../src/types';

export async function fetchGeeksForGeeksData(username: string, forceRefresh: boolean = false): Promise<GeeksForGeeksData> {
  const cleanUsername = username.trim();
  if (!cleanUsername) {
    throw new Error('Please enter a valid GeeksforGeeks username.');
  }

  const cached = dbInstance.getGeeksForGeeksCache(cleanUsername);

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

    const res = await fetch(`https://www.geeksforgeeks.org/user/${encodeURIComponent(cleanUsername)}/`, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`GeeksforGeeks responded with status: ${res.status}`);
    }

    const html = await res.text();

    // Check if user was not found
    if (html.includes('404 Page Not Found') || html.includes('User does not exist') || html.includes('undefined   | GeeksforGeeks Profile') || html.includes('undefined | GeeksforGeeks Profile')) {
      throw new Error(`User "${cleanUsername}" was not found on GeeksforGeeks. Please check your username.`);
    }

    // Extract user info object from RSC / script payload
    // Note: in Next.js RSC payload, keys and strings may have escaped quotes \"
    const scoreMatch = html.match(/\\?"score\\?":\s*(\d+)/);
    const totalSolvedMatch = html.match(/\\?"total_problems_solved\\?":\s*(\d+)/);
    const instituteRankMatch = html.match(/\\?"institute_rank\\?":\s*\\?"?(\d+)\\?"?/);
    const podStreakMatch = html.match(/\\?"pod_solved_longest_streak\\?":\s*(\d+)/);
    const podCurrentStreakMatch = html.match(/\\?"pod_solved_current_streak\\?":\s*(\d+)/);
    const podCountMatch = html.match(/\\?"pod_correct_submissions_count\\?":\s*(\d+)/);

    // Name & designation
    const mentorNameMatch = html.match(/\\?"mentor\\":\{[^}]*?\\"name\\":\\?"([^\\"]+)\\?"/i) ||
                            html.match(/\\?"handle\\":\\?"[^\\"]+\\?",\\s*\\?"name\\":\\?"([^\\"]+)\\?"/i) ||
                            html.match(/\\?"articleCount\\":\{[^}]*?\\"name\\":\\?"([^\\"]+)\\?"/i) ||
                            html.match(/\\?"name\\?":\s*\\?"([^\\"]+)\\?"/);
    const designationMatch = html.match(/\\?"headline\\":\\?"([^\\"]+)\\?"/) ||
                             html.match(/\\?"designation\\":\\?"([^\\"]+)\\?"/);
    const avatarMatch = html.match(/\\?"profile_image_url\\":\\?"([^\\"]+)\\?"/);

    const codingScore = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;
    const totalSolved = totalSolvedMatch ? parseInt(totalSolvedMatch[1], 10) : 0;
    const streak = podStreakMatch ? parseInt(podStreakMatch[1], 10) : 0;
    const currentStreak = podCurrentStreakMatch ? parseInt(podCurrentStreakMatch[1], 10) : 0;

    const resultData: GeeksForGeeksData = {
      username: cleanUsername,
      name: mentorNameMatch ? mentorNameMatch[1] : cleanUsername,
      designation: designationMatch ? designationMatch[1] : undefined,
      userAvatar: avatarMatch ? avatarMatch[1].replace(/\\u0026/g, '&').replace(/\\\//g, '/') : undefined,
      codingScore,
      totalSolved,
      instituteRank: instituteRankMatch ? parseInt(instituteRankMatch[1], 10) : 'N/A',
      streak,
      currentStreak,
      potdSolved: podCountMatch ? parseInt(podCountMatch[1], 10) : 0,
      isOffline: false,
      lastSynced: new Date().toISOString()
    };

    dbInstance.setGeeksForGeeksCache(cleanUsername, resultData);
    dbInstance.updateSettings({ gfgUsername: cleanUsername });

    return resultData;
  } catch (err: any) {
    console.warn('[GeeksforGeeks] Network error:', err.message);
    if (cached) {
      return {
        ...cached.data,
        isOffline: true,
        lastSynced: cached.last_synced,
        errorMessage: `Offline: Using cached stats from ${new Date(cached.last_synced).toLocaleString()}`
      };
    }
    throw new Error(err.message || 'Could not fetch GeeksforGeeks data. Check your internet connection.');
  }
}
