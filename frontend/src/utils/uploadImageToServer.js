import api from "../api";

export async function uploadImageToServer(file) {
  const formData = new FormData();
  formData.append("image", file);

  try {
    const response = await api.post("/upload-image", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data.path; // contoh: "/uploads/1751361907824-161564.png"
  } catch (error) {
    console.error("Gagal upload gambar ke server:", error);
    throw error;
  }
}
