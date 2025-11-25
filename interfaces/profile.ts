import type { Platform } from "./platform";
import { type ObjectType } from "@/interfaces/global";

export interface ProfileAuth {
  username: string;
  email: string;
  name: string;
  is_active: boolean;
  is_superuser: boolean;
  id: number;
}

// -------
export interface ProfileUsername {
  platform: Platform;
  username: string;
}
export interface UserProfile {
  id: number;
  location_id?: null | number;
  parent_id?: null | number;
  user_group_id?: null | number;
  name: string;
  username: string;
  email: string;
  remember_me?: number | boolean;
  expired_date?: string;
  level: string | number;
  country: string;
  credit?: number;
  package_id?: number;
  permissions?: Record<string, string | boolean>;
}
export interface Profile {
  id: number;
  nik?: string | null;
  name: string;
  username?: string | ProfileUsername[] | null;
  email?: string | null;
  country: string;
  phone?: string;
  imei: string;
  imsi: string;
  phoneDuration?: number | null;
  getcontact_checker?: boolean;
  updatedAt: string;
  createdAt: string;
  permissions?: Record<string, string | boolean>;
  found: boolean;
  alternative: {
    provider: string[];
    name: string[];
    tags?: string[];
  };
}
export interface ProfileDetail {
  id: number;
  nik?: string;
  name: string;
  username?: string | ProfileUsername[] | null;
  email: string;
  country: string;
  phone: string;
  imei?: string;
  imsi?: string;
  phoneDuration: number;
  getcontact_checker?: boolean;
  updatedAt: string;
  createdAt: string;
  read_at: string;
  permissions: Record<string, string | boolean>;
}

export type ProfileBody = Pick<
  Profile,
  "nik" | "name" | "email" | "username" | "phoneDuration"
> & {
  getcontactChecker?: boolean;
  phoneNumber: string;
  reason?: string | null;
};

export type FormProfile = Pick<Profile, "nik" | "email" | "phoneDuration"> & {
  id?: number;
  name?: string;
  username: string;
  usernames: ProfileUsername[];
  phoneCode: null;
  phoneNumber?: string;
  getcontactChecker?: boolean;
  reason?: string;
};

export interface ProfileAnalysis {
  id: number;
  nik: string;
  name: string;
  username: string;
  email: string;
  phone: string;
  imei: string;
  imsi: string;
  dob: string;
  possibleInfo?: string | null;
  posibbleAddress?: string | null;
  linksAnalysis?: string | null;
  occupations?: string | null;
  organizations?: string | null;
  industries?: string | null;
  educations?: string | null;
  relationships?: string | null;
  platforms: ProfilePlatform[];
  emails: {
    email: string;
    sites: string[];
    hide?: boolean;
  }[];
  phones: {
    id: string;
    nik: string;
    name: string;
    dob: string;
    email: string;
    phone: string;
    address: string;
    hide?: boolean;
  }[];
  names: {
    id: string;
    nik: string;
    name: string;
    dob: string;
    email: string;
    phone: string;
    address: string;
    hide?: boolean;
  }[];
  usernames: ObjectType[];
  phonesTime?: string | null;
  namesTime?: string | null;
  links: {
    text: string;
    root: {
      nodes: {
        id: string;
        svg: string;
        type: string;
        size: number;
        fontSize: number;
      }[];
      links: {
        source: string;
        target: string;
      }[];
    };
  };
  pending: boolean;
  pendingUsername: boolean;
  pendingEmail: boolean;
  pendingPlatform: boolean;
  circle: {
    root: string;
    nodes: string[];
  };
}

export interface ProfilePlatform {
  avatar: string;
  bio: string;
  bookmarked: boolean;
  email: string;
  engagement: number;
  events: number;
  followers: string;
  followersData: any[];
  followingData: any[];
  followings: string;
  id: string;
  locations: any[];
  mentions: number;
  name: string;
  phone: string;
  platform: Platform;
  platformId: number;
  registeredAt: number;
  registeredAtFormat: string;
  url: string;
  username: string;
  watchId: string;
  watchName: string;
}
