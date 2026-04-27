/**
 * Mock data for frontend visual testing.
 * Used when the backend is unreachable.
 *
 * To disable mocking, set USE_MOCK = false in lib/api.js
 */

const NOW = new Date().toISOString();
const YESTERDAY = new Date(Date.now() - 86400000).toISOString();
const TWO_DAYS_AGO = new Date(Date.now() - 2 * 86400000).toISOString();
const FOUR_DAYS_AGO = new Date(Date.now() - 4 * 86400000).toISOString();
const WEEK_AGO = new Date(Date.now() - 7 * 86400000).toISOString();

export const MOCK_USER = {
  name: "Alex Johnson",
  email: "alex.j@gmail.com",
  initials: "AJ",
};

const SCAN_1 = {
  id: "a1b2c3d4-aaaa-bbbb-cccc-111111111111",
  patient_id: "p0000001-0000-0000-0000-000000000001",
  timestamp: YESTERDAY,
  prediction: "Non-Cancer",
  confidence: 0.92,
  risk_level: "Low",
  risk_score: 0.15,
  scan_number: 5,
  recommendation: "No immediate concerns detected. Continue regular oral hygiene and schedule routine check-ups every 6 months.",
  insight_summary: "No concerning signs detected",
  image_path: "a1b2c3d4_scan.jpg",
  heatmap_path: "a1b2c3d4_heatmap.png",
};

const SCAN_2 = {
  id: "b2c3d4e5-aaaa-bbbb-cccc-222222222222",
  patient_id: "p0000001-0000-0000-0000-000000000001",
  timestamp: TWO_DAYS_AGO,
  prediction: "Non-Cancer",
  confidence: 0.87,
  risk_level: "Medium",
  risk_score: 0.50,
  scan_number: 4,
  recommendation: "Some areas may benefit from closer monitoring. Consider scheduling a dental check-up within the next 2 weeks.",
  insight_summary: "Monitor for any changes",
  image_path: "b2c3d4e5_scan.jpg",
  heatmap_path: "b2c3d4e5_heatmap.png",
};

const SCAN_3 = {
  id: "c3d4e5f6-aaaa-bbbb-cccc-333333333333",
  patient_id: "p0000001-0000-0000-0000-000000000001",
  timestamp: FOUR_DAYS_AGO,
  prediction: "Non-Cancer",
  confidence: 0.78,
  risk_level: "Low",
  risk_score: 0.15,
  scan_number: 3,
  recommendation: "Tissue appears healthy. Maintain current oral care routine.",
  insight_summary: "No concerning signs detected",
  image_path: "c3d4e5f6_scan.jpg",
  heatmap_path: "c3d4e5f6_heatmap.png",
};

const SCAN_4 = {
  id: "d4e5f6g7-aaaa-bbbb-cccc-444444444444",
  patient_id: "p0000001-0000-0000-0000-000000000001",
  timestamp: WEEK_AGO,
  prediction: "Cancer",
  confidence: 0.71,
  risk_level: "High",
  risk_score: 0.85,
  scan_number: 2,
  recommendation: "Areas of concern detected. We strongly recommend consulting a dental specialist within the next few days.",
  insight_summary: "Consult a specialist recommended",
  image_path: "d4e5f6g7_scan.jpg",
  heatmap_path: "d4e5f6g7_heatmap.png",
};

const SCAN_5 = {
  id: "e5f6g7h8-aaaa-bbbb-cccc-555555555555",
  patient_id: "p0000001-0000-0000-0000-000000000001",
  timestamp: new Date(Date.now() - 10 * 86400000).toISOString(),
  prediction: "Non-Cancer",
  confidence: 0.89,
  risk_level: "Low",
  risk_score: 0.15,
  scan_number: 1,
  recommendation: "Initial scan looks healthy. Great job taking the first step!",
  insight_summary: "No concerning signs detected",
  image_path: "e5f6g7h8_scan.jpg",
  heatmap_path: "e5f6g7h8_heatmap.png",
};

const ALL_SCANS = [SCAN_1, SCAN_2, SCAN_3, SCAN_4, SCAN_5];

// Placeholder image URLs (gradient placeholders)
const PLACEHOLDER_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23e8f8f3'/%3E%3Cstop offset='100%25' stop-color='%23d4f0e7'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='400' fill='url(%23g)'/%3E%3Ctext x='200' y='200' text-anchor='middle' fill='%2352C9A0' font-size='40' font-family='sans-serif' dy='.35em'%3E🦷%3C/text%3E%3C/svg%3E";
const PLACEHOLDER_HEATMAP = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23fef3c7'/%3E%3Cstop offset='50%25' stop-color='%23fca5a5'/%3E%3Cstop offset='100%25' stop-color='%23ef4444'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='400' fill='url(%23g)'/%3E%3Ctext x='200' y='200' text-anchor='middle' fill='white' font-size='40' font-family='sans-serif' dy='.35em'%3E🔥%3C/text%3E%3C/svg%3E";

export const MOCK_RESPONSES = {
  "/dashboard": {
    user: MOCK_USER,
    latest_scan: {
      ...SCAN_1,
      image_url: PLACEHOLDER_IMG,
      heatmap_url: PLACEHOLDER_HEATMAP,
      insight: "No concerning signs detected",
    },
    recent_scans: ALL_SCANS.slice(0, 5).map((s) => ({
      id: s.id,
      timestamp: s.timestamp,
      risk_score: s.risk_score,
      risk_level: s.risk_level,
      confidence: s.confidence,
    })),
    total_scan_count: 5,
    days_since_last_scan: 1,
    trend: { trend: "Improving", description: "Your oral health is showing improvement. Keep it up!" },
    tip_of_the_day: "Persistent ulcers lasting more than 2 weeks should be evaluated by a dentist or doctor promptly.",
  },

  "/history": {
    scans: ALL_SCANS,
    trend: { trend: "Improving", description: "Your oral health is showing improvement. Keep it up!" },
  },

  "/predict": {
    ...SCAN_1,
    image_url: PLACEHOLDER_IMG,
    heatmap_url: PLACEHOLDER_HEATMAP,
    timestamp: NOW,
  },

  "/nearby-clinics": [
    {
      name: "City Dental Clinic",
      rating: 4.5,
      distance_km: 1.2,
      address: "23 Main Street, Downtown",
      maps_url: "https://maps.google.com/?q=City+Dental+Clinic",
    },
    {
      name: "SmileCare Specialists",
      rating: 4.8,
      distance_km: 2.5,
      address: "15 Health Avenue, Sector 4",
      maps_url: "https://maps.google.com/?q=SmileCare+Specialists",
    },
    {
      name: "Oral Health Center",
      rating: 4.2,
      distance_km: 3.8,
      address: "7 Medical Plaza, Ring Road",
      maps_url: "https://maps.google.com/?q=Oral+Health+Center",
    },
  ],
};

/**
 * Build a mock report response for any scan ID.
 */
export function getMockReport(scanId) {
  const found = ALL_SCANS.find((s) => s.id === scanId);
  if (found) {
    return {
      ...found,
      image_url: PLACEHOLDER_IMG,
      heatmap_url: PLACEHOLDER_HEATMAP,
    };
  }
  // Fallback for unknown IDs (e.g. freshly "predicted" scans)
  return {
    ...SCAN_1,
    id: scanId,
    image_url: PLACEHOLDER_IMG,
    heatmap_url: PLACEHOLDER_HEATMAP,
  };
}
