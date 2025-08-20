export type FunnelStage = "top" | "bottom";

export type FacebookTopEventType = "ad.view" | "page.like" | "comment" | "video.view";
export type FacebookBottomEventType = "ad.click" | "form.submission" | "checkout.complete";
export type FacebookEventType = FacebookTopEventType | FacebookBottomEventType;

export interface FacebookUserLocation {
  country: string;
  city: string;
}

export interface FacebookUser {
  userId: string;
  name: string;
  age: number;
  gender: "male" | "female" | "non-binary";
  location: FacebookUserLocation;
}

export interface FacebookEngagementTop {
  actionTime: string;
  referrer: "newsfeed" | "marketplace" | "groups";
  videoId: string | null;
}

export interface FacebookEngagementBottom {
  adId: string;
  campaignId: string;
  clickPosition: "top_left" | "bottom_right" | "center";
  device: "mobile" | "desktop";
  browser: "Chrome" | "Firefox" | "Safari";
  purchaseAmount: string | null;
}

export type FacebookEngagement = FacebookEngagementTop | FacebookEngagementBottom;

export interface FacebookEvent {
  eventId: string;
  timestamp: string;
  source: "facebook";
  funnelStage: FunnelStage;
  eventType: FacebookEventType;
  data: {
    user: FacebookUser;
    engagement: FacebookEngagement;
  };
}

export type TiktokTopEventType = "video.view" | "like" | "share" | "comment";
export type TiktokBottomEventType = "profile.visit" | "purchase" | "follow";
export type TiktokEventType = TiktokTopEventType | TiktokBottomEventType;

export interface TiktokUser {
  userId: string;
  username: string;
  followers: number;
}

export interface TiktokEngagementTop {
  watchTime: number;
  percentageWatched: number;
  device: "Android" | "iOS" | "Desktop";
  country: string;
  videoId: string;
}

export interface TiktokEngagementBottom {
  actionTime: string;
  profileId: string | null;
  purchasedItem: string | null;
  purchaseAmount: string | null;
}

export type TiktokEngagement = TiktokEngagementTop | TiktokEngagementBottom;

export interface TiktokEvent {
  eventId: string;
  timestamp: string;
  source: "tiktok";
  funnelStage: FunnelStage;
  eventType: TiktokEventType;
  data: {
    user: TiktokUser;
    engagement: TiktokEngagement;
  };
}

export type Event = FacebookEvent | TiktokEvent;

export interface ReportFilters {
  from?: string;
  to?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  source?: "facebook" | "tiktok";
  funnelStage?: FunnelStage;
  eventType?: string;
  campaignId?: string;
}

export interface EventStatistics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsByFunnelStage: Record<string, number>;
  eventsBySource: Record<string, number>;
  eventsByTime: Array<{
    timestamp: string;
    count: number;
  }>;
}

export interface RevenueData {
  totalRevenue: number;
  revenueBySource: Record<string, string>;
  revenueByCampaign: Record<string, string>;
  revenueByTime: Array<{
    timestamp: string;
    amount: string;
  }>;
  transactionCount: number;
}

export interface DemographicsData {
  facebook?: {
    ageDistribution: Record<string, number>;
    genderDistribution: Record<string, number>;
    topLocations: Array<{
      country: string;
      city: string;
      count: number;
    }>;
  };
  tiktok?: {
    followerDistribution: Array<{
      range: string;
      count: number;
    }>;
    topCountries: Array<{
      country: string;
      count: number;
    }>;
  };
}

