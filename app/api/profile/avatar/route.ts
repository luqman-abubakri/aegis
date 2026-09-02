import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import cloudinary from "@/lib/cloudinary";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("Missing environment variable: JWT_SECRET");
}

const secret = new TextEncoder().encode(JWT_SECRET);

/**
 * Get authenticated user ID
 */
async function getAuthenticatedUserId() {
  const cookieStore = await cookies();

  const token =
    cookieStore.get("aegis_session")?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(
      token,
      secret
    );

    if (
      typeof payload.userId !== "string"
    ) {
      return null;
    }

    return payload.userId;
  } catch {
    return null;
  }
}

/**
 * POST /api/profile/avatar
 *
 * Uploads a profile picture to Cloudinary.
 */
export async function POST(
  request: Request
) {
  try {
    /**
     * 1. Authenticate
     */
    const userId =
      await getAuthenticatedUserId();

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    /**
     * 2. Read multipart form data
     */
    const formData =
      await request.formData();

    const file =
      formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          message: "No image file provided.",
        },
        { status: 400 }
      );
    }

    /**
     * 3. Validate file type
     */
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (
      !allowedTypes.includes(
        file.type
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please upload a JPG, PNG, or WebP image.",
        },
        { status: 400 }
      );
    }

    /**
     * 4. Validate file size
     *
     * Maximum: 5MB
     */
    const maxSize =
      5 * 1024 * 1024;

    if (file.size > maxSize) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Image must be smaller than 5MB.",
        },
        { status: 400 }
      );
    }

    /**
     * 5. Convert File → Buffer
     */
    const bytes =
      await file.arrayBuffer();

    const buffer =
      Buffer.from(bytes);

    /**
     * 6. Upload to Cloudinary
     */
    const result =
      await new Promise<any>(
        (resolve, reject) => {
          const uploadStream =
            cloudinary.uploader.upload_stream(
              {
                folder: "aegis/avatars",
                public_id: `user-${userId}`,
                overwrite: true,
                resource_type: "image",
                transformation: [
                  {
                    width: 500,
                    height: 500,
                    crop: "fill",
                    gravity: "face",
                  },
                ],
              },
              (
                error,
                result
              ) => {
                if (error) {
                  reject(error);
                } else {
                  resolve(result);
                }
              }
            );

          uploadStream.end(buffer);
        }
      );

    /**
     * 7. Make sure Cloudinary
     * returned a URL
     */
    if (!result?.secure_url) {
      throw new Error(
        "Cloudinary did not return an image URL."
      );
    }

    console.log(
      "[Avatar API] Avatar uploaded:",
      {
        userId,
        publicId:
          result.public_id,
      }
    );

    /**
     * 8. Return URL
     */
    return NextResponse.json({
      success: true,
      message:
        "Avatar uploaded successfully.",
      avatarUrl:
        result.secure_url,
    });
  } catch (error) {
    console.error(
      "[Avatar API] Upload error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to upload profile picture.",
      },
      { status: 500 }
    );
  }
}