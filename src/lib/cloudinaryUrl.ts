export function getCloudinaryCloudName() {
  return process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "";
}

export function getOptimizedCloudinaryUrl(
  publicId: string | null | undefined,
  options: { width?: number; height?: number; crop?: string; format?: string } = {},
) {
  if (!publicId) return "";

  const cloudName = getCloudinaryCloudName();
  if (!cloudName) return "";

  const transformation = [
    "f_" + (options.format ?? "auto"),
    "q_auto",
    options.width ? `w_${options.width}` : "",
    options.height ? `h_${options.height}` : "",
    options.crop ? `c_${options.crop}` : "",
  ]
    .filter(Boolean)
    .join(",");

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformation}/${publicId}`;
}
