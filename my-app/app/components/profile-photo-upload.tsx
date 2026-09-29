"use client";

import { useState, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

export default function ProfilePhotoUpload() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  async function uploadPhoto(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const file = new FormData(form).get("photo");

    if (!(file instanceof File) || file.size === 0) {
      setMessage("Choose a photo first.");
      return;
    }

    const extensions: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };

    const extension = extensions[file.type];

    if (!extension || file.size > 2 * 1024 * 1024) {
      setMessage("Choose a JPG, PNG, or WebP image no larger than 2 MB.");
      return;
    }

    setUploading(true);
    setMessage("");

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Please sign in again.");
      }

      const path = `${user.id}/${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("photos")
        .upload(path, file, { contentType: file.type });

      if (uploadError) throw uploadError;

      const { error: saveError } = await supabase
        .from("profiles")
        .update({ photo_file_path: path })
        .eq("id", user.id)
        .select("id")
        .single();

      if (saveError) {
        // Remove the new file if its profile update failed.
        await supabase.storage.from("photos").remove([path]);
        throw saveError;
      }

      setMessage("Photo saved.");
      form.reset();
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Photo upload failed."
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <section style={{ marginTop: 32 }}>
      <h2>Profile photo</h2>

      <form onSubmit={uploadPhoto}>
        <label htmlFor="photo">Choose a photo (maximum 2 MB)</label>
        <input
          id="photo"
          name="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          disabled={uploading}
          style={{ display: "block", margin: "12px 0" }}
        />

        <button type="submit" disabled={uploading}>
          {uploading ? "Uploading…" : "Upload photo"}
        </button>
      </form>

      <p role="status">{message}</p>
    </section>
  );
}