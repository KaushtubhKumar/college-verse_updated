export type CollegeType = "PUBLIC" | "PRIVATE" | "DEEMED";
export type CourseLevel = "UG" | "PG" | "PHD" | "DIPLOMA";
export type SortOption = "rating" | "feesMin" | "feesMax" | "nirfRank" | "name";

export interface Course {
  id: string;
  name: string;
  duration: number;
  fees: number;
  seats: number | null;
  level: CourseLevel;
}

export interface Placement {
  id: string;
  avgPackage: number;
  highestPackage: number;
  placementRate: number;
  topRecruiters: string;
  year: number;
}

export interface College {
  id: string;
  name: string;
  slug: string;
  location: string;
  state: string;
  type: CollegeType;
  feesMin: number;
  feesMax: number;
  rating: number;
  totalRatings: number;
  naacGrade: string | null;
  nirfRank: number | null;
  established: number | null;
  overview: string;
  imageUrl: string | null;
  courses?: Course[];
  placement?: Placement | null;
  isSaved?: boolean;
}

export interface CollegeListResponse {
  colleges: College[];
  total: number;
  page: number;
  totalPages: number;
}

export interface CollegeFilters {
  q?: string;
  state?: string;
  type?: CollegeType;
  feesMax?: number;
  sort?: SortOption;
  page?: number;
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
    };
  }
}
