
import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
    withCredentials: true
});

// ========================================
// API ERROR HANDLER
// ========================================

async function getApiErrorMessage(error) {
    const responseData = error?.response?.data;

    if (responseData instanceof Blob) {
        try {
            const text = await responseData.text();
            const data = JSON.parse(text);

            return data.message || "Something went wrong.";
        } catch {
            return "Unable to process server error response.";
        }
    }

    return (
        responseData?.message ||
        error?.message ||
        "Something went wrong."
    );
}

// ========================================
// GENERATE INTERVIEW REPORT
// ========================================

export const generateInterviewReport = async ({
    jobDescription,
    selfDescription,
    resumeFile
}) => {
    const formData = new FormData();

    formData.append("jobDescription", jobDescription);
    formData.append("selfDescription", selfDescription);
    formData.append("resume", resumeFile);

    try {
        const response = await api.post(
            "/api/interview/",
            formData
        );

        return response.data;

    } catch (error) {
        console.error(
            "Generate Interview Report API Error:",
            await getApiErrorMessage(error)
        );

        throw error;
    }
};

// ========================================
// GET INTERVIEW REPORT BY ID
// ========================================

export const getInterviewReportById = async (interviewId) => {
    const response = await api.get(
        `/api/interview/report/${interviewId}`
    );

    return response.data;
};

// ========================================
// GET ALL INTERVIEW REPORTS
// ========================================

export const getAllInterviewReports = async () => {
    const response = await api.get("/api/interview/");

    return response.data;
};

// ========================================
// GENERATE RESUME PDF
// ========================================

export const generateResumePdf = async ({
    interviewReportId
}) => {
    try {
        const response = await api.post(
            `/api/interview/resume/pdf/${interviewReportId}`,
            null,
            {
                responseType: "blob"
            }
        );

        return response.data;

    } catch (error) {
        const message = await getApiErrorMessage(error);

        console.error("Resume PDF API Error:", {
            status: error.response?.status,
            message
        });

        const apiError = new Error(message);

        apiError.status = error.response?.status;
        apiError.cause = error;

        throw apiError;
    }
};

// ========================================
// DELETE INTERVIEW REPORT
// ========================================

export const deleteInterviewReport = async (interviewId) => {
    const response = await api.delete(
        `/api/interview/report/${interviewId}`
    );

    return response.data;
};

export default api;
