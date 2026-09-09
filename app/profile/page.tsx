"use client";

import { useEffect, useRef, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthProvider";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import {
  User,
  Mail,
  Calendar,
  Award,
  BarChart3,
  ArrowLeft,
  Trophy,
  Pencil,
  Camera,
  X,
  Check,
  Loader2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { fetchCached, getCached, setCached } from "@/lib/clientCache";

interface ProfileRecord {
  id: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string;
  createdAt: string;
  updatedAt: string;
}

interface InterviewRecord {
  id: string;
  role: string;
  difficulty: string;
  interviewType: string;
  status: string;
  score: number | null;
  durationSeconds: number;
  createdAt: string;
  completedAt: string | null;
}

interface FeedbackRecord {
  id: string;
  interviewId: string;
  overallScore: number | null;
  createdAt: string;
}

interface ProfileApiResponse {
  success: boolean;
  message?: string;
  profile?: ProfileRecord;
  interviews?: InterviewRecord[];
  feedbackRecords?: FeedbackRecord[];
}

interface AvatarApiResponse {
  success: boolean;
  message?: string;
  avatarUrl?: string;
}

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const profileCacheKey = user ? `profile:${user.id}` : "";
  const cachedProfile = getCached<ProfileApiResponse>(profileCacheKey);

  const [profile, setProfile] =
    useState<ProfileRecord | null>(cachedProfile?.profile ?? null);

  const [interviews, setInterviews] = useState<
    InterviewRecord[]
  >(cachedProfile?.interviews ?? []);

  const [feedbackRecords, setFeedbackRecords] =
    useState<FeedbackRecord[]>(cachedProfile?.feedbackRecords ?? []);

  // Edit profile state
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(
    cachedProfile?.profile?.fullName || ""
  );

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [previewUrl, setPreviewUrl] =
    useState<string | null>(null);

  const [savingProfile, setSavingProfile] =
    useState(false);

  const [profileError, setProfileError] =
    useState("");

  const [profileSuccess, setProfileSuccess] =
    useState("");

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  /**
   * ==========================================
   * FETCH PROFILE DATA
   * ==========================================
   *
   * Everything comes from MongoDB through:
   *
   * GET /api/profile
   */
  useEffect(() => {
    async function fetchProfileData() {
      if (!user) return;

      console.log(
        "[Profile] Fetching MongoDB profile data..."
      );

      try {
        const data = await fetchCached<ProfileApiResponse>(
          profileCacheKey,
          async () => {
            const response = await fetch("/api/profile", {
              method: "GET",
              credentials: "include",
              cache: "no-store",
            });

            const payload: ProfileApiResponse = await response.json();

            if (!response.ok || !payload.success) {
              throw new Error(
                payload.message || "Failed to load profile."
              );
            }

            return payload;
          }
        );

        console.log(
          "[Profile] API response:",
          data
        );

        if (data.profile) {
          setProfile(data.profile);

          setFullName(
            data.profile.fullName || ""
          );
        }

        setInterviews(
          data.interviews || []
        );

        setFeedbackRecords(
          data.feedbackRecords || []
        );
      } catch (error) {
        console.error(
          "[Profile] Failed to load profile:",
          error
        );

        setProfileError(
          error instanceof Error
            ? error.message
            : "Failed to load profile."
        );
      }
    }

    if (user && !authLoading) {
      fetchProfileData();
    }
  }, [user, authLoading, profileCacheKey]);

  /**
   * ==========================================
   * OPEN EDIT PROFILE
   * ==========================================
   */
  const handleEditProfile = () => {
    setProfileError("");
    setProfileSuccess("");

    // MongoDB profile is the source of truth.
    setFullName(
      profile?.fullName || ""
    );

    setSelectedFile(null);

    setPreviewUrl(
      profile?.avatarUrl || null
    );

    setIsEditing(true);
  };

  /**
   * ==========================================
   * CANCEL EDIT
   * ==========================================
   */
  const handleCancelEdit = () => {
    if (
      previewUrl &&
      selectedFile
    ) {
      URL.revokeObjectURL(
        previewUrl
      );
    }

    setSelectedFile(null);

    setPreviewUrl(
      profile?.avatarUrl || null
    );

    setFullName(
      profile?.fullName || ""
    );

    setProfileError("");
    setProfileSuccess("");

    setIsEditing(false);
  };

  /**
   * ==========================================
   * HANDLE IMAGE SELECTION
   * ==========================================
   */
  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) return;

    setProfileError("");
    setProfileSuccess("");

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/jpg",
    ];

    if (
      !allowedTypes.includes(
        file.type
      )
    ) {
      setProfileError(
        "Please select a JPG, PNG, or WebP image."
      );

      event.target.value = "";

      return;
    }

    const maxSize =
      5 * 1024 * 1024;

    if (file.size > maxSize) {
      setProfileError(
        "Image must be smaller than 5MB."
      );

      event.target.value = "";

      return;
    }

    if (
      previewUrl &&
      selectedFile
    ) {
      URL.revokeObjectURL(
        previewUrl
      );
    }

    const objectUrl =
      URL.createObjectURL(file);

    setSelectedFile(file);
    setPreviewUrl(objectUrl);
  };

  /**
   * ==========================================
   * UPLOAD AVATAR
   * ==========================================
   *
   * Avatar upload flow:
   *
   * Profile Page
   *      ↓
   * POST /api/profile/avatar
   *      ↓
   * JWT authentication
   *      ↓
   * Cloudinary
   *      ↓
   * secure_url
   *
   */
  const uploadAvatar = async (
    file: File
  ): Promise<string> => {
    if (!user) {
      throw new Error(
        "You must be signed in to upload a profile picture."
      );
    }

    const formData = new FormData();

    formData.append(
      "file",
      file
    );

    console.log(
      "[Profile] Uploading avatar through AEGIS API..."
    );

    const response = await fetch(
      "/api/profile/avatar",
      {
        method: "POST",
        credentials: "include",
        body: formData,
      }
    );

    const responseText =
      await response.text();

    let data: AvatarApiResponse | null =
      null;

    if (responseText.trim()) {
      try {
        data =
          JSON.parse(responseText);
      } catch (parseError) {
        console.error(
          "[Profile] Failed to parse avatar API response:",
          parseError
        );

        throw new Error(
          "The server returned an invalid avatar upload response."
        );
      }
    }

    console.log(
      "[Profile] Avatar upload response:",
      {
        status: response.status,
        statusText:
          response.statusText,
        data,
      }
    );

    if (!response.ok) {
      throw new Error(
        data?.message ||
          `Failed to upload profile picture. Server returned ${response.status}.`
      );
    }

    if (!data?.success) {
      throw new Error(
        data?.message ||
          "Profile picture upload was not confirmed by the server."
      );
    }

    if (!data.avatarUrl) {
      throw new Error(
        "Avatar upload succeeded but no image URL was returned."
      );
    }

    console.log(
      "[Profile] Avatar uploaded successfully:",
      data.avatarUrl
    );

    return data.avatarUrl;
  };

  /**
   * ==========================================
   * SAVE PROFILE
   * ==========================================
   *
   * Sends profile information to MongoDB through:
   *
   * PATCH /api/profile
   *
   * Avatar is uploaded to Cloudinary first.
   */
  const handleSaveProfile = async () => {
    if (!user) return;

    setProfileError("");
    setProfileSuccess("");

    const trimmedName =
      fullName.trim();

    if (!trimmedName) {
      setProfileError(
        "Please enter your full name."
      );

      return;
    }

    if (trimmedName.length < 2) {
      setProfileError(
        "Your name must be at least 2 characters."
      );

      return;
    }

    if (trimmedName.length > 100) {
      setProfileError(
        "Your name must be less than 100 characters."
      );

      return;
    }

    setSavingProfile(true);

    try {
      let avatarUrl =
        profile?.avatarUrl || "";

      /**
       * Upload image to Cloudinary
       * if a new profile picture was selected.
       */
      if (selectedFile) {
        avatarUrl =
          await uploadAvatar(
            selectedFile
          );
      }

      console.log(
        "[Profile] Updating MongoDB profile:",
        {
          fullName: trimmedName,
          hasAvatar:
            Boolean(avatarUrl),
        }
      );

      /**
       * Update MongoDB through API.
       */
      const response =
        await fetch(
          "/api/profile",
          {
            method: "PATCH",
            credentials: "include",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              fullName:
                trimmedName,
              avatarUrl,
            }),
          }
        );

      /**
       * Read response as text first.
       *
       * This prevents:
       * "Unexpected end of JSON input"
       */
      const responseText =
        await response.text();

      let data:
        | ProfileApiResponse
        | null = null;

      if (responseText.trim()) {
        try {
          data =
            JSON.parse(
              responseText
            );
        } catch (parseError) {
          console.error(
            "[Profile] Failed to parse API response:",
            parseError
          );

          throw new Error(
            "The server returned an invalid response."
          );
        }
      }

      console.log(
        "[Profile] Update response:",
        {
          status:
            response.status,
          statusText:
            response.statusText,
          data,
        }
      );

      if (!response.ok) {
        throw new Error(
          data?.message ||
            `Failed to update profile. Server returned ${response.status}.`
        );
      }

      if (!data?.success) {
        throw new Error(
          data?.message ||
            "Profile update was not confirmed by the server."
        );
      }

      /**
       * Update local profile
       * from API response.
       */
      if (data.profile) {
        const cachedData = getCached<ProfileApiResponse>(profileCacheKey);
        setCached(profileCacheKey, {
          ...cachedData,
          success: true,
          profile: data.profile,
        });
        setProfile(
          data.profile
        );

        setFullName(
          data.profile.fullName ||
            ""
        );

        setPreviewUrl(
          data.profile.avatarUrl ||
            null
        );
      }

      setSelectedFile(null);

      setProfileSuccess(
        "Profile updated successfully!"
      );

      /**
       * MongoDB is now the source of truth.
       *
       */
      setTimeout(() => {
        setIsEditing(false);
        setProfileSuccess("");
      }, 1200);
    } catch (error) {
      console.error(
        "[Profile] Save profile error:",
        error
      );

      setProfileError(
        error instanceof Error
          ? error.message
          : "Something went wrong while updating your profile."
      );
    } finally {
      setSavingProfile(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF9F6]">
        <LoadingSpinner
          size="lg"
          text="Loading profile..."
        />
      </div>
    );
  }

  /**
   * ==========================================
   * USER INFORMATION
   * ==========================================
   *
   * MongoDB profile is the source of truth.
   *
   * Do NOT use:
   * user.user_metadata
   * user.created_at
   */
  const name =
    profile?.fullName ||
    "Intervyou.ai User";

  const email =
    profile?.email ||
    "";

  const createdAt =
    profile?.createdAt ||
    null;

  const formattedCreatedAt =
    createdAt
      ? new Date(
          createdAt
        ).toLocaleDateString(
          undefined,
          {
            year: "numeric",
            month: "long",
            day: "numeric",
          }
        )
      : "N/A";

  const avatarUrl =
    profile?.avatarUrl ||
    null;

  /**
   * ==========================================
   * INTERVIEW STATISTICS
   * ==========================================
   */
  const totalInterviews =
    interviews.length;

  const scoredFeedback =
    feedbackRecords.filter(
      (feedback) =>
        typeof feedback.overallScore ===
        "number"
    );

  const avgScore =
    scoredFeedback.length > 0
      ? Math.round(
          scoredFeedback.reduce(
            (
              total,
              feedback
            ) =>
              total +
              (feedback.overallScore ??
                0),
            0
          ) /
            scoredFeedback.length
        )
      : null;

  const highScore =
    scoredFeedback.length > 0
      ? Math.max(
          ...scoredFeedback.map(
            (feedback) =>
              feedback.overallScore ??
              0
          )
        )
      : null;

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[#FAF9F6] pt-28 pb-20 text-[#111111]">
        <div className="mx-auto max-w-5xl px-5 sm:px-6 lg:px-8">

          {/* BACK */}
          <Link
            href="/dashboard"
            className="mb-8 inline-flex items-center gap-2 text-sm text-[#666666] transition-colors hover:text-[#111111]"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>

          {/* PROFILE HEADER */}
          <div className="mb-10 border border-[#D9D9D4] bg-white p-8 hard-card">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">

              {/* Avatar */}
              <div className="flex flex-col items-center gap-3 sm:items-start">
                <div className="relative">

                  <div className="flex h-24 w-24 flex-shrink-0 overflow-hidden border border-[#D9D9D4] bg-[#F97316] text-white">

                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={`${name}'s profile`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <User size={48} />
                      </div>
                    )}

                  </div>

                  <button
                    type="button"
                    onClick={
                      handleEditProfile
                    }
                    aria-label="Edit profile picture"
                    className="hard-edge absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center border-2 border-white bg-[#F97316] text-white hover:bg-[#EA580C]"
                  >
                    <Camera size={16} />
                  </button>

                </div>
              </div>

              {/* Profile details */}
              <div className="flex-1 text-center sm:text-left">

                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                  <div>
                    <h1 className="text-3xl font-bold">
                      {name}
                    </h1>

                    <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-sm text-[#666666] sm:justify-start">

                      <div className="flex items-center gap-2">
                        <Mail
                          size={16}
                          className="text-[#F97316]"
                        />

                        <span className="break-all">
                          {email}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Calendar
                          size={16}
                          className="text-[#A855F7]"
                        />

                        <span>
                          Member since{" "}
                          {
                            formattedCreatedAt
                          }
                        </span>
                      </div>

                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={
                      handleEditProfile
                    }
                    className="hard-edge mx-auto inline-flex items-center justify-center gap-2 border border-[#111111] bg-[#F1F1EE] px-5 py-3 text-sm font-semibold text-[#111111] hover:bg-[#EEECE7] sm:mx-0"
                  >
                    <Pencil size={16} />
                    Edit Profile
                  </button>

                </div>

              </div>
            </div>
          </div>

          {/* EDIT PROFILE MODAL */}
          {isEditing && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">

              <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto border border-[#D9D9D4] bg-white p-6 hard-card sm:p-8">

                {/* Modal header */}
                <div className="mb-8 flex items-center justify-between">

                  <div>
                    <h2 className="text-2xl font-bold">
                      Edit Profile
                    </h2>

                    <p className="mt-1 text-sm text-[#666666]">
                      Update your personal information.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={
                      handleCancelEdit
                    }
                    disabled={
                      savingProfile
                    }
                    className="flex h-10 w-10 items-center justify-center text-[#888888] transition-colors hover:bg-[#F1F1EE] hover:text-[#111111] disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Close"
                  >
                    <X size={20} />
                  </button>

                </div>

                {/* Avatar editor */}
                <div className="mb-8 flex flex-col items-center">

                  <div className="relative">

                    <div className="flex h-32 w-32 overflow-hidden border border-[#D9D9D4] bg-[#F97316]">

                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt="Profile preview"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-white">
                          <User size={56} />
                        </div>
                      )}

                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        fileInputRef.current?.click()
                      }
                      disabled={
                        savingProfile
                      }
                      className="hard-edge absolute -bottom-2 -right-2 flex h-11 w-11 items-center justify-center border-4 border-white bg-[#F97316] text-white hover:bg-[#EA580C] disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Upload profile picture"
                    >
                      <Camera size={18} />
                    </button>

                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                    disabled={
                      savingProfile
                    }
                    className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#F97316] transition-colors hover:text-[#EA580C] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Upload size={15} />
                    Change photo
                  </button>

                  <p className="mt-2 text-center text-xs text-[#888888]">
                    JPG, PNG, or WebP · Maximum 5MB
                  </p>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    onChange={
                      handleFileChange
                    }
                    className="hidden"
                  />

                </div>

                {/* Error */}
                {profileError && (
                  <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    {profileError}
                  </div>
                )}

                {/* Success */}
                {profileSuccess && (
                  <div className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
                    <Check size={16} />
                    {profileSuccess}
                  </div>
                )}

                {/* Full name */}
                <div className="mb-6">

                  <label
                    htmlFor="fullName"
                    className="mb-2 block text-sm font-medium text-[#111111]"
                  >
                    Full Name
                  </label>

                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(event) =>
                      setFullName(
                        event.target.value
                      )
                    }
                    placeholder="Enter your full name"
                    maxLength={100}
                    disabled={
                      savingProfile
                    }
                    className="w-full border border-[#D9D9D4] bg-[#F1F1EE] px-4 py-3 text-[#111111] outline-none transition-all placeholder:text-[#888888] focus:border-[#F97316] disabled:cursor-not-allowed disabled:opacity-60"
                  />

                  <p className="mt-2 text-xs text-[#888888]">
                    {fullName.length}/100
                    characters
                  </p>

                </div>

                {/* Email */}
                <div className="mb-8">

                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-medium text-[#111111]"
                  >
                    Email
                  </label>

                  <div className="relative">

                    <Mail
                      size={17}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-[#888888]"
                    />

                    <input
                      id="email"
                      type="email"
                      value={email}
                      disabled
                      className="w-full cursor-not-allowed border border-[#D9D9D4] bg-[#F1F1EE] py-3 pl-11 pr-16 text-[#888888]"
                    />

                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#888888]">
                      Locked
                    </span>

                  </div>

                  <p className="mt-2 text-xs text-[#888888]">
                    Your email is managed by your Intervyou.ai account.
                  </p>

                </div>

                {/* Buttons */}
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

                  <button
                    type="button"
                    onClick={
                      handleCancelEdit
                    }
                    disabled={
                      savingProfile
                    }
                    className="hard-edge border border-[#111111] px-5 py-3 text-sm font-semibold text-[#111111] transition-colors hover:bg-[#F1F1EE] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={
                      handleSaveProfile
                    }
                    disabled={
                      savingProfile
                    }
                    className="hard-edge inline-flex items-center justify-center gap-2 bg-[#F97316] px-6 py-3 text-sm font-semibold text-white hover:bg-[#EA580C] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingProfile ? (
                      <>
                        <Loader2
                          size={17}
                          className="animate-spin"
                        />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check size={17} />
                        Save Changes
                      </>
                    )}
                  </button>

                </div>

              </div>
            </div>
          )}

          {/* STATS */}
          <div className="mb-10 grid gap-6 sm:grid-cols-3">

            {/* Total interviews */}
            <div className="border border-[#D9D9D4] bg-white p-6 hard-card">

              <div className="mb-4 flex h-12 w-12 items-center justify-center bg-orange-50 text-[#F97316]">
                <BarChart3 size={24} />
              </div>

              <p className="text-3xl font-bold">
                {totalInterviews}
              </p>

              <p className="mt-1 text-sm text-[#666666]">
                Interviews Completed
              </p>

            </div>

            {/* Average score */}
            <div className="border border-[#D9D9D4] bg-white p-6 hard-card">

              <div className="mb-4 flex h-12 w-12 items-center justify-center bg-orange-50 text-[#F97316]">
                <Award size={24} />
              </div>

              <p className="text-3xl font-bold">
                {avgScore !== null
                  ? `${avgScore}%`
                  : "—"}
              </p>

              <p className="mt-1 text-sm text-[#666666]">
                Average Score
              </p>

            </div>

            {/* Highest score */}
            <div className="border border-[#D9D9D4] bg-white p-6 hard-card">

              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                <Trophy size={24} />
              </div>

              <p className="text-3xl font-bold">
                {highScore !== null
                  ? `${highScore}%`
                  : "—"}
              </p>

              <p className="mt-1 text-sm text-[#666666]">
                Highest Score
              </p>

            </div>

          </div>

          {/* RECENT INTERVIEWS */}
          <div className="border border-[#D9D9D4] bg-[#F1F1EE] p-8 hard-card">

            <h2 className="mb-6 text-xl font-bold">
              Recent Interviews
            </h2>

            {interviews.length === 0 ? (
              <div className="py-12 text-center text-[#666666]">

                <p>
                  No interviews completed yet.
                </p>

                <Link
                  href="/interview"
                  className="hard-edge mt-4 inline-flex items-center gap-2 bg-[#F97316] px-6 py-3 font-semibold text-white hover:bg-[#EA580C]"
                >
                  Start Practice Interview
                </Link>

              </div>
            ) : (
              <div className="space-y-4">

                {interviews.map(
                  (item) => (
                    <div
                      key={item.id}
                      className="flex flex-col justify-between gap-4 border border-[#D9D9D4] bg-[#F1F1EE] p-5 sm:flex-row sm:items-center"
                    >

                      <div className="min-w-0">

                        <div className="flex flex-wrap items-center gap-3">

                          <span className="text-lg font-semibold text-white">
                            {item.role}
                          </span>

                          <span className="bg-[#EEECE7] px-3 py-1 text-xs capitalize text-[#666666]">
                            {
                              item.interviewType
                            }
                          </span>

                          <span className="bg-orange-50 px-3 py-1 text-xs capitalize text-[#F97316]">
                            {
                              item.difficulty
                            }
                          </span>

                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-[#666666]">

                          <span>
                            Completed on{" "}
                            {new Date(
                              item.completedAt ||
                                item.createdAt
                            ).toLocaleDateString(
                              undefined,
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              }
                            )}
                          </span>

                          {item.durationSeconds >
                            0 ? (
                            <span>
                              {Math.round(
                                item.durationSeconds /
                                  60
                              )}{" "}
                              min
                            </span>
                          ) : null}

                        </div>

                      </div>

                      <div className="flex items-center gap-4">

                        {typeof item.score ===
                          "number" && (
                          <div
                            className={`rounded-xl px-4 py-2 text-sm font-bold ${
                              item.score >=
                              80
                                ? "border border-green-500/30 bg-green-500/10 text-green-400"
                                : item.score >=
                                  60
                                ? "border border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
                                : "border border-red-500/30 bg-red-500/10 text-red-400"
                            }`}
                          >
                            Score:{" "}
                            {item.score}
                            /100
                          </div>
                        )}

                      </div>

                    </div>
                  )
                )}

              </div>
            )}

          </div>

        </div>
      </main>
    </ProtectedRoute>
  );
}