"use client";

import { signInWithGoogle } from "@/app/actions/auth";

export function GoogleButton() {
  return (
    <form action={signInWithGoogle}>
      <button
        type="submit"
        className="flex w-full items-center justify-center gap-3 border-2 border-black bg-white px-5 py-4 font-semibold text-[#111111] shadow-[4px_4px_0_0_#000] transition hover:shadow-[4px_4px_0_0_#F97316] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F97316]"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 48 48"
          className="h-5 w-5"
        >
          <path
            fill="#4285F4"
            d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11c-.5 2.5-1.9 4.6-4 6v5.1h6.5c3.8-3.5 6.1-8.7 6.1-14.8Z"
          />
          <path
            fill="#34A853"
            d="M24 44c5.5 0 10.1-1.8 13.5-4.8L31 34.1c-1.8 1.2-4.1 2-7 2-5.3 0-9.8-3.6-11.4-8.5H5.9v5.3A20 20 0 0 0 24 44Z"
          />
          <path
            fill="#FBBC05"
            d="M12.6 27.6a12 12 0 0 1 0-7.2v-5.3H5.9a20 20 0 0 0 0 17.8l6.7-5.3Z"
          />
          <path
            fill="#EA4335"
            d="M24 11.9c3 0 5.7 1 7.8 3.1l5.8-5.8C34.1 5.9 29.5 4 24 4A20 20 0 0 0 5.9 15.1l6.7 5.3c1.6-4.9 6.1-8.5 11.4-8.5Z"
          />
        </svg>
        Continue with Google
      </button>
    </form>
  );
}
