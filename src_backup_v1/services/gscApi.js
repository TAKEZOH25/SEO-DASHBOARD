
// This service will handle direct calls to the Google Search Console API
// We need the access_token from the login flow

const GSC_API_URL = 'https://www.googleapis.com/webmasters/v3';

export const fetchSites = async (accessToken) => {
    try {
        const response = await fetch(`${GSC_API_URL}/sites`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        if (!response.ok) throw new Error('Failed to fetch sites');
        const data = await response.json();
        return data.siteEntry || [];
    } catch (error) {
        console.error("Error fetching sites:", error);
        return [];
    }
};

export const fetchSearchAnalytics = async (accessToken, siteUrl, startDate, endDate) => {
    try {
        const response = await fetch(`${GSC_API_URL}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                startDate,
                endDate,
                dimensions: ['date'],
                rowLimit: 10
            })
        });
        if (!response.ok) throw new Error('Failed to fetch analytics');
        return await response.json();
    } catch (error) {
        console.error("Error fetching analytics:", error);
        return null;
    }
}
