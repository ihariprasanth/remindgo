import { dbInstance } from './db/database';
import { CodeChefData } from '../src/types';

export async function fetchCodeChefData(username: string, forceRefresh: boolean = false): Promise<CodeChefData> {
  const cleanUsername = username.trim();
  if (!cleanUsername) {
    throw new Error('Please enter a valid CodeChef username.');
  }

  const cached = dbInstance.getCodeChefCache(cleanUsername);

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

    const res = await fetch(`https://www.codechef.com/users/${encodeURIComponent(cleanUsername)}`, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      if (res.status === 429) {
        throw new Error('CodeChef rate limit reached. Please wait a minute before refreshing again.');
      }
      throw new Error(`CodeChef responded with status: ${res.status}`);
    }

    // CodeChef redirects to homepage if username does not exist
    if (res.url.endsWith('codechef.com/') || !res.url.includes('/users/')) {
      throw new Error(`User "${cleanUsername}" was not found on CodeChef. Please check your username.`);
    }

    const html = await res.text();

    // Rating
    const ratingMatch = html.match(/class="rating-number">([^<]+)<\/div>/);
    const rating = ratingMatch ? parseInt(ratingMatch[1].trim(), 10) || ratingMatch[1].trim() : 'Unrated';

    // Stars
    const starsMatch = html.match(/class="rating-star">([\s\S]*?)<\/div>/);
    const starCount = starsMatch ? (starsMatch[1].match(/&#9733;/g) || []).length : 0;
    const stars = starCount > 0 ? `${starCount}★` : 'Unrated';

    // Division
    const divMatch = html.match(/<div>\((Div\s*[1-4])\)<\/div>/i);
    const division = divMatch ? divMatch[1].trim() : undefined;

    // Global & Country Rank
    const globalRankMatch = html.match(/class=['"]global-rank['"][^>]*>([0-9,]+)<\/strong>/i) ||
                           html.match(/<strong>([0-9,]+)<\/strong>\s*<small>Global Rank<\/small>/i);
    const countryRankMatch = html.match(/class=['"]country-rank['"][^>]*>([0-9,]+)<\/strong>/i) ||
                            html.match(/<strong>([0-9,]+)<\/strong>\s*<small>Country Rank<\/small>/i);

    // Name & Avatar
    const nameMatch = html.match(/<h1[^>]*class="[^"]*h2-style[^"]*"[^>]*>([^<]+)<\/h1>/i) ||
                      html.match(/class="m-username--link">([^<]+)<\/span>/i);
    const avatarMatch = html.match(/class=['"]profileImage['"][^>]*src=['"]([^'"]+)['"]/i) ||
                        html.match(/class=['"]user-icon['"][^>]*src=['"]([^'"]+)['"]/i);

    // Problems Solved
    const fullySolvedMatch = html.match(/Fully Solved\s*\(([0-9]+)\)/i) ||
                             html.match(/Total Problems Solved:?\s*([0-9]+)/i);
    const partiallySolvedMatch = html.match(/Partially Solved\s*\(([0-9]+)\)/i);

    const resultData: CodeChefData = {
      username: cleanUsername,
      name: nameMatch ? nameMatch[1].trim() : cleanUsername,
      userAvatar: avatarMatch ? avatarMatch[1] : undefined,
      rating: typeof rating === 'number' ? rating : (parseInt(rating as string, 10) || 0),
      stars,
      division,
      globalRank: globalRankMatch ? globalRankMatch[1].replace(/,/g, '') : 'N/A',
      countryRank: countryRankMatch ? countryRankMatch[1].replace(/,/g, '') : 'N/A',
      fullySolved: fullySolvedMatch ? parseInt(fullySolvedMatch[1], 10) : 0,
      partiallySolved: partiallySolvedMatch ? parseInt(partiallySolvedMatch[1], 10) : 0,
      isOffline: false,
      lastSynced: new Date().toISOString()
    };

    dbInstance.setCodeChefCache(cleanUsername, resultData);
    dbInstance.updateSettings({ codechefUsername: cleanUsername });

    return resultData;
  } catch (err: any) {
    console.warn('[CodeChef] Network error:', err.message);
    if (cached) {
      return {
        ...cached.data,
        isOffline: true,
        lastSynced: cached.last_synced,
        errorMessage: `Offline: Using cached stats from ${new Date(cached.last_synced).toLocaleString()}`
      };
    }
    throw new Error(err.message || 'Could not fetch CodeChef data. Check your internet connection.');
  }
}
