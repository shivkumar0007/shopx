export const uploadImageToCloudinary = async (file) => {
  if (!file) {
    throw new Error("Please choose an image first.");
  }

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  const folder = import.meta.env.VITE_CLOUDINARY_FOLDER;

  if (!cloudName || !uploadPreset) {
    throw new Error("Cloudinary config missing. Add the required VITE_CLOUDINARY_* variables.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);
  if (folder) formData.append("folder", folder);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData
  });

  const data = await response.json();
  if (!response.ok || !data?.secure_url) {
    throw new Error(data?.error?.message || "Image upload failed.");
  }

  return data.secure_url;
};
